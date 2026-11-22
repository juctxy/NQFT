#include "WUD_Car.h"
#include <NimBLEDevice.h>
#include <Preferences.h>
#include <stdarg.h>
#include "drivers/WUD_L298N.h"

WUD_Car Car;

namespace {

constexpr uint32_t FAILSAFE_TIMEOUT_MS   = 500;
constexpr uint32_t TELEMETRY_INTERVAL_MS = 500;
constexpr uint32_t LOG_INTERVAL_MS       = 200;  // giới hạn tần suất log [CMD]
constexpr uint32_t LED_SLOW_MS           = 500;  // chờ kết nối
constexpr uint32_t LED_FAST_MS           = 100;  // failsafe

// Thông số kết nối (đơn vị 1.25 ms; timeout đơn vị 10 ms).
constexpr uint16_t CONN_MIN_INTERVAL = 6;    // 7.5 ms
constexpr uint16_t CONN_MAX_INTERVAL = 12;   // 15 ms
constexpr uint16_t CONN_LATENCY      = 0;
constexpr uint16_t CONN_TIMEOUT      = 200;  // 2 s

constexpr const char* PREFS_NS  = "wud";
constexpr const char* PREFS_KEY = "cfg";

constexpr WUD_Config DEFAULT_CONFIG = {{100, 100, 100, 100}, 0, 0, 50};

const char* const BUTTON_NAMES[8] = {"FUNC1", "FUNC2",    "SQUARE",    "CIRCLE",
                                     "TRIANGLE", "CROSS", "TURN_LEFT", "TURN_RIGHT"};
const char* const STOP_REASONS[3] = {"boot", "command timeout", "disconnected"};

portMUX_TYPE g_cfgMux = portMUX_INITIALIZER_UNLOCKED;

int clamp100(int v) { return v > 100 ? 100 : (v < -100 ? -100 : v); }

// Ví dụ mask 0x30 -> "TRIANGLE+CROSS"; 0 -> "-".
const char* buttonList(uint8_t mask, char* buf, size_t len) {
  size_t n = 0;
  buf[0] = '\0';
  for (uint8_t i = 0; i < 8; i++) {
    if (!(mask & (1u << i))) continue;
    n += snprintf(buf + n, n < len ? len - n : 0, "%s%s", n ? "+" : "", BUTTON_NAMES[i]);
  }
  return n ? buf : "-";
}

void encodeConfig(const WUD_Config& c, uint8_t* out) {
  out[0] = WUD_CONFIG_VERSION;
  for (int i = 0; i < 4; i++) out[1 + i] = c.trim[i];
  out[5] = c.minPwm;
  out[6] = c.invertMask;
  out[7] = c.turnSpeed;
}

bool decodeConfig(const uint8_t* in, WUD_Config& c) {
  if (in[0] != WUD_CONFIG_VERSION) return false;
  for (int i = 0; i < 4; i++) c.trim[i] = in[1 + i] > 100 ? 100 : in[1 + i];
  c.minPwm = in[5];
  c.invertMask = in[6] & 0x0F;
  c.turnSpeed = in[7] > 100 ? 100 : in[7];
  return true;
}

class ServerCallbacks : public NimBLEServerCallbacks {
public:
  explicit ServerCallbacks(WUD_Car* car) : _car(car) {}
  void onConnect(NimBLEServer* server, NimBLEConnInfo& info) override {
    _car->_bleConnected(true);
    server->updateConnParams(info.getConnHandle(), CONN_MIN_INTERVAL, CONN_MAX_INTERVAL,
                             CONN_LATENCY, CONN_TIMEOUT);
  }
  void onDisconnect(NimBLEServer*, NimBLEConnInfo&, int) override {
    _car->_bleConnected(false);
    NimBLEDevice::startAdvertising();
  }

private:
  WUD_Car* _car;
};

class ControlCallbacks : public NimBLECharacteristicCallbacks {
public:
  explicit ControlCallbacks(WUD_Car* car) : _car(car) {}
  void onWrite(NimBLECharacteristic* chr, NimBLEConnInfo&) override {
    NimBLEAttValue v = chr->getValue();
    _car->_bleControl(v.data(), v.length());
  }

private:
  WUD_Car* _car;
};

class ConfigCallbacks : public NimBLECharacteristicCallbacks {
public:
  explicit ConfigCallbacks(WUD_Car* car) : _car(car) {}
  void onWrite(NimBLECharacteristic* chr, NimBLEConnInfo&) override {
    NimBLEAttValue v = chr->getValue();
    _car->_bleConfig(v.data(), v.length());
  }

private:
  WUD_Car* _car;
};

}  // namespace

