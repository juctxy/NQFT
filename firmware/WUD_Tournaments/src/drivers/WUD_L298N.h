#pragma once
#include <stdint.h>
#include "WUD_MotorDriver.h"

// Một kênh của module L298N (mỗi module có 2 kênh = 2 bánh).
//
//   in1, in2 : chân chọn chiều quay (IN1/IN2 hoặc IN3/IN4)
//   en       : chân PWM tốc độ (ENA/ENB). Truyền -1 nếu vẫn cắm jumper trên ENA/ENB:
//              khi đó PWM được xuất thẳng ra in1/in2.
class WUD_L298N : public WUD_MotorDriver {
public:
  WUD_L298N(int in1, int in2, int en = -1, uint32_t pwmFreq = 1000);

  bool begin() override;
  void write(int duty) override;

private:
  int _in1, _in2, _en;
  uint32_t _freq;
  bool _ok = false;
};
