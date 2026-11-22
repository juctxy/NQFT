#pragma once
// Lớp gốc cho mọi loại driver motor.
//
// Thêm driver mới (TB6612, DRV8833, ...): tạo lớp kế thừa WUD_MotorDriver,
// cài đặt begin() và write(), rồi gắn vào bánh bằng Car.wheelFL(driver).
// Xem WUD_L298N.h làm mẫu.

class WUD_MotorDriver {
public:
  virtual ~WUD_MotorDriver() {}

  // Cấu hình chân. Trả về false nếu không cấu hình được (ví dụ hết kênh PWM).
  virtual bool begin() = 0;

  // duty: -255..255. Dương = quay thuận, âm = quay ngược, 0 = dừng.
  virtual void write(int duty) = 0;

  virtual void stop() { write(0); }
};