// ============================================================================

WUD_Car::WUD_Car()
    : FUNC1(WUD_BIT_FUNC1, "FUNC1", &_sig.flags, &_pressedEdges, &_releasedEdges),
      FUNC2(WUD_BIT_FUNC2, "FUNC2", &_sig.flags, &_pressedEdges, &_releasedEdges),
      TRIANGLE(WUD_BIT_TRIANGLE, "TRIANGLE", &_sig.flags, &_pressedEdges, &_releasedEdges),
      CROSS(WUD_BIT_CROSS, "CROSS", &_sig.flags, &_pressedEdges, &_releasedEdges),
      CIRCLE(WUD_BIT_CIRCLE, "CIRCLE", &_sig.flags, &_pressedEdges, &_releasedEdges),
      SQUARE(WUD_BIT_SQUARE, "SQUARE", &_sig.flags, &_pressedEdges, &_releasedEdges),
      TURN_LEFT(WUD_BIT_TURN_LEFT, "TURN_LEFT", &_sig.flags, &_pressedEdges, &_releasedEdges),
      TURN_RIGHT(WUD_BIT_TURN_RIGHT, "TURN_RIGHT", &_sig.flags, &_pressedEdges, &_releasedEdges),
      _log(&Serial),
      _cfg(DEFAULT_CONFIG) {}

void WUD_Car::logf(const char* fmt, ...) {
  if (!_log) return;
  char buf[128];
  va_list ap;
  va_start(ap, fmt);
  vsnprintf(buf, sizeof(buf), fmt, ap);
  va_end(ap);
  _log->print(buf);
}

// ----------------------------------------------------------------------------
// 1. Tên + kết nối

bool WUD_Car::setName(const char* code) {
  if (_begun) {
    logf("[BLE] setName() phai goi truoc begin()\n");
    return false;
  }
  if (!code || strlen(code) != 4) {
    logf("[BLE] Ten '%s' khong hop le: can 2 chu + 2 so, vi du AA11\n", code ? code : "");
    return false;
  }
  char c[4];
  for (int i = 0; i < 4; i++) c[i] = code[i];
  for (int i = 0; i < 2; i++) {
    if (c[i] >= 'a' && c[i] <= 'z') c[i] -= 'a' - 'A';
    if (c[i] < 'A' || c[i] > 'Z') {
      logf("[BLE] Ten '%s' khong hop le: 2 ky tu dau phai la chu A-Z\n", code);
      return false;
    }
  }
  for (int i = 2; i < 4; i++) {
    if (c[i] < '0' || c[i] > '9') {
      logf("[BLE] Ten '%s' khong hop le: 2 ky tu cuoi phai la so 0-9\n", code);
      return false;
    }
  }
  snprintf(_name, sizeof(_name), "%s%c%c%c%c", WUD_DEVICE_NAME_PREFIX, c[0], c[1], c[2], c[3]);
  return true;
}

