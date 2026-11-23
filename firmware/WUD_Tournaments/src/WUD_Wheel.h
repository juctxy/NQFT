#pragma once
#include <stdint.h>
#include "drivers/WUD_MotorDriver.h"

// Một bánh xe = một driver motor + chiều quay + thông số bù.
class WUD_Wheel {
public:
  WUD_Wheel() = default;
  ~WUD_Wheel();
  WUD_Wheel(const WUD_Wheel&) = delete;
  WUD_Wheel& operator=(const WUD_Wheel&) = delete;

  // speed: -100..100 (%). Dương = xe tiến. Đã tính đảo chiều, bù công suất, PWM tối thiểu.
  void setSpeed(int speed);
  void stop() { setSpeed(0); }

  // Chạy thử từ web: chỉ tính reverse trong code, bỏ qua đảo chiều / bù / PWM tối thiểu của CONFIG.
  void test(int speed);

  int speed() const { return _speed; }
  bool attached() const { return _driver != nullptr; }

  // Dùng nội bộ (WUD_Car gọi).
  void attach(WUD_MotorDriver* driver, bool reverse, bool owned);
  void configure(uint8_t trimPercent, uint8_t minPwm, bool invert);

private:
  void apply();

  WUD_MotorDriver* _driver = nullptr;
  bool _owned = false;      // true = thư viện tự tạo driver, tự giải phóng
  bool _reverse = false;    // đảo chiều trong code (wheelFL(..., true))
  bool _invert = false;     // đảo chiều từ ô CONFIG (UI)
  uint8_t _trim = 100;      // bù công suất 0..100 %
  uint8_t _minPwm = 0;      // PWM tối thiểu 0..255 khi bánh đang quay
  int _speed = 0;
  int _lastDuty = 0;
  bool _dirty = true;
  bool _raw = false;        // true = đang chạy thử (test())
};
