#pragma once
#include <Arduino.h>
#include <atomic>
#include <functional>
#include "WUD_Protocol.h"
#include "WUD_Button.h"
#include "WUD_Wheel.h"

#if defined(LED_BUILTIN)
#define WUD_DEFAULT_LED LED_BUILTIN
#else
#define WUD_DEFAULT_LED -1
#endif

class NimBLECharacteristic;

// Loại xe.
//   WUD_STD     : xe 2 bên (bánh thường). Trục Ox của joystick = rẽ.
//   WUD_MECANUM : Ox = đi ngang, nút TURN_LEFT/TURN_RIGHT = xoay tại chỗ.
//   WUD_OMNI    : TẠM THỜI GIỐNG HỆT WUD_MECANUM (cùng công thức trộn, kiểu lắp chữ X).
//                 Chưa hỗ trợ riêng kiểu lắp chữ + hay 3 bánh.
enum WUD_DriveType : uint8_t { WUD_STD = 0, WUD_MECANUM = 1, WUD_OMNI = 2 };

enum WUD_WheelId : uint8_t { WUD_FL = 0, WUD_FR = 1, WUD_BL = 2, WUD_BR = 3 };

enum class WUD_StopReason : uint8_t { Boot, Timeout, Disconnect };

// Toàn bộ tín hiệu của gói lệnh gần nhất.
struct WUD_Signal {
  uint8_t seq;    // số thứ tự gói 0..255
  int8_t x;       // trục Ox -100..100, dương = sang phải
  int8_t y;       // trục Oy -100..100, dương = hướng lên (tiến)
  uint8_t flags;  // các nút đang giữ, xem WUD_BIT_*
};

// Thông số nhận qua ô CONFIG (UI sẽ chỉnh sau), lưu trong flash.
struct WUD_Config {
  uint8_t trim[4];     // bù công suất FL, FR, BL, BR: 0..100 %
  uint8_t minPwm;      // PWM tối thiểu khi bánh đang quay: 0..255
  uint8_t invertMask;  // đảo chiều: bit 0..3 = FL, FR, BL, BR
  uint8_t turnSpeed;   // tốc độ xoay khi giữ nút quẹo: 0..100 %
};

class WUD_Car {
public:
  using Callback = std::function<void()>;

  WUD_Car();

  // ===== 1. Tên Bluetooth + kết nối =====

  // code = 2 chữ cái + 2 chữ số, ví dụ "AA11" -> "RC-Car-AA11". Gọi trước begin().
  // Sai định dạng -> trả false, giữ tên mặc định (4 ký tự hex từ MAC).
  bool setName(const char* code);

  // Bật BLE và phát sóng. LED: nháy chậm = chờ kết nối, sáng = đã kết nối,
  // nháy nhanh = failsafe. ledPin = -1 để không dùng LED.
  // Mặc định LED_BUILTIN nếu board có định nghĩa; "ESP32 Dev Module" không có -> nên truyền 2.
  bool begin(int ledPin = WUD_DEFAULT_LED);

  const char* name() const { return _name; }
  bool isConnected() const { return _connected; }
  bool isFailsafe() const { return _failsafe; }

  void onConnect(Callback cb) { _onConnect = cb; }
  void onDisconnect(Callback cb) { _onDisconnect = cb; }

  // ===== 2. Đọc tín hiệu =====

  // Gọi ở đầu mỗi vòng loop(). Không dùng delay() dài trong loop().
  void update();

  // true nếu lần update() vừa rồi tín hiệu (x, y, nút) khác lần trước.
  bool hasChanged() const { return _changed; }
  void onChange(Callback cb) { _onChange = cb; }

  WUD_Signal signal() const { return _sig; }
  int8_t x() const { return _sig.x; }
  int8_t y() const { return _sig.y; }
  uint8_t buttons() const { return _sig.flags; }

  // ===== 3. Nút =====
  WUD_Button FUNC1, FUNC2;                           // 2 nút giữa
  WUD_Button TRIANGLE, CROSS, CIRCLE, SQUARE;        // cụm 4 nút bên phải
  WUD_Button TURN_LEFT, TURN_RIGHT;                  // quẹo (UI chỉ hiện khi MECANUM/OMNI)

  // ===== 4. Bánh xe =====

  // Driver L298N: in1, in2 = chân chiều quay; en = chân PWM (-1 nếu cắm jumper ENA/ENB).
  // reverse = true nếu bánh quay ngược khi chạy tiến.
  WUD_Wheel& wheelFL(int in1, int in2, int en, bool reverse = false);
  WUD_Wheel& wheelFR(int in1, int in2, int en, bool reverse = false);
  WUD_Wheel& wheelBL(int in1, int in2, int en, bool reverse = false);
  WUD_Wheel& wheelBR(int in1, int in2, int en, bool reverse = false);

