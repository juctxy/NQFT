// StandardDrive — xe 4 bánh thường (2 module L298N), lái bằng joystick.
//
// Đấu dây (đổi theo xe của bạn):
//   Bánh   IN1  IN2  EN
//   FL     32   33   25     L298N #1 kênh A
//   FR     26   27   14     L298N #1 kênh B
//   BL     16   17   13     L298N #2 kênh A
//   BR     18   19   23     L298N #2 kênh B
// Nếu vẫn cắm jumper ENA/ENB thì truyền -1 cho EN.

#include <WUD_Tournaments.h>

void setup() {
  Serial.begin(115200);
  Car.setName("AA11");

  Car.wheelFL(32, 33, 25);
  Car.wheelFR(26, 27, 14, true);   // true = bánh này quay ngược khi chạy tiến
  Car.wheelBL(16, 17, 13);
  Car.wheelBR(18, 19, 23, true);
  Car.setDriveType(WUD_STD);

  Car.begin(2);   // LED báo trạng thái ở GPIO2
}

void loop() {
  Car.update();
  Car.driveFromRemote();           // Oy = tiến/lùi, Ox = rẽ. Mất tín hiệu -> tự dừng.

  if (Car.CROSS.wasPressed()) {
    // TODO: sút
  }
}
