#include "WUD_Wheel.h"
#include <Arduino.h>

WUD_Wheel::~WUD_Wheel() {
  if (_owned) delete _driver;
}

void WUD_Wheel::attach(WUD_MotorDriver* driver, bool reverse, bool owned) {
  if (_owned) delete _driver;
  _driver = driver;
  _owned = owned;
  _reverse = reverse;
  _speed = 0;
  _dirty = true;
  if (_driver) _driver->begin();  // begin() tự đưa motor về dừng
  apply();
}

void WUD_Wheel::configure(uint8_t trimPercent, uint8_t minPwm, bool invert) {
  _trim = trimPercent > 100 ? 100 : trimPercent;
  _minPwm = minPwm;
  _invert = invert;
  _dirty = true;
  apply();
}

void WUD_Wheel::setSpeed(int speed) {
  _speed = constrain(speed, -100, 100);
  apply();
}

void WUD_Wheel::apply() {
  if (!_driver) return;
  int s = (_reverse != _invert) ? -_speed : _speed;
  long duty = (long)abs(s) * 255L * _trim / 10000L;
  if (duty > 0 && duty < _minPwm) duty = _minPwm;
  if (duty > 255) duty = 255;
  int out = s < 0 ? -(int)duty : (int)duty;
  if (!_dirty && out == _lastDuty) return;  // không ghi lại giá trị cũ
  _lastDuty = out;
  _dirty = false;
  _driver->write(out);
}
