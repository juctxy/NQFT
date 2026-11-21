import { describe, expect, it } from 'vitest';
import { decodeTelemetry, encodeControl } from './packet';
import { ButtonBit } from './constants';

describe('encodeControl', () => {
  it('khớp ví dụ trong docs/protocol.md', () => {
    expect([...encodeControl(1, { throttle: 50, steering: 0, flags: 0 })]).toEqual([0x01, 0x32, 0x00, 0x00]);
    expect([...encodeControl(2, { throttle: 0, steering: -100, flags: 0 })]).toEqual([0x02, 0x00, 0x9c, 0x00]);
  });

  it('kẹp giá trị ngoài phạm vi và làm tròn', () => {
    const p = encodeControl(0, { throttle: 250, steering: -180.4, flags: 0 });
    const v = new DataView(p.buffer);
    expect(v.getInt8(1)).toBe(100);
    expect(v.getInt8(2)).toBe(-100);
    expect(new DataView(encodeControl(0, { throttle: 12.6, steering: NaN, flags: 0 }).buffer).getInt8(1)).toBe(13);
  });

  it('seq quay vòng 0..255 và giữ cờ', () => {
    const p = encodeControl(257, { throttle: 0, steering: 0, flags: ButtonBit.Func1 | ButtonBit.Func3 });
    expect(p[0]).toBe(1);
    expect(p[3]).toBe(0b101);
  });
});

describe('decodeTelemetry', () => {
  it('giải mã little-endian', () => {
    const view = new DataView(new Uint8Array([0xfc, 0x1c, 0x01, 0x2a]).buffer);
    expect(decodeTelemetry(view)).toEqual({ batteryMv: 7420, status: 1, failsafe: true, lastSeq: 42 });
  });

  it('trả null khi gói quá ngắn', () => {
    expect(decodeTelemetry(new DataView(new ArrayBuffer(2)))).toBeNull();
  });
});
