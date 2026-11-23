// ButtonsDemo — chỉ cần ESP32, chưa cần motor.
// Mở Serial Monitor (115200), kết nối bằng web NQFT rồi bấm thử các nút.

#include <WUD_Tournaments.h>

void setup() {
  Serial.begin(115200);

  Car.setName("AA11");   // tên Bluetooth: RC-Car-AA11
  // LED tự chớp: nháy chậm = chờ, sáng = đã kết nối, nháy nhanh = failsafe.
  // DebugMode (không bắt buộc): 1 = in dữ liệu tay cầm gửi tới ra Serial (mặc định); 0 = không in.
  Car.begin(1);
}

void loop() {
  Car.update();          // bắt buộc gọi đầu mỗi vòng loop()

  // Chỉ in khi tín hiệu thay đổi.
  if (Car.debugMode() && Car.hasChanged()) {
    WUD_Signal s = Car.signal();
    Serial.printf("x=%4d  y=%4d  nut=0x%02X\n", s.x, s.y, s.flags);
  }

  // wasPressed: đúng 1 lần mỗi lần nhấn. isPressed: suốt lúc giữ.
  if (Car.CROSS.wasPressed())    Serial.println("CROSS: vua nhan -> sut 1 lan");
  if (Car.TRIANGLE.wasPressed()) Serial.println("TRIANGLE: bat dau giu");
  if (Car.TRIANGLE.wasReleased()) Serial.println("TRIANGLE: da tha");
  if (Car.CIRCLE.wasPressed())   Serial.println("CIRCLE");
  if (Car.SQUARE.wasPressed())   Serial.println("SQUARE");
  if (Car.FUNC1.wasPressed())    Serial.println("FUNC1");
  if (Car.FUNC2.wasPressed())    Serial.println("FUNC2");
  if (Car.TURN_LEFT.isPressed() && Car.hasChanged())  Serial.println("Dang giu QUEO TRAI");
  if (Car.TURN_RIGHT.isPressed() && Car.hasChanged()) Serial.println("Dang giu QUEO PHAI");
}
