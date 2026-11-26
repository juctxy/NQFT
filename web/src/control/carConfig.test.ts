import { describe, expect, it } from 'vitest';
import { createDefaultDriveProfile, setMatrixSign } from '../drive/driveModel';
import { decodeConfig, encodeConfig, encodeTest } from '../protocol/packet';
import { configFromProfile, sameConfig } from './carConfig';
import { ControlLoop } from './ControlLoop';
import type { Transport } from '../transport/Transport';

describe('CONFIG v2', () => {
  it('hồ sơ mặc định -> 12 byte, ma trận chưa tùy chỉnh', () => {
    const p = createDefaultDriveProfile('a', 'A');
    const bytes = [...encodeConfig(configFromProfile(p, 'medium'))];
    // [ver, trim x4, minPwm, invert, turnSpeed 100 % (= PWM của mức), customMatrix, fwd, side, turn]
    expect(bytes.slice(0, 9)).toEqual([2, 100, 100, 100, 100, 35, 0, 100, 0]);
    expect(bytes).toHaveLength(12);
  });

  it('đảo chiều, bù công suất và ma trận tùy chỉnh đi qua encode/decode nguyên vẹn', () => {
    let p = createDefaultDriveProfile('a', 'A');
    p = { ...p, motors: { ...p.motors, fr: { inverted: true, compensation: 90 }, rr: { inverted: true, compensation: 85 } } };
    p = setMatrixSign(p, 'turn', 'fl', -1);
    const cfg = configFromProfile(p, 'fast');
    expect(cfg.invertMask).toBe(0b1010); // FR + BR
    expect(cfg.trim).toEqual([100, 90, 100, 85]);
    expect(cfg.customMatrix).toBe(true);
    const back = decodeConfig(new DataView(encodeConfig(cfg).buffer));
    expect(back).not.toBeNull();
    expect(sameConfig(back!, cfg)).toBe(true);
    expect(back!.matrix.turn).toEqual([-1, -1, 1, -1]);
  });

  it('đọc được CONFIG v1 (8 byte) của firmware cũ', () => {
    const v1 = new Uint8Array([1, 100, 95, 100, 100, 30, 0b0101, 50]);
    const c = decodeConfig(new DataView(v1.buffer));
    expect(c).toMatchObject({ trim: [100, 95, 100, 100], minPwm: 30, invertMask: 5, turnSpeed: 50, customMatrix: false });
  });

  it('bỏ qua phiên bản lạ hoặc gói quá ngắn', () => {
    expect(decodeConfig(new DataView(new Uint8Array([9, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]).buffer))).toBeNull();
    expect(decodeConfig(new DataView(new Uint8Array([2, 0, 0]).buffer))).toBeNull();
  });
});

describe('gói TEST', () => {
  it('[bánh, tốc độ]; null = dừng (0xFF)', () => {
    expect([...encodeTest(1, 40)]).toEqual([1, 40]);
    expect([...encodeTest(3, -40)]).toEqual([3, 0xd8]);
    expect([...encodeTest(null, 40)]).toEqual([0xff, 0]);
  });
});

describe('đầu ra điều khiển tức thì', () => {
  it('gửi ngay lệnh di chuyển, đổi hướng và dừng', () => {
    const loop = new ControlLoop({} as Transport);
    loop.setInput({ y: 100, x: 0, flags: 4 });
    expect(loop.nextOutput()).toEqual({ y: 100, x: 0, flags: 4 });

    loop.setInput({ y: -100, x: 100 });
    expect(loop.nextOutput()).toEqual({ y: -100, x: 100, flags: 4 });

    loop.resetInput();
    expect(loop.nextOutput()).toEqual({ y: 0, x: 0, flags: 0 });
  });
});
