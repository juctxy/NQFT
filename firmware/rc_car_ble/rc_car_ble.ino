/*
 * RC Car — BLE firmware (giai đoạn kết nối)
 *
 * Yêu cầu:
 *   - Board core: esp32 by Espressif Systems v3.x
 *   - Thư viện:   NimBLE-Arduino (h2zero) v2.x
 *
 * Giao thức: xem docs/protocol.md
 *
 * Phần cứng xe chưa thiết kế: applyOutputs() hiện chỉ in lệnh ra Serial.
 */

#include <Arduino.h>
#include <NimBLEDevice.h>
#include <atomic>
#include "config.h"

// ---------- Trạng thái dùng chung giữa task BLE và loop() ----------
// Gói CONTROL 4 byte được ghép thành 1 số 32-bit để đọc/ghi nguyên tử.
static std::atomic<uint32_t> g_lastPacket{0};
static std::atomic<uint32_t> g_lastPacketMs{0};
static std::atomic<bool>     g_hasPacket{false};
static std::atomic<bool>     g_connected{false};

static NimBLECharacteristic* g_telemetryChar = nullptr;
static char g_deviceName[20];

// ---------- Lệnh điều khiển ----------
struct ControlCommand {
  uint8_t seq;
  int8_t  throttle;  // -100..100
  int8_t  steering;  // -100..100
  uint8_t flags;
};

static const ControlCommand STOP_COMMAND = {0, 0, 0, 0};

static int8_t clamp100(int8_t v) {
  if (v > 100) return 100;
  if (v < -100) return -100;
  return v;
}

static uint32_t packBytes(const uint8_t* d) {
  return (uint32_t)d[0] | ((uint32_t)d[1] << 8) | ((uint32_t)d[2] << 16) | ((uint32_t)d[3] << 24);
}

static ControlCommand unpackCommand(uint32_t p) {
  ControlCommand c;
  c.seq      = (uint8_t)(p & 0xFF);
  c.throttle = clamp100((int8_t)((p >> 8) & 0xFF));
  c.steering = clamp100((int8_t)((p >> 16) & 0xFF));
  c.flags    = (uint8_t)((p >> 24) & 0xFF);
  return c;
}

// ---------- Đầu ra phần cứng (TODO khi có thiết kế xe) ----------
static ControlCommand g_logged = STOP_COMMAND;  // lệnh in ra Serial gần nhất
static uint32_t g_lastLogMs = 0;

// ---------- Nút (bitmask trong flags) ----------
static const char* const BUTTON_NAMES[BUTTON_COUNT] = {"F1", "F2", "F3", "F4", "CAN", "SUT"};
static uint8_t g_buttons = 0;  // trạng thái nút ở lần xử lý trước (để phát hiện vừa nhấn / vừa thả)

// Ghi tên các nút có bit = 1 vào buf, ví dụ "CAN+F1"; không có nút -> "-".
static const char* buttonList(uint8_t mask, char* buf, size_t len) {
  size_t n = 0;
  buf[0] = '\0';
  for (uint8_t i = 0; i < BUTTON_COUNT; i++) {
    if (!(mask & (1u << i))) continue;
    n += snprintf(buf + n, n < len ? len - n : 0, "%s%s", n ? "+" : "", BUTTON_NAMES[i]);
  }
  return n ? buf : "-";
}

// Gọi một lần khi nút vừa được nhấn (sườn lên). Dùng cho hành động chạy 1 lần như SÚT.
static void onButtonPressed(uint8_t bit) {
  // TODO: kích hoạt cơ cấu theo nút, ví dụ BTN_KICK -> đẩy cần sút 1 lần.
  (void)bit;
}

// Gọi một lần khi nút vừa được thả (sườn xuống).
static void onButtonReleased(uint8_t bit) {
  // TODO: ví dụ BTN_BLOCK -> thu cần cản về.
  (void)bit;
}