bool WUD_Car::begin(int ledPin) {
  if (_begun) return true;

  _ledPin = ledPin;
  if (_ledPin >= 0) {
    pinMode(_ledPin, OUTPUT);
    digitalWrite(_ledPin, LOW);
  }

  loadConfig();
  applyConfig();
  enterFailsafe(WUD_StopReason::Boot);

  if (_name[0] == '\0') {
    uint64_t mac = ESP.getEfuseMac();
    snprintf(_name, sizeof(_name), "%s%04X", WUD_DEVICE_NAME_PREFIX,
             (unsigned)((mac >> 32) & 0xFFFF));
  }

  if (!NimBLEDevice::init(_name)) {
    logf("[BLE] Khong khoi dong duoc BLE\n");
    return false;
  }

  NimBLEServer* server = NimBLEDevice::createServer();
  server->setCallbacks(new ServerCallbacks(this));
  NimBLEService* service = server->createService(WUD_SERVICE_UUID);

  NimBLECharacteristic* control = service->createCharacteristic(
      WUD_CONTROL_CHAR_UUID, NIMBLE_PROPERTY::WRITE_NR | NIMBLE_PROPERTY::WRITE);
  control->setCallbacks(new ControlCallbacks(this));

  _telemetryChar = service->createCharacteristic(
      WUD_TELEMETRY_CHAR_UUID, NIMBLE_PROPERTY::NOTIFY | NIMBLE_PROPERTY::READ);
  uint8_t zero[WUD_TELEMETRY_PACKET_LEN] = {0};
  _telemetryChar->setValue(zero, sizeof(zero));

  _configChar = service->createCharacteristic(
      WUD_CONFIG_CHAR_UUID, NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::WRITE);
  _configChar->setCallbacks(new ConfigCallbacks(this));
  uint8_t cfg[WUD_CONFIG_PACKET_LEN];
  encodeConfig(_cfg, cfg);
  _configChar->setValue(cfg, sizeof(cfg));
  // NimBLE 2.x tự bật service khi server chạy, không cần service->start().

  // UUID 128-bit (18 byte) + tên không vừa 31 byte của gói quảng bá
  // -> UUID ở advertising data, tên ở scan response.
  NimBLEAdvertisementData advData;
  advData.setFlags(BLE_HS_ADV_F_DISC_GEN | BLE_HS_ADV_F_BREDR_UNSUP);
  advData.addServiceUUID(NimBLEUUID(WUD_SERVICE_UUID));
  NimBLEAdvertisementData scanData;
  scanData.setName(_name);

  NimBLEAdvertising* adv = NimBLEDevice::getAdvertising();
  adv->setAdvertisementData(advData);
  adv->setScanResponseData(scanData);
  adv->start();

  _begun = true;
  logf("[BLE] Dang phat song: %s (protocol v%d). Cho ket noi...\n", _name, WUD_PROTOCOL_VERSION);
  return true;
}

// ----------------------------------------------------------------------------
// Task BLE (chỉ ghi biến atomic / vùng đệm có khoá, không xử lý gì thêm)

void WUD_Car::_bleConnected(bool on) {
  _hasPacket = false;
  _connectedRaw = on;
}

void WUD_Car::_bleControl(const uint8_t* d, size_t len) {
  if (len < WUD_CONTROL_PACKET_LEN) return;  // gói không hợp lệ
  _packet = (uint32_t)d[0] | ((uint32_t)d[1] << 8) | ((uint32_t)d[2] << 16) | ((uint32_t)d[3] << 24);
  _packetMs = millis();
  _hasPacket = true;
}

void WUD_Car::_bleConfig(const uint8_t* d, size_t len) {
  if (len < WUD_CONFIG_PACKET_LEN) return;
  portENTER_CRITICAL(&g_cfgMux);
  memcpy(_cfgPending, d, WUD_CONFIG_PACKET_LEN);
  _cfgHasPending = true;
  portEXIT_CRITICAL(&g_cfgMux);
}

// ----------------------------------------------------------------------------
// 2. Đọc tín hiệu

