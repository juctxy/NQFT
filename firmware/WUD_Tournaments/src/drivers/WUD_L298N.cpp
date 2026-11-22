#include "WUD_L298N.h"
#include <Arduino.h>
#include <esp_arduino_version.h>

#if ESP_ARDUINO_VERSION_MAJOR < 3
#error "WUD_Tournaments can board 'esp32 by Espressif Systems' v3.x tro len"
#endif

static constexpr uint8_t PWM_BITS = 8;  // duty 0..255

WUD_L298N::WUD_L298N(int in1, int in2, int en, uint32_t pwmFreq)
    : _in1(in1), _in2(in2), _en(en), _freq(pwmFreq) {}

bool WUD_L298N::begin() {
  if (_en >= 0) {
    pinMode(_in1, OUTPUT);
    pinMode(_in2, OUTPUT);
    _ok = ledcAttach(_en, _freq, PWM_BITS);
  } else {
    _ok = ledcAttach(_in1, _freq, PWM_BITS) && ledcAttach(_in2, _freq, PWM_BITS);
  }
  write(0);
  return _ok;
}

void WUD_L298N::write(int duty) {
  if (!_ok) return;
  duty = constrain(duty, -255, 255);
  uint32_t mag = (uint32_t)abs(duty);

  if (_en >= 0) {
    // IN1/IN2 chọn chiều, EN băm xung. Cả hai LOW = thả trôi.
    digitalWrite(_in1, duty > 0 ? HIGH : LOW);
    digitalWrite(_in2, duty < 0 ? HIGH : LOW);
    ledcWrite(_en, mag);
  } else {
    // EN cắm jumper (luôn bật): băm xung trên chân của chiều cần quay.
    ledcWrite(_in1, duty > 0 ? mag : 0);
    ledcWrite(_in2, duty < 0 ? mag : 0);
  }
}
