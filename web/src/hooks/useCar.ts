import { useEffect, useSyncExternalStore } from 'react';
import { ControlLoop } from '../control/ControlLoop';
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

  useEffect(() => {
    controlLoop.start();
    return () => controlLoop.stop();
  }, []);

  useEffect(() => {
    if (status.state !== 'connected') controlLoop.resetInput();
  }, [status.state]);

  return {
    status,
    connect: () => transport.connect(),
    disconnect: () => transport.disconnect(),
    controlLoop,
  };
}