void WUD_Car::update() {
  uint32_t now = millis();
  _changed = false;
  _pressedEdges = 0;
  _releasedEdges = 0;

  bool conn = _connectedRaw;
  if (conn && !_connected) {
    _connected = true;
    logf("[BLE] Da ket noi: %s\n", _name);
    if (_onConnect) _onConnect();
  } else if (!conn && _connected) {
    _connected = false;
    enterFailsafe(WUD_StopReason::Disconnect);
    logf("[BLE] Mat ket noi, dang phat song lai\n");
    if (_onDisconnect) _onDisconnect();
  }

  processConfig();

  if (_connected && _hasPacket) {
    uint32_t lastMs = _packetMs;
    // lastMs có thể mới hơn `now` nếu gói đến ngay sau khi đọc millis()
    uint32_t elapsed = (int32_t)(now - lastMs) > 0 ? now - lastMs : 0;
    if (elapsed > FAILSAFE_TIMEOUT_MS) {
      if (!_failsafe) enterFailsafe(WUD_StopReason::Timeout);
    } else {
      if (_failsafe) {
        _failsafe = false;
        logf("[SAFE] Nhan lenh tro lai\n");
      }
      uint32_t p = _packet;
      WUD_Signal s;
      s.seq = (uint8_t)(p & 0xFF);
      s.y = (int8_t)clamp100((int8_t)((p >> 8) & 0xFF));
      s.x = (int8_t)clamp100((int8_t)((p >> 16) & 0xFF));
      s.flags = (uint8_t)((p >> 24) & 0xFF);
      applySignal(s);
    }
  } else if (_connected && !_failsafe) {
    enterFailsafe(WUD_StopReason::Timeout);
  }

  if (_connected && now - _lastTelemetryMs >= TELEMETRY_INTERVAL_MS) {
    _lastTelemetryMs = now;
    sendTelemetry(now);
  }
  updateLed(now);
}

// So với tín hiệu trước: chỉ báo thay đổi khi x, y hoặc nút khác đi (seq không tính).
void WUD_Car::applySignal(const WUD_Signal& s) {
  uint8_t oldFlags = _sig.flags;
  bool changed = s.x != _sig.x || s.y != _sig.y || s.flags != oldFlags;
  _sig = s;
  if (!changed) return;

  _pressedEdges = s.flags & ~oldFlags;   // 0 -> 1
  _releasedEdges = oldFlags & ~s.flags;  // 1 -> 0
  _changed = true;

  char a[64], b[64];
  if (_pressedEdges || _releasedEdges) {
    logf("[BTN] nhan=%s tha=%s\n", buttonList(_pressedEdges, a, sizeof a),
         buttonList(_releasedEdges, b, sizeof b));
  }
  uint32_t now = millis();
  if (now - _lastLogMs >= LOG_INTERVAL_MS) {
    _lastLogMs = now;
    logf("[CMD] seq=%3u x=%4d y=%4d btn=%s\n", s.seq, s.x, s.y, buttonList(s.flags, a, sizeof a));
  }
  if (_onChange) _onChange();
}

// Dừng an toàn: thả mọi nút, x = y = 0, dừng 4 bánh.
void WUD_Car::enterFailsafe(WUD_StopReason reason) {
  _failsafe = true;
  bool changed = _sig.x != 0 || _sig.y != 0 || _sig.flags != 0;
  _releasedEdges |= _sig.flags;
  _sig.x = 0;
  _sig.y = 0;
  _sig.flags = 0;
  stop();
  logf("[SAFE] Dung xe: %s\n", STOP_REASONS[(uint8_t)reason]);
  if (changed) {
    _changed = true;
    if (_onChange) _onChange();
  }
}

// ----------------------------------------------------------------------------
// 4. Bánh xe

WUD_Wheel& WUD_Car::attachL298N(WUD_WheelId id, int in1, int in2, int en, bool reverse) {
  _wheels[id].attach(new WUD_L298N(in1, in2, en), reverse, true);
  return _wheels[id];
}

