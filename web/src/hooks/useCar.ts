import { useEffect, useState, useSyncExternalStore } from 'react';
import { ControlLoop } from '../control/ControlLoop';
import type { Telemetry } from '../protocol/packet';
import { BleTransport } from '../transport/BleTransport';
import type { Transport } from '../transport/Transport';

// Một xe / một kết nối cho toàn app.
const transport: Transport = new BleTransport();
const controlLoop = new ControlLoop(transport);

export function useCar() {
  const status = useSyncExternalStore(
    (cb) => transport.onStatusChange(cb),
    () => transport.getStatus(),
  );
  const [telemetry, setTelemetry] = useState<Telemetry | null>(null);
  const [telemetryAt, setTelemetryAt] = useState<number | null>(null);

  useEffect(() => {
    controlLoop.start();
    const off = transport.onTelemetry((t) => {
      setTelemetry(t);
      setTelemetryAt(Date.now());
    });
    return () => {
      off();
      controlLoop.stop();
    };
  }, []);

  useEffect(() => {
    if (status.state !== 'connected') controlLoop.resetInput();
    if (status.state === 'disconnected') setTelemetry(null);
  }, [status.state]);

  return {
    status,
    telemetry,
    telemetryAt,
    connect: () => transport.connect(),
    disconnect: () => transport.disconnect(),
    controlLoop,
  };
}
