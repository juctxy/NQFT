// ButtonsDemo — chỉ cần ESP32, chưa cần motor.
// Mở Serial Monitor (115200), kết nối bằng web NQFT rồi bấm thử các nút, kéo joystick,
// đổi mức Chậm / Vừa / Nhanh.
//
// Yêu cầu: thư viện WUD_Tournaments 0.3.0 trở lên.

#include <WUD_Tournaments.h>

uint8_t lastSpeedPwm = 0;   // mức tốc độ đã in lần trước

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
  // x, y là HƯỚNG joystick: ±100 khi đẩy thẳng một phía (đẩy nhẹ hay hết cỡ như nhau).
  if (Car.debugMode() && Car.hasChanged()) {
    WUD_Signal s = Car.signal();
    Serial.printf("x=%4d  y=%4d  nut=0x%02X\n", s.x, s.y, s.flags);
  }

  // Mức tốc độ trên web: Chậm = 140, Vừa = 200, Nhanh = 255 (PWM khi tốc độ 100 %).
  if (Car.speedPwm() != lastSpeedPwm) {
    lastSpeedPwm = Car.speedPwm();
    Serial.printf("Muc toc do: PWM %u\n", lastSpeedPwm);
  }

  // wasPressed: đúng 1 lần mỗi lần nhấn. isPressed: suốt lúc giữ.
  if (Car.CROSS.wasPressed())    Serial.println("CROSS: vua nhan -> sut 1 lan");
  if (Car.TRIANGLE.wasPressed()) Serial.println("TRIANGLE: bat dau giu");
  if (Car.TRIANGLE.wasReleased()) Serial.println("TRIANGLE: da tha");
  if (Car.CIRCLE.wasPressed())   Serial.println("CIRCLE");
  if (Car.SQUARE.wasPressed())   Serial.println("SQUARE");
  if (Car.FUNC1.wasPressed())    Serial.println("FUNC1");
  if (Car.FUNC2.wasPressed())    Serial.println("FUNC2");
  // Nút QUẸO chỉ hiện trên web khi chọn bánh Omni / Mecanum.
  if (Car.TURN_LEFT.wasPressed())  Serial.println("Bat dau giu QUEO TRAI");
  if (Car.TURN_RIGHT.wasPressed()) Serial.println("Bat dau giu QUEO PHAI");
}