static void updateButtons(uint8_t mask) {
  mask &= BUTTON_MASK;
  uint8_t pressed  = mask & ~g_buttons;  // 0 -> 1
  uint8_t released = g_buttons & ~mask;  // 1 -> 0
  if (pressed || released) {
    char a[32], b[32];
    Serial.printf("[BTN] down=%s up=%s\n", pressed ? buttonList(pressed, a, sizeof a) : "-",
                  released ? buttonList(released, b, sizeof b) : "-");
  }
  for (uint8_t i = 0; i < BUTTON_COUNT; i++) {
    uint8_t bit = 1u << i;
    if (pressed & bit) onButtonPressed(bit);
    if (released & bit) onButtonReleased(bit);
  }
  g_buttons = mask;
}

static void logCommand(const ControlCommand& cmd) {
  bool changed = cmd.throttle != g_logged.throttle ||
                 cmd.steering != g_logged.steering ||
                 cmd.flags    != g_logged.flags;
  uint32_t now = millis();
  if (changed && now - g_lastLogMs >= LOG_INTERVAL_MS) {
    char names[32];
    Serial.printf("[CMD] seq=%3u thr=%4d steer=%4d flags=0x%02X btn=%s\n",
                  cmd.seq, cmd.throttle, cmd.steering, cmd.flags,
                  buttonList(cmd.flags & BUTTON_MASK, names, sizeof names));
    g_lastLogMs = now;
    g_logged = cmd;
  }
}

static void applyOutputs(const ControlCommand& cmd) {
  // TODO: điều khiển động cơ / servo theo cmd.throttle, cmd.steering tại đây.
  // Nút đang giữ: kiểm tra (cmd.flags & BTN_xxx); sự kiện nhấn/thả xử lý trong updateButtons().
  updateButtons(cmd.flags);
  logCommand(cmd);
}

static void stopOutputs(const char* reason) {
  // TODO: tắt động cơ, servo về giữa ngay lập tức.
  Serial.printf("[SAFE] Stop: %s\n", reason);
  updateButtons(0);  // failsafe = thả mọi nút
  g_logged = STOP_COMMAND;
}

// ---------- Pin ----------
static uint16_t readBatteryMv() {
#if BATTERY_ADC_PIN >= 0
  uint32_t adcMv = analogReadMilliVolts(BATTERY_ADC_PIN);
  return (uint16_t)(adcMv * BATTERY_DIVIDER_RATIO);
#else
  return 0;
#endif
}

// ---------- Callback BLE ----------
class ServerCallbacks : public NimBLEServerCallbacks {
  void onConnect(NimBLEServer* server, NimBLEConnInfo& info) override {
    g_connected = true;
    g_hasPacket = false;
    Serial.printf("[BLE] Connected: %s\n", info.getAddress().toString().c_str());
    server->updateConnParams(info.getConnHandle(),
                             CONN_MIN_INTERVAL, CONN_MAX_INTERVAL,
                             CONN_LATENCY, CONN_TIMEOUT);
  }

  void onDisconnect(NimBLEServer* server, NimBLEConnInfo& info, int reason) override {
    g_connected = false;
    g_hasPacket = false;
    Serial.printf("[BLE] Disconnected (reason=%d), advertising again\n", reason);
    NimBLEDevice::startAdvertising();
  }
};

class ControlCallbacks : public NimBLECharacteristicCallbacks {
  void onWrite(NimBLECharacteristic* chr, NimBLEConnInfo& info) override {
    NimBLEAttValue v = chr->getValue();
    if (v.length() < CONTROL_PACKET_LEN) return;  // gói không hợp lệ
    g_lastPacket   = packBytes(v.data());
    g_lastPacketMs = millis();
    g_hasPacket    = true;
  }
};

