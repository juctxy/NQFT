import { CONTROL_INTERVAL_MS } from '../protocol/constants';
import { encodeControl, NEUTRAL_INPUT, type ControlInput } from '../protocol/packet';
import type { Transport } from '../transport/Transport';

/** Đi một bước từ `from` về phía `to`, mỗi bước tối đa `step`. */
export function rampToward(from: number, to: number, step: number): number {
  if (Math.abs(to - from) <= step) return to;
  return from + Math.sign(to - from) * step;
}

/**
 * Gửi lệnh điều khiển liên tục 30 Hz khi đã kết nối (kiêm heartbeat cho failsafe).
 * Input được ghi vào qua setInput() từ bất kỳ nguồn nào (nút hướng, joystick, gamepad...)
 * mà không gây re-render React.
 *
 * Tăng tốc mềm: x, y gửi đi không nhảy ngay tới giá trị joystick mà tăng/giảm dần,
 * đi hết 0 -> 100 trong `softAccelMs` (0 = tắt). Nút bấm (flags) luôn gửi ngay.
 */
export class ControlLoop {
  private input: ControlInput = { ...NEUTRAL_INPUT };
  /** x, y đang gửi (đã làm mềm). */
  private sent = { x: 0, y: 0 };
  private softAccelMs = 0;
  private lastTick = 0;
  private seq = 0;
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly transport: Transport) {}

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(this.tick, CONTROL_INTERVAL_MS);
    document.addEventListener('visibilitychange', this.handleVisibility);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    document.removeEventListener('visibilitychange', this.handleVisibility);
  }

  setInput(patch: Partial<ControlInput>): void {
    this.input = { ...this.input, ...patch };
  }

  /** Dừng ngay: cả lệnh đích lẫn giá trị đang gửi về 0 (không làm mềm). */
  resetInput(): void {
    this.input = { ...NEUTRAL_INPUT };
    this.sent = { x: 0, y: 0 };
  }

  setSoftAccel(ms: number): void {
    this.softAccelMs = Math.max(0, ms);
  }

  /** Tính x, y sẽ gửi ở nhịp này (public để test). */
  nextOutput(now: number): ControlInput {
    const dt = this.lastTick ? Math.min(now - this.lastTick, 200) : CONTROL_INTERVAL_MS;
    this.lastTick = now;
    const step = this.softAccelMs > 0 ? (100 * dt) / this.softAccelMs : Infinity;
    this.sent = {
      x: rampToward(this.sent.x, this.input.x, step),
      y: rampToward(this.sent.y, this.input.y, step),
    };
    return { ...this.input, x: this.sent.x, y: this.sent.y };
  }

  private tick = (): void => {
    if (this.transport.getStatus().state !== 'connected') {
      this.sent = { x: 0, y: 0 };
      this.lastTick = 0;
      return;
    }
    const nextSeq = (this.seq + 1) & 0xff;
    if (this.transport.send(encodeControl(nextSeq, this.nextOutput(Date.now())))) this.seq = nextSeq;
  };

  /** Trang bị ẩn -> về trung tính, gửi lệnh dừng và ngừng gửi (ESP32 failsafe sau 500 ms). */
  private handleVisibility = (): void => {
    if (document.hidden) {
      this.resetInput();
      this.tick();
      if (this.timer) clearInterval(this.timer);
      this.timer = null;
    } else if (!this.timer) {
      this.timer = setInterval(this.tick, CONTROL_INTERVAL_MS);
    }
  };
}
