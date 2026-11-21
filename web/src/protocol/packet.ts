import { CONTROL_PACKET_LEN, TELEMETRY_PACKET_LEN, TelemetryStatus } from './constants';

export interface ControlInput {
  /** -100..100: âm = lùi, dương = tiến */
  throttle: number;
  /** -100..100: âm = trái, dương = phải */
  steering: number;
  /** bitmask ButtonBit: nút đang giữ (bit 0..5) */
  flags: number;
}

export interface Telemetry {
  batteryMv: number;
  failsafe: boolean;
  lastSeq: number;
  status: number;
}

export const NEUTRAL_INPUT: ControlInput = { throttle: 0, steering: 0, flags: 0 };

function clampAxis(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.max(-100, Math.min(100, Math.round(v)));
}

export function encodeControl(seq: number, input: ControlInput): Uint8Array<ArrayBuffer> {
  const buf = new Uint8Array(new ArrayBuffer(CONTROL_PACKET_LEN));
  const view = new DataView(buf.buffer);
  view.setUint8(0, seq & 0xff);
  view.setInt8(1, clampAxis(input.throttle));
  view.setInt8(2, clampAxis(input.steering));
  view.setUint8(3, input.flags & 0xff);
  return buf;
}

export function decodeTelemetry(view: DataView): Telemetry | null {
  if (view.byteLength < TELEMETRY_PACKET_LEN) return null;
  const status = view.getUint8(2);
  return {
    batteryMv: view.getUint16(0, true),
    status,
    failsafe: (status & TelemetryStatus.Failsafe) !== 0,
    lastSeq: view.getUint8(3),
  };
}
