import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { ControlLoop } from '../control/ControlLoop';
import type { CarConfig, Telemetry } from '../protocol/packet';
import { BleTransport } from '../transport/BleTransport';
import type { Transport } from '../transport/Transport';

// Một xe / một kết nối cho toàn app.
const transport: Transport = new BleTransport();
const controlLoop = new ControlLoop(transport);
const sendTest = (wheel: number | null, speed: number) => transport.sendTest(wheel, speed);
/** Các lần ghi CONFIG chạy lần lượt (Web Bluetooth không cho 2 thao tác cùng lúc trên 1 characteristic). */
let saveQueue: Promise<unknown> = Promise.resolve();

export function useCar() {
  const status = useSyncExternalStore(
    (cb) => transport.onStatusChange(cb),
    () => transport.getStatus(),
  );

  const [telemetry, setTelemetry] = useState<Telemetry | null>(null);

  useEffect(() => {
    controlLoop.start();
    const off = transport.onTelemetry(setTelemetry);
    return () => {
      off();
      controlLoop.stop();
    };
  }, []);

  useEffect(() => {
    if (status.state !== 'connected') controlLoop.resetInput();
    if (status.state === 'disconnected') setTelemetry(null);
  }, [status.state]);

  // Vừa kết nối -> đọc ô CONFIG của xe (để biết cấu hình trên web đã lưu xuống xe chưa).
  const [carConfig, setCarConfig] = useState<CarConfig | null>(null);
  const [caps, setCaps] = useState({ config: false, test: false });
  useEffect(() => {
    setCarConfig(null);
    if (status.state !== 'connected') {
      setCaps({ config: false, test: false });
      return;
    }
    let alive = true;
    setCaps({ config: transport.hasConfig(), test: transport.hasTest() });
    void transport.readConfig().then((c) => alive && setCarConfig(c));
    return () => {
      alive = false;
    };
  }, [status.state]);

  /** Ghi CONFIG rồi đọc lại để xác nhận. Trả về cấu hình xe đang dùng (null nếu không đọc được). */
  const saveConfig = useCallback((config: CarConfig) => {
    const run = saveQueue.then(async () => {
      await transport.writeConfig(config);
      // Xe xử lý CONFIG trong loop() rồi mới cập nhật giá trị đọc được -> đợi một chút.
      await new Promise((r) => setTimeout(r, 300));
      const back = await transport.readConfig();
      setCarConfig(back);
      return back;
    });
    saveQueue = run.catch(() => undefined);
    return run;
  }, []);

  return {
    status,
    telemetry,
    connect: () => transport.connect(),
    requestDevice: () => transport.requestDevice(),
    connectSelected: () => transport.connectSelected(),
    disconnect: () => transport.disconnect(),
    controlLoop,
    carConfig,
    configSupported: caps.config,
    testSupported: caps.test,
    saveConfig,
    sendTest,
  };
}