  // Driver khác (tự viết, kế thừa WUD_MotorDriver). driver phải tồn tại suốt chương trình.
  WUD_Wheel& wheelFL(WUD_MotorDriver& driver, bool reverse = false);
  WUD_Wheel& wheelFR(WUD_MotorDriver& driver, bool reverse = false);
  WUD_Wheel& wheelBL(WUD_MotorDriver& driver, bool reverse = false);
  WUD_Wheel& wheelBR(WUD_MotorDriver& driver, bool reverse = false);

  WUD_Wheel& wheel(WUD_WheelId id) { return _wheels[id]; }

  // ===== 5. Chạy xe (dùng 4 bánh đã khai báo) =====

  void setDriveType(WUD_DriveType type) { _type = type; }
  WUD_DriveType driveType() const { return _type; }

  // x = Ox (MECANUM/OMNI: đi ngang; STD: rẽ), y = Oy (tiến/lùi), turn = xoay (dương = phải).
  // Mỗi giá trị -100..100.
  void drive(int x, int y, int turn);

  // Lái theo tay cầm: x, y từ joystick, xoay từ nút TURN_LEFT/TURN_RIGHT.
  // Tự dừng khi mất kết nối hoặc failsafe.
  void driveFromRemote();

  void forward(int speed = 100);
  void backward(int speed = 100);
  void turnLeft(int speed = 100);    // xoay tại chỗ
  void turnRight(int speed = 100);
  bool goLeft(int speed = 100);      // chỉ MECANUM/OMNI; STD -> false, không chạy
  bool goRight(int speed = 100);
  void stop();

  // ===== 6. Thông số từ UI (ô CONFIG) =====
  const WUD_Config& config() const { return _cfg; }
  void onConfigChange(Callback cb) { _onConfigChange = cb; }

  // ===== Khác =====
  // Đo pin qua cầu phân áp. ratio = (R1 + R2) / R2.
  void setBatteryPin(int pin, float ratio) { _batPin = pin; _batRatio = ratio; }
  // Nơi in log. Mặc định Serial; nullptr = tắt log.
  void setLog(Print* out) { _log = out; }

  // ----- Nội bộ: gọi từ task BLE, người dùng không gọi -----
  void _bleConnected(bool on);
  void _bleControl(const uint8_t* data, size_t len);
  void _bleConfig(const uint8_t* data, size_t len);

private:
  WUD_Wheel& attachL298N(WUD_WheelId id, int in1, int in2, int en, bool reverse);
  WUD_Wheel& attachDriver(WUD_WheelId id, WUD_MotorDriver& driver, bool reverse);
  void applySignal(const WUD_Signal& s);
  void enterFailsafe(WUD_StopReason reason);
  void processConfig();
  void applyConfig();
  void loadConfig();
  void saveConfig();
  void sendTelemetry(uint32_t now);
  void updateLed(uint32_t now);
  uint16_t readBatteryMv();
  void logf(const char* fmt, ...);

  // Trạng thái dùng chung giữa task BLE và loop().
  std::atomic<uint32_t> _packet{0};
  std::atomic<uint32_t> _packetMs{0};
  std::atomic<bool> _hasPacket{false};
  std::atomic<bool> _connectedRaw{false};
  uint8_t _cfgPending[WUD_CONFIG_PACKET_LEN] = {0};
  bool _cfgHasPending = false;

  // Trạng thái trong loop().
  WUD_Signal _sig = {0, 0, 0, 0};
  uint8_t _pressedEdges = 0;
  uint8_t _releasedEdges = 0;
  bool _changed = false;
  bool _connected = false;
  bool _failsafe = true;
  bool _begun = false;

  char _name[20] = {0};
  int _ledPin = -1;
  int _batPin = -1;
  float _batRatio = 1.0f;
  Print* _log;
  uint32_t _lastLogMs = 0;
  uint32_t _lastTelemetryMs = 0;
  bool _warnedStrafe = false;

  WUD_DriveType _type = WUD_STD;
  WUD_Wheel _wheels[4];
  WUD_Config _cfg;

  NimBLECharacteristic* _telemetryChar = nullptr;
  NimBLECharacteristic* _configChar = nullptr;

  Callback _onConnect, _onDisconnect, _onChange, _onConfigChange;
};

extern WUD_Car Car;