// ---------- Khởi tạo BLE ----------
static void setupBle() {
  uint64_t mac = ESP.getEfuseMac();
  snprintf(g_deviceName, sizeof(g_deviceName), "%s%04X",
           DEVICE_NAME_PREFIX, (unsigned)((mac >> 32) & 0xFFFF));

  NimBLEDevice::init(g_deviceName);

  NimBLEServer* server = NimBLEDevice::createServer();
  server->setCallbacks(new ServerCallbacks());

  NimBLEService* service = server->createService(SERVICE_UUID);

  NimBLECharacteristic* control = service->createCharacteristic(
      CONTROL_CHAR_UUID, NIMBLE_PROPERTY::WRITE_NR | NIMBLE_PROPERTY::WRITE);
  control->setCallbacks(new ControlCallbacks());

  g_telemetryChar = service->createCharacteristic(
      TELEMETRY_CHAR_UUID, NIMBLE_PROPERTY::NOTIFY | NIMBLE_PROPERTY::READ);
  uint8_t zero[TELEMETRY_PACKET_LEN] = {0};
  g_telemetryChar->setValue(zero, sizeof(zero));

  service->start();

  // UUID 128-bit (18 byte) + tên không vừa 31 byte của gói quảng bá
  // -> UUID ở advertising data, tên ở scan response.
  NimBLEAdvertisementData advData;
  advData.setFlags(BLE_HS_ADV_F_DISC_GEN | BLE_HS_ADV_F_BREDR_UNSUP);
  advData.addServiceUUID(NimBLEUUID(SERVICE_UUID));

  NimBLEAdvertisementData scanData;
  scanData.setName(g_deviceName);

  NimBLEAdvertising* adv = NimBLEDevice::getAdvertising();
  adv->setAdvertisementData(advData);
  adv->setScanResponseData(scanData);
  adv->start();

  Serial.printf("[BLE] Advertising as %s (protocol v%d)\n", g_deviceName, PROTOCOL_VERSION);
}

// ---------- Telemetry ----------
static uint32_t g_lastTelemetryMs = 0;

static void sendTelemetry(bool failsafeActive, uint8_t lastSeq) {
  uint16_t mv = readBatteryMv();
  uint8_t buf[TELEMETRY_PACKET_LEN] = {
      (uint8_t)(mv & 0xFF),
      (uint8_t)(mv >> 8),
      (uint8_t)(failsafeActive ? 0x01 : 0x00),
      lastSeq,
  };
  g_telemetryChar->setValue(buf, sizeof(buf));
  g_telemetryChar->notify();
}

// ---------- Arduino ----------
void setup() {
  Serial.begin(115200);
  delay(200);
  Serial.println();
  Serial.println("=== RC Car BLE ===");
  stopOutputs("boot");
  setupBle();
}

void loop() {
  static bool failsafeActive = true;
  static bool wasConnected = false;
  uint32_t now = millis();

  bool connected = g_connected;
  if (wasConnected && !connected) {
    stopOutputs("disconnected");
    failsafeActive = true;
  }
  wasConnected = connected;

  ControlCommand cmd = unpackCommand(g_lastPacket);

  if (connected && g_hasPacket) {
    uint32_t lastMs = g_lastPacketMs;
    // lastMs có thể mới hơn `now` nếu gói đến ngay sau khi đọc millis()
    uint32_t elapsed = (int32_t)(now - lastMs) > 0 ? now - lastMs : 0;
    bool timedOut = elapsed > FAILSAFE_TIMEOUT_MS;
    if (timedOut && !failsafeActive) {
      stopOutputs("command timeout");
      failsafeActive = true;
    } else if (!timedOut) {
      if (failsafeActive) Serial.println("[SAFE] Commands resumed");
      failsafeActive = false;
      applyOutputs(cmd);
    }
  } else if (connected && !failsafeActive) {
    failsafeActive = true;
  }

  if (connected && now - g_lastTelemetryMs >= TELEMETRY_INTERVAL_MS) {
    g_lastTelemetryMs = now;
    sendTelemetry(failsafeActive, cmd.seq);
  }

  delay(5);
}
