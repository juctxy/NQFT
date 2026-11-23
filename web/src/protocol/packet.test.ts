import { describe, expect, it } from 'vitest';
import { decodeTelemetry, encodeControl } from './packet';
import { ButtonBit } from './constants';

describe('encodeControl', () => {
  it('khớp ví dụ trong docs/protocol.md', () => {
    expect([...encodeControl(1, { y: 50, x: 0, flags: 0 })]).toEqual([0x01, 0x32, 0x00, 0x00]);
    expect([...encodeControl(2, { y: 0, x: -100, flags: 0 })]).toEqual([0x02, 0x00, 0x9c, 0x00]);
  });

  it('kẹp giá trị ngoài phạm vi và làm tròn', () => {
    const p = encodeControl(0, { y: 250, x: -180.4, flags: 0 });
    const v = new DataView(p.buffer);
    expect(v.getInt8(1)).toBe(100);
    expect(v.getInt8(2)).toBe(-100);
    expect(new DataView(encodeControl(0, { y: 12.6, x: NaN, flags: 0 }).buffer).getInt8(1)).toBe(13);
  });

  it('seq quay vòng 0..255 và giữ cờ', () => {
    const p = encodeControl(257, { y: 0, x: 0, flags: ButtonBit.Func1 | ButtonBit.Square });
    expect(p[0]).toBe(1);
    expect(p[3]).toBe(0b101);
  });
});

describe('gói CONTROL v6 (byte speedPwm)', () => {
  it('có speedPwm -> 5 byte; không có -> 4 byte như cũ', () => {
    expect([...encodeControl(1, { y: 100, x: 0, flags: 0, speedPwm: 200 })]).toEqual([1, 100, 0, 0, 200]);
    expect(encodeControl(1, { y: 100, x: 0, flags: 0 })).toHaveLength(4);
  });
});

describe('decodeTelemetry', () => {
  it('bit 1 = chưa có chân PWM, bit 2 = xe hiểu speedPwm', () => {
    const t = decodeTelemetry(new DataView(new Uint8Array([0, 0, 0b110, 0]).buffer));
    expect(t).toMatchObject({ failsafe: false, noPwmPin: true, speedPwm: true });
  });

  it('giải mã little-endian', () => {
    const view = new DataView(new Uint8Array([0xfc, 0x1c, 0x01, 0x2a]).buffer);
    expect(decodeTelemetry(view)).toEqual({ batteryMv: 7420, status: 1, failsafe: true, lastSeq: 42, noPwmPin: false, speedPwm: false });
  });

  it('trả null khi gói quá ngắn', () => {
    expect(decodeTelemetry(new DataView(new ArrayBuffer(2)))).toBeNull();
  });
});
