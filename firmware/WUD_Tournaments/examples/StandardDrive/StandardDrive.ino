// StandardDrive — xe 4 bánh thường (2 module L298N), lái bằng joystick trên web.
//   Đẩy joystick LÊN / XUỐNG  = tiến / lùi
//   Đẩy joystick PHẢI / TRÁI  = xoay phải / xoay trái tại chỗ
//   Đẩy chéo                  = vừa chạy vừa rẽ
//   Nút Chậm / Vừa / Nhanh    = PWM 140 / 200 / 255 (joystick chỉ chọn hướng, không chỉnh tốc độ)
//
// Yêu cầu: thư viện WUD_Tournaments 0.3.0 trở lên.
//
// Đấu dây (đổi theo xe của bạn):
//   Bánh   IN1  IN2  PWM(EN)
//   FL     32   33   25     L298N #1 kênh A
//   FR     26   27   14     L298N #1 kênh B
//   BL     16   17   13     L298N #2 kênh A
//   BR     18   19   23     L298N #2 kênh B
//
// Chân PWM (số thứ 3) không bắt buộc. Nếu vẫn cắm jumper ENA/ENB thì bỏ số đó ở CẢ 4 bánh:
//   Car.wheelFL(32, 33, false);  ...  (có thì có hết, không thì không có hết)
// Không có chân PWM: web ẩn Chậm / Vừa / Nhanh, ghi "Trong code chưa set up chân PWM", xe chạy PWM 255.
//
// Đảo chiều 1 bánh: sửa Reverse bên dưới rồi nạp lại code, HOẶC gạt "Đảo chiều" trên web
// (Cài đặt -> Động cơ): xe đổi chiều ngay và nhớ luôn, không cần nạp lại code.

#include <WUD_Tournaments.h>

// Web gửi hướng joystick: x, y = ±100 khi đẩy thẳng một phía, số nhỏ hơn khi đẩy hơi lệch.
// Thành phần nhỏ hơn mức này coi như 0 (đẩy hơi lệch vẫn đi thẳng, không bị rẽ nhẹ).
const int DEADZONE = 15;

void setup() {
  Serial.begin(115200);
  Car.setName("AA11");   // tên Bluetooth: RC-Car-AA11

  // Khai báo 4 bánh: Car.wheelXX(IN1, IN2, PWM, Reverse)
  //   Reverse = false: bánh quay đúng chiều khi xe chạy tiến
  //   Reverse = true : bánh quay ngược khi xe chạy tiến -> thư viện tự đảo lại
  Car.wheelFL(32, 33, 25, false);  // bánh trước trái  (Front Left)
  Car.wheelFR(26, 27, 14, true);   // bánh trước phải  (Front Right), motor lắp ngược nên Reverse = true
  Car.wheelBL(16, 17, 13, false);  // bánh sau trái    (Back Left)
  Car.wheelBR(18, 19, 23, true);   // bánh sau phải    (Back Right), motor lắp ngược nên Reverse = true

  Car.setDriveType(WUD_STD);       // xe 4 bánh thường

  // Bật Bluetooth. LED tự chớp. Car.begin(0) = không in dữ liệu nhận ra Serial.
  // begin() trả false nếu khai báo sai (ví dụ có bánh có chân PWM, có bánh không) -> xem dòng lỗi phía trên.
  if (!Car.begin()) {
    Serial.println("Khoi dong that bai, sua code theo dong loi o tren roi nap lai.");
    return;
  }
  if (!Car.hasPwmPins()) {
    Serial.println("Chua khai bao chan PWM: web an muc Cham/Vua/Nhanh, xe chay PWM 255.");
  }
}

// Lái xe theo joystick.
// Car.x(), Car.y() nằm trong khoảng -100..100:
//   y > 0: đẩy lên,  y < 0: đẩy xuống
//   x > 0: đẩy phải, x < 0: đẩy trái
// Web chỉ gửi HƯỚNG: đẩy hẳn về một phía thì số đó = ±100, đẩy nhẹ hay hết cỡ như nhau.
// Tốc độ thật do mức Chậm / Vừa / Nhanh trên web quyết định (PWM 140 / 200 / 255):
// tốc độ 100 % = đúng PWM của mức đang chọn.
void driveStandard() {
  // Bước 1: mất kết nối hoặc mất tín hiệu -> dừng xe, không làm gì thêm.
  if (!Car.isConnected() || Car.isFailsafe()) {
    Car.stop();
    return;
  }

  // Bước 2: đọc joystick.
  int x = Car.x();
  int y = Car.y();

  // Bước 3: joystick đang đẩy về hướng nào?
  bool pushUp    = (y >  DEADZONE);
  bool pushDown  = (y < -DEADZONE);
  bool pushRight = (x >  DEADZONE);
  bool pushLeft  = (x < -DEADZONE);

  // Bước 4: chọn cách chạy. Kiểm tra hướng chéo trước, rồi mới tới hướng thẳng.
  if (pushUp && pushRight) {
    Car.drive(x, y, 0);      // vừa tiến vừa rẽ phải
  } else if (pushUp && pushLeft) {
    Car.drive(x, y, 0);      // vừa tiến vừa rẽ trái
  } else if (pushDown && pushRight) {
    Car.drive(x, y, 0);      // vừa lùi vừa rẽ phải
  } else if (pushDown && pushLeft) {
    Car.drive(x, y, 0);      // vừa lùi vừa rẽ trái
  } else if (pushUp) {
    Car.forward(y);          // tiến thẳng; y = 100 -> chạy đúng PWM của mức đang chọn
  } else if (pushDown) {
    Car.backward(-y);        // lùi thẳng (y âm nên đổi dấu thành số dương)
  } else if (pushRight) {
    Car.turnRight(x);        // xoay phải tại chỗ
  } else if (pushLeft) {
    Car.turnLeft(-x);        // xoay trái tại chỗ (x âm nên đổi dấu)
  } else {
    Car.stop();              // joystick ở giữa -> đứng yên
  }
}

void loop() {
  Car.update();          // bắt buộc gọi đầu mỗi vòng loop(): nhận dữ liệu mới từ web
  driveStandard();       // lái xe theo dữ liệu vừa nhận

  if (Car.CROSS.wasPressed()) {
    // TODO: sút
  }

  // Cần biết mức tốc độ đang chọn trên web (140 / 200 / 255) thì đọc:
  //   uint8_t pwm = Car.speedPwm();
}