WUD_Wheel& WUD_Car::attachDriver(WUD_WheelId id, WUD_MotorDriver& driver, bool reverse) {
  _wheels[id].attach(&driver, reverse, false);
  return _wheels[id];
}

WUD_Wheel& WUD_Car::wheelFL(int a, int b, int en, bool r) { return attachL298N(WUD_FL, a, b, en, r); }
WUD_Wheel& WUD_Car::wheelFR(int a, int b, int en, bool r) { return attachL298N(WUD_FR, a, b, en, r); }
WUD_Wheel& WUD_Car::wheelBL(int a, int b, int en, bool r) { return attachL298N(WUD_BL, a, b, en, r); }
WUD_Wheel& WUD_Car::wheelBR(int a, int b, int en, bool r) { return attachL298N(WUD_BR, a, b, en, r); }

WUD_Wheel& WUD_Car::wheelFL(WUD_MotorDriver& d, bool r) { return attachDriver(WUD_FL, d, r); }
WUD_Wheel& WUD_Car::wheelFR(WUD_MotorDriver& d, bool r) { return attachDriver(WUD_FR, d, r); }
WUD_Wheel& WUD_Car::wheelBL(WUD_MotorDriver& d, bool r) { return attachDriver(WUD_BL, d, r); }
WUD_Wheel& WUD_Car::wheelBR(WUD_MotorDriver& d, bool r) { return attachDriver(WUD_BR, d, r); }

// ----------------------------------------------------------------------------
// 5. Chạy xe

void WUD_Car::drive(int x, int y, int turn) {
  x = clamp100(x);
  y = clamp100(y);
  turn = clamp100(turn);

  int fl, fr, bl, br;
  if (_type == WUD_STD) {
    // Xe 2 bên: Ox là rẽ, cộng với xoay.
    int left = y + x + turn;
    int right = y - x - turn;
    fl = bl = left;
    fr = br = right;
  } else {
    // MECANUM (OMNI tạm thời dùng chung công thức này).
    fl = y + x + turn;
    fr = y - x - turn;
    bl = y - x + turn;
    br = y + x - turn;
  }

  // Tổng vượt 100 -> chia đều cả 4 bánh để giữ đúng hướng đi.
  int peak = max(max(abs(fl), abs(fr)), max(abs(bl), abs(br)));
  if (peak > 100) {
    fl = fl * 100 / peak;
    fr = fr * 100 / peak;
    bl = bl * 100 / peak;
    br = br * 100 / peak;
  }

  _wheels[WUD_FL].setSpeed(fl);
  _wheels[WUD_FR].setSpeed(fr);
  _wheels[WUD_BL].setSpeed(bl);
  _wheels[WUD_BR].setSpeed(br);
}

void WUD_Car::driveFromRemote() {
  if (!_connected || _failsafe) {
    stop();
    return;
  }
  int turn = 0;
  if (_sig.flags & WUD_BIT_TURN_RIGHT) turn += _cfg.turnSpeed;
  if (_sig.flags & WUD_BIT_TURN_LEFT) turn -= _cfg.turnSpeed;
  drive(_sig.x, _sig.y, turn);
}

void WUD_Car::forward(int speed) { drive(0, abs(speed), 0); }
void WUD_Car::backward(int speed) { drive(0, -abs(speed), 0); }
void WUD_Car::turnLeft(int speed) { drive(0, 0, -abs(speed)); }
void WUD_Car::turnRight(int speed) { drive(0, 0, abs(speed)); }

bool WUD_Car::goLeft(int speed) {
  if (_type == WUD_STD) {
    if (!_warnedStrafe) logf("[DRIVE] goLeft/goRight chi dung cho WUD_MECANUM/WUD_OMNI\n");
    _warnedStrafe = true;
    return false;
  }
  drive(-abs(speed), 0, 0);
  return true;
}

