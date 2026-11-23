import { describe, expect, it } from 'vitest';
import { createDefaultDriveProfile, setMatrixSign } from '../drive/driveModel';
import { decodeConfig, encodeConfig, encodeTest } from '../protocol/packet';
import { configFromProfile, sameConfig } from './carConfig';
import { ControlLoop, rampToward } from './ControlLoop';
import type { Transport } from '../transport/Transport';

describe('CONFIG v2', () => {
  it('hồ sơ mặc định -> 12 byte, ma trận chưa tùy chỉnh', () => {
    const p = createDefaultDriveProfile('a', 'A');
    const bytes = [...encodeConfig(configFromProfile(p, 'medium'))];
    // [ver, trim x4, minPwm, invert, turnSpeed(190/255=75%), customMatrix, fwd, side, turn]
    expect(bytes.slice(0, 9)).toEqual([2, 100, 100, 100, 100, 35, 0, 75, 0]);
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

describe('tăng tốc mềm', () => {
  it('rampToward đi từng bước, không vượt đích', () => {
    expect(rampToward(0, 100, 30)).toBe(30);
    expect(rampToward(90, 100, 30)).toBe(100);
    expect(rampToward(50, -50, 30)).toBe(20);
  });

  it('200 ms: 0 -> 100 mất 200 ms; 0 ms: nhảy ngay', () => {
    const loop = new ControlLoop({} as Transport);
    loop.setSoftAccel(200);
    loop.setInput({ y: 100, x: 0, flags: 4 });
    expect(loop.nextOutput(1000)).toEqual({ y: 100 * (33 / 200), x: 0, flags: 4 }); // nhịp đầu = 33 ms
    expect(loop.nextOutput(1100).y).toBeCloseTo(66.5);
    expect(loop.nextOutput(1200).y).toBe(100);

    loop.setSoftAccel(0);
    loop.setInput({ y: -100 });
    expect(loop.nextOutput(1233).y).toBe(-100);
  });

  it('resetInput dừng ngay, không làm mềm', () => {
    const loop = new ControlLoop({} as Transport);
    loop.setSoftAccel(400);
    loop.setInput({ y: 100 });
    loop.nextOutput(0);
    loop.nextOutput(400);
    loop.resetInput();
    expect(loop.nextOutput(433).y).toBe(0);
  });
});
