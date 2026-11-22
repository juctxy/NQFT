// ManualMoves — thử từng hướng chạy, không cần tay cầm.
// Nhấn FUNC1 trên web (hoặc đổi điều kiện bên dưới) để chạy chuỗi động tác.
// Lần đầu nên kê xe lên cao cho bánh quay tự do.

#include <WUD_Tournaments.h>

void step(const char* label, void (*move)()) {
  Serial.println(label);
  move();
  uint32_t t = millis();
  while (millis() - t < 1000) Car.update();  // vẫn gọi update() trong lúc chờ
  Car.stop();
}

void setup() {
  Serial.begin(115200);
  Car.wheelFL(32, 33, 25);
  Car.wheelFR(26, 27, 14, true);
  Car.wheelBL(16, 17, 13);
  Car.wheelBR(18, 19, 23, true);
  Car.setDriveType(WUD_MECANUM);
  Car.begin(2);   // LED báo trạng thái ở GPIO2
}

void loop() {
  Car.update();
  if (!Car.FUNC1.wasPressed()) return;

  step("Tien",      []() { Car.forward(60); });
  step("Lui",       []() { Car.backward(60); });
  step("Xoay trai", []() { Car.turnLeft(50); });
  step("Xoay phai", []() { Car.turnRight(50); });
  step("Di ngang trai", []() { Car.goLeft(60); });   // STD: không chạy, trả về false
  step("Di ngang phai", []() { Car.goRight(60); });
}
