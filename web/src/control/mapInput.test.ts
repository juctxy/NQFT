import { describe, expect, it } from 'vitest';
import { createDefaultDriveProfile, setDriveWheelType } from '../drive/driveModel';
import { ButtonBit } from '../protocol/constants';
import { mapDrive, type DriveInput } from './mapInput';

const standard = createDefaultDriveProfile('a', 'A'); // maxLimit 255
const newCar = { speedPwm: true, noPwmPin: false };
const omni = setDriveWheelType(standard, 'omni');
const mecanum = setDriveWheelType(standard, 'mecanum');
const idle: DriveInput = { joystick: { x: 0, y: 0 }, rotate: 0, buttons: 0 };

describe('mapDrive', () => {
  it('đứng yên khi không chạm', () => {
    expect(mapDrive(standard, 'medium', idle)).toEqual({ y: 0, x: 0, flags: 0 });
  });

  it('xe cũ: PWM của mức quy ra %: Chậm 140 → 55, Vừa 200 → 78, Nhanh 255 → 100; không có byte speedPwm', () => {
    const up = { ...idle, joystick: { x: 0, y: 1 } };
    expect(mapDrive(standard, 'slow', up).y).toBe(55);
    expect(mapDrive(standard, 'medium', up)).toEqual({ y: 78, x: 0, flags: 0 });
    expect(mapDrive(standard, 'fast', up).y).toBe(100);
  });

  it('xe mới: x, y chỉ là hướng (±100), speedPwm = PWM cố định của mức', () => {
    const up = { ...idle, joystick: { x: 0, y: 1 } };
    expect(mapDrive(standard, 'slow', up, newCar)).toEqual({ y: 100, x: 0, flags: 0, speedPwm: 140 });
    expect(mapDrive(standard, 'medium', up, newCar).speedPwm).toBe(200);
    expect(mapDrive(standard, 'fast', up, newCar).speedPwm).toBe(255);
  });

  it('đẩy nhẹ cũng chạy hết mức; hướng joystick được snap về hướng chéo gần nhất', () => {
    expect(mapDrive(standard, 'medium', { ...idle, joystick: { x: 0, y: 0.25 } }, newCar).y).toBe(100);
    expect(mapDrive(standard, 'medium', { ...idle, joystick: { x: 0.2, y: 0.4 } }, newCar)).toMatchObject({ x: 100, y: 100 });
  });

  it('mọi loại bánh đều gửi vector thẳng hoặc chéo đủ mức', () => {
    for (const profile of [standard, omni, mecanum]) {
      expect(mapDrive(profile, 'medium', { ...idle, joystick: { x: 0.8, y: 0.9 } }, newCar)).toMatchObject({
        x: 100,
        y: 100,
        speedPwm: 200,
      });
    }
  });

  it('xe chưa có chân PWM: bỏ mức tốc độ, luôn 255', () => {
    const up = { ...idle, joystick: { x: 0, y: 1 } };
    expect(mapDrive(standard, 'slow', up, { speedPwm: true, noPwmPin: true }).speedPwm).toBe(255);
  });

  it('Giới hạn tốc độ tối đa chặn PWM của mức', () => {
    const up = { ...idle, joystick: { x: 0, y: 1 } };
    expect(mapDrive({ ...standard, maxLimit: 180 }, 'fast', up, newCar).speedPwm).toBe(180);
  });

  it('vùng chết 6 % ở giữa joystick', () => {
    expect(mapDrive(standard, 'fast', { ...idle, joystick: { x: 0.05, y: 0 } }).x).toBe(0);
  });

  it('standard: Ox là rẽ; nút quẹo không gửi bit', () => {
    const r = mapDrive(standard, 'fast', { ...idle, joystick: { x: -1, y: 0 }, rotate: 1 });
    expect(r.x).toBe(-100);
    expect(r.flags).toBe(0);
  });

  it('omni: Ox = x × V_side, không trộn xoay vào trục; kẹp theo giới hạn tối đa', () => {
    expect(mapDrive(omni, 'fast', { ...idle, rotate: 1 }).x).toBe(0);
    expect(mapDrive(omni, 'fast', { ...idle, joystick: { x: 1, y: 0 }, rotate: -1 }).x).toBe(100);
    const limited = { ...omni, maxLimit: 128 };
    expect(mapDrive(limited, 'fast', { ...idle, joystick: { x: 1, y: 0 } }).x).toBe(50);
  });

  it('omni: xoay trái/phải giữ bit riêng khi joystick đang di chuyển', () => {
    const left = mapDrive(omni, 'fast', { ...idle, joystick: { x: 0.8, y: 0.9 }, rotate: -1 });
    expect(left).toMatchObject({ x: 100, y: 100, flags: ButtonBit.TurnLeft });
    expect(mapDrive(omni, 'fast', { ...idle, rotate: 1 }).flags).toBe(0x80);
    expect(mapDrive(omni, 'fast', { ...idle, rotate: 1, buttons: ButtonBit.Cross }).flags).toBe(0xa0);
  });

  it('mỗi nút 1 bit: CROSS → 0x20, TRIANGLE + FUNC 1 cùng lúc → 0x11', () => {
    expect(mapDrive(standard, 'medium', { ...idle, buttons: ButtonBit.Cross }).flags).toBe(0x20);
    expect(mapDrive(standard, 'medium', { ...idle, buttons: ButtonBit.Triangle | ButtonBit.Func1 }).flags).toBe(0x11);
  });

  it('nút bấm tay chỉ được bit 0..5; bit 6..7 chỉ đến từ nút quẹo', () => {
    expect(mapDrive(standard, 'medium', { ...idle, buttons: 0x3f }).flags).toBe(0x3f);
    expect(mapDrive(standard, 'medium', { ...idle, buttons: 0xff }).flags).toBe(0x3f);
  });
});
