// MecanumDrive — xe 4 bánh mecanum (2 module L298N).
//   Joystick Oy = tiến/lùi, Ox = đi ngang.
//   Nút QUẸO TRÁI / QUẸO PHẢI trên web = xoay tại chỗ.
//
// Lắp bánh mecanum sao cho nhìn từ trên xuống, các con lăn tạo thành chữ X.
// WUD_OMNI hiện chạy y hệt WUD_MECANUM.

#include <WUD_Tournaments.h>

void setup() {
  Serial.begin(115200);
  Car.setName("AB12");

  Car.wheelFL(32, 33, 25);
  Car.wheelFR(26, 27, 14, true);
  Car.wheelBL(16, 17, 13);
  Car.wheelBR(18, 19, 23, true);
  Car.setDriveType(WUD_MECANUM);

  Car.onConnect([]() { Serial.println("Tay cam da ket noi!"); });

  Car.begin(2);   // LED báo trạng thái ở GPIO2
}

void loop() {
  Car.update();
  Car.driveFromRemote();
}
