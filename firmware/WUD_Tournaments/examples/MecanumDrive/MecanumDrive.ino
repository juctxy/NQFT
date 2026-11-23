// MecanumDrive — xe 4 bánh mecanum (2 module L298N), lái bằng joystick trên web.
//   Đẩy joystick LÊN / XUỐNG      = tiến / lùi
//   Đẩy joystick PHẢI / TRÁI      = đi ngang sang phải / trái (thân xe không xoay)
//   Đẩy chéo                      = đi chéo
//   Giữ nút QUẸO TRÁI / QUẸO PHẢI = xoay tại chỗ
//   Nút Chậm / Vừa / Nhanh        = PWM 140 / 200 / 255 (joystick chỉ chọn hướng, không chỉnh tốc độ)
//
// Yêu cầu: thư viện WUD_Tournaments 0.3.0 trở lên.
//
// Lắp bánh mecanum sao cho nhìn từ trên xuống, các con lăn tạo thành chữ X.
// WUD_OMNI hiện chạy y hệt WUD_MECANUM.
//
// Chân PWM (số thứ 3) không bắt buộc. Nếu vẫn cắm jumper ENA/ENB thì bỏ số đó ở CẢ 4 bánh:
//   Car.wheelFL(32, 33, false);  ...  (có thì có hết, không thì không có hết)
// Không có chân PWM: web ẩn Chậm / Vừa / Nhanh, ghi "Trong code chưa set up chân PWM", xe chạy PWM 255.
//
// Đảo chiều 1 bánh: sửa Reverse bên dưới rồi nạp lại code, HOẶC gạt "Đảo chiều" trên web
// (Cài đặt -> Động cơ): xe đổi chiều ngay và nhớ luôn, không cần nạp lại code.

#include <WUD_Tournaments.h>

// Web gửi hướng joystick: x, y = ±100 khi đẩy thẳng một phía, số nhỏ hơn khi đẩy hơi lệch.
// Thành phần nhỏ hơn mức này coi như 0 (đẩy hơi lệch vẫn đi thẳng, không bị trôi ngang).
const int DEADZONE = 15;

void setup() {
  Serial.begin(115200);
  Car.setName("AB12"); // tên Bluetooth: RC-Car-AB12

  // Khai báo 4 bánh: Car.wheelXX(IN1, IN2, PWM, Reverse)
  //   Reverse = false: bánh quay đúng chiều khi xe chạy tiến
  //   Reverse = true : bánh quay ngược khi xe chạy tiến -> thư viện tự đảo lại
  Car.wheelFL(32, 33, 25, false);  // bánh trước trái  (Front Left),  L298N #1 kênh A
  Car.wheelFR(26, 27, 14, true);   // bánh trước phải  (Front Right), L298N #1 kênh B, lắp ngược
  Car.wheelBL(16, 17, 13, false);  // bánh sau trái    (Back Left),   L298N #2 kênh A
  Car.wheelBR(18, 19, 23, true);   // bánh sau phải    (Back Right),  L298N #2 kênh B, lắp ngược

  Car.setDriveType(WUD_MECANUM);   // xe mecanum: đi ngang được

  Car.onConnect([]() { Serial.println("Tay cam da ket noi!"); });

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

// Lái xe theo joystick và nút quẹo.
// Car.x(), Car.y() nằm trong khoảng -100..100:
//   y > 0: đẩy lên,  y < 0: đẩy xuống
//   x > 0: đẩy phải, x < 0: đẩy trái
// Web chỉ gửi HƯỚNG: đẩy hẳn về một phía thì số đó = ±100, đẩy nhẹ hay hết cỡ như nhau.
// Tốc độ thật do mức Chậm / Vừa / Nhanh trên web quyết định (PWM 140 / 200 / 255):
// tốc độ 100 % = đúng PWM của mức đang chọn.
void driveMecanum() {
  // Bước 1: mất kết nối hoặc mất tín hiệu -> dừng xe, không làm gì thêm.
  if (!Car.isConnected() || Car.isFailsafe()) {
    Car.stop();
    return;
  }

  // Bước 2: đang giữ nút quẹo -> xoay tại chỗ (ưu tiên hơn joystick).
  // turnSpeed = 100 (mặc định, web cũng gửi 100) -> xoay bằng đúng PWM của mức đang chọn.
  int turnSpeed = Car.config().turnSpeed;

  if (Car.TURN_LEFT.isPressed()) {
    Car.turnLeft(turnSpeed);
    return;
  }
  if (Car.TURN_RIGHT.isPressed()) {
    Car.turnRight(turnSpeed);
    return;
  }

  // Bước 3: đọc joystick.
  int x = Car.x();
  int y = Car.y();

  // Bước 4: joystick đang đẩy về hướng nào?
  bool pushUp    = (y >  DEADZONE);
  bool pushDown  = (y < -DEADZONE);
  bool pushRight = (x >  DEADZONE);
  bool pushLeft  = (x < -DEADZONE);

  // Bước 5: chọn cách chạy. Kiểm tra hướng chéo trước, rồi mới tới hướng thẳng.
  if (pushUp && pushRight) {
    Car.drive(x, y, 0);      // đi chéo lên bên phải
  } else if (pushUp && pushLeft) {
    Car.drive(x, y, 0);      // đi chéo lên bên trái
  } else if (pushDown && pushRight) {
    Car.drive(x, y, 0);      // đi chéo xuống bên phải
  } else if (pushDown && pushLeft) {
    Car.drive(x, y, 0);      // đi chéo xuống bên trái
  } else if (pushUp) {
    Car.forward(y);          // tiến thẳng; y = 100 -> chạy đúng PWM của mức đang chọn
  } else if (pushDown) {
    Car.backward(-y);        // lùi thẳng (y âm nên đổi dấu thành số dương)
  } else if (pushRight) {
    Car.goRight(x);          // đi ngang sang phải
  } else if (pushLeft) {
    Car.goLeft(-x);          // đi ngang sang trái (x âm nên đổi dấu)
  } else {
    Car.stop();              // joystick ở giữa -> đứng yên
  }
}

void loop() {
  Car.update();          // bắt buộc gọi đầu mỗi vòng loop(): nhận dữ liệu mới từ web
  driveMecanum();        // lái xe theo dữ liệu vừa nhận

  // Cần biết mức tốc độ đang chọn trên web (140 / 200 / 255) thì đọc:
  //   uint8_t pwm = Car.speedPwm();
}
