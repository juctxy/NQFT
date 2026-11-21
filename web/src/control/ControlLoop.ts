import { CONTROL_INTERVAL_MS } from '../protocol/constants';
import { encodeControl, NEUTRAL_INPUT, type ControlInput } from '../protocol/packet';
import type { Transport } from '../transport/Transport';

/**
 * Gửi lệnh điều khiển liên tục 30 Hz khi đã kết nối (kiêm heartbeat cho failsafe).
 * Input được ghi vào qua setInput() từ bất kỳ nguồn nào (nút hướng, joystick, gamepad...)
 * mà không gây re-render React.
 */
export class ControlLoop {
  private input: ControlInput = { ...NEUTRAL_INPUT };
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

  resetInput(): void {
    this.input = { ...NEUTRAL_INPUT };
  }

  private tick = (): void => {
    if (this.transport.getStatus().state !== 'connected') return;
    const nextSeq = (this.seq + 1) & 0xff;
    if (this.transport.send(encodeControl(nextSeq, this.input))) this.seq = nextSeq;
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