bool WUD_Car::goRight(int speed) {
  if (_type == WUD_STD) {
    if (!_warnedStrafe) logf("[DRIVE] goLeft/goRight chi dung cho WUD_MECANUM/WUD_OMNI\n");
    _warnedStrafe = true;
    return false;
  }
  drive(abs(speed), 0, 0);
  return true;
}

void WUD_Car::stop() {
  for (auto& w : _wheels) w.stop();
}

// ----------------------------------------------------------------------------
// 6. Ô CONFIG

void WUD_Car::processConfig() {
  uint8_t raw[WUD_CONFIG_PACKET_LEN];
  bool has;
  portENTER_CRITICAL(&g_cfgMux);
  has = _cfgHasPending;
  if (has) memcpy(raw, _cfgPending, sizeof(raw));
  _cfgHasPending = false;
  portEXIT_CRITICAL(&g_cfgMux);
  if (!has) return;

  WUD_Config c;
  if (!decodeConfig(raw, c)) {
    logf("[CFG] Bo qua: phien ban cau hinh %u khong ho tro\n", raw[0]);
    return;
  }
  _cfg = c;
  applyConfig();
  saveConfig();
  uint8_t out[WUD_CONFIG_PACKET_LEN];
  encodeConfig(_cfg, out);
  if (_configChar) _configChar->setValue(out, sizeof(out));
  logf("[CFG] trim FL=%u FR=%u BL=%u BR=%u minPwm=%u dao=0x%X xoay=%u\n", _cfg.trim[0],
       _cfg.trim[1], _cfg.trim[2], _cfg.trim[3], _cfg.minPwm, _cfg.invertMask, _cfg.turnSpeed);
  if (_onConfigChange) _onConfigChange();
}

void WUD_Car::applyConfig() {
  for (int i = 0; i < 4; i++) {
    _wheels[i].configure(_cfg.trim[i], _cfg.minPwm, (_cfg.invertMask >> i) & 1);
  }
}

void WUD_Car::loadConfig() {
  Preferences prefs;
  if (!prefs.begin(PREFS_NS, true)) return;  // chưa có gì trong flash
  uint8_t raw[WUD_CONFIG_PACKET_LEN];
  if (prefs.getBytes(PREFS_KEY, raw, sizeof(raw)) == sizeof(raw)) decodeConfig(raw, _cfg);
  prefs.end();
}

void WUD_Car::saveConfig() {
  Preferences prefs;
  if (!prefs.begin(PREFS_NS, false)) return;
  uint8_t raw[WUD_CONFIG_PACKET_LEN];
  encodeConfig(_cfg, raw);
  prefs.putBytes(PREFS_KEY, raw, sizeof(raw));
  prefs.end();
}

// ----------------------------------------------------------------------------
// Telemetry, LED, pin

uint16_t WUD_Car::readBatteryMv() {
  if (_batPin < 0) return 0;
  return (uint16_t)(analogReadMilliVolts(_batPin) * _batRatio);
}

void WUD_Car::sendTelemetry(uint32_t) {
  if (!_telemetryChar) return;
  uint16_t mv = readBatteryMv();
  uint8_t buf[WUD_TELEMETRY_PACKET_LEN] = {
      (uint8_t)(mv & 0xFF),
      (uint8_t)(mv >> 8),
      (uint8_t)(_failsafe ? WUD_TELEMETRY_FAILSAFE : 0),
      _sig.seq,
  };
  _telemetryChar->setValue(buf, sizeof(buf));
  _telemetryChar->notify();
}

void WUD_Car::updateLed(uint32_t now) {
  if (_ledPin < 0) return;
  bool on;
  if (!_connected) on = (now / LED_SLOW_MS) % 2;  // chờ kết nối
  else if (_failsafe) on = (now / LED_FAST_MS) % 2;  // đã kết nối nhưng chưa có lệnh
  else on = true;                                     // đang điều khiển
  digitalWrite(_ledPin, on ? HIGH : LOW);
}
