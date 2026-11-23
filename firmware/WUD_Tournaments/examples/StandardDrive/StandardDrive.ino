// StandardDrive — xe 4 bánh thường (2 module L298N), lái bằng joystick trên web.
//   Đẩy joystick LÊN / XUỐNG  = tiến / lùi
//   Đẩy joystick PHẢI / TRÁI  = xoay phải / xoay trái tại chỗ
//   Đẩy chéo                  = vừa chạy vừa rẽ
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

#include <WUD_Tournaments.h>

// Joystick lệch khỏi giữa ít hơn mức này thì coi như chưa đẩy (tránh xe tự bò).
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

  Car.begin();   // LED tự chớp. Car.begin(0) = không in dữ liệu nhận ra Serial.
}

// Lái xe theo joystick.
// Car.x(), Car.y() nằm trong khoảng -100..100:
//   y > 0: đẩy lên,  y < 0: đẩy xuống
//   x > 0: đẩy phải, x < 0: đẩy trái
// Đẩy càng mạnh thì số càng lớn -> xe chạy càng nhanh.
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
    Car.forward(y);          // tiến thẳng, tốc độ = y
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
}
