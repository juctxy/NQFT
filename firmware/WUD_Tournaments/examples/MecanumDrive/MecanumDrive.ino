// MecanumDrive — xe 4 bánh mecanum (2 module L298N), lái bằng joystick trên web.
//   Đẩy joystick LÊN / XUỐNG      = tiến / lùi
//   Đẩy joystick PHẢI / TRÁI      = đi ngang sang phải / trái (thân xe không xoay)
//   Đẩy chéo                      = đi chéo
//   Giữ nút QUẸO TRÁI / QUẸO PHẢI = xoay tại chỗ
//
// Lắp bánh mecanum sao cho nhìn từ trên xuống, các con lăn tạo thành chữ X.
// WUD_OMNI hiện chạy y hệt WUD_MECANUM.
//
// Chân PWM (số thứ 3) không bắt buộc. Nếu vẫn cắm jumper ENA/ENB thì bỏ số đó ở CẢ 4 bánh:
//   Car.wheelFL(32, 33, false);  ...  (có thì có hết, không thì không có hết)

#include <WUD_Tournaments.h>

// Joystick lệch khỏi giữa ít hơn mức này thì coi như chưa đẩy (tránh xe tự bò).
const int DEADZONE = 15;

void setup() {
  Serial.begin(115200);
  Car.setName("AB12");   // tên Bluetooth: RC-Car-AB12

  // Khai báo 4 bánh: Car.wheelXX(IN1, IN2, PWM, Reverse)
  //   Reverse = false: bánh quay đúng chiều khi xe chạy tiến
  //   Reverse = true : bánh quay ngược khi xe chạy tiến -> thư viện tự đảo lại
  Car.wheelFL(32, 33, 25, false);  // bánh trước trái  (Front Left),  L298N #1 kênh A
  Car.wheelFR(26, 27, 14, true);   // bánh trước phải  (Front Right), L298N #1 kênh B, lắp ngược
  Car.wheelBL(16, 17, 13, false);  // bánh sau trái    (Back Left),   L298N #2 kênh A
  Car.wheelBR(18, 19, 23, true);   // bánh sau phải    (Back Right),  L298N #2 kênh B, lắp ngược

  Car.setDriveType(WUD_MECANUM);   // xe mecanum: đi ngang được

  Car.onConnect([]() { Serial.println("Tay cam da ket noi!"); });

  Car.begin();   // LED tự chớp. Car.begin(0) = không in dữ liệu nhận ra Serial.
}

// Lái xe theo joystick và nút quẹo.
// Car.x(), Car.y() nằm trong khoảng -100..100:
//   y > 0: đẩy lên,  y < 0: đẩy xuống
//   x > 0: đẩy phải, x < 0: đẩy trái
// Đẩy càng mạnh thì số càng lớn -> xe chạy càng nhanh.
void driveMecanum() {
  // Bước 1: mất kết nối hoặc mất tín hiệu -> dừng xe, không làm gì thêm.
  if (!Car.isConnected() || Car.isFailsafe()) {
    Car.stop();
    return;
  }

  // Bước 2: đang giữ nút quẹo -> xoay tại chỗ (ưu tiên hơn joystick).
  int turnSpeed = Car.config().turnSpeed;   // tốc độ xoay, chỉnh trên web (mặc định 50)

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
    Car.forward(y);          // tiến thẳng, tốc độ = y
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
}
