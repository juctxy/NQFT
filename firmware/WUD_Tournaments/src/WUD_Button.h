#pragma once
#include <stdint.h>

// Một nút trên tay cầm. Trạng thái được cập nhật mỗi lần gọi Car.update().
class WUD_Button {
public:
  WUD_Button(uint8_t mask, const char* name, const uint8_t* held, const uint8_t* pressed,
             const uint8_t* released)
      : _bit(mask), _name(name), _held(held), _pressed(pressed), _released(released) {}

  // Đang giữ nút. Dùng cho hành động kéo dài (giữ cần cản).
  bool isPressed() const { return (*_held & _bit) != 0; }

  // Vừa nhấn xuống: true trong đúng một vòng loop() (sau lần update() phát hiện).
  // Dùng cho hành động chạy một lần (sút).
  bool wasPressed() const { return (*_pressed & _bit) != 0; }

  // Vừa thả ra: true trong đúng một vòng loop(). Failsafe cũng tính là thả.
  bool wasReleased() const { return (*_released & _bit) != 0; }

  uint8_t mask() const { return _bit; }
  const char* name() const { return _name; }

private:
  uint8_t _bit;
  const char* _name;
  const uint8_t* _held;
  const uint8_t* _pressed;
  const uint8_t* _released;
};
