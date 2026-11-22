#pragma once
// WUD_Tournaments — điều khiển xe RC ESP32 qua BLE từ web gamepad NQFT.
//
// Yêu cầu: board "esp32 by Espressif Systems" v3.x, thư viện NimBLE-Arduino v2.x.
// Dùng object có sẵn `Car`:
//
//   void setup() { Car.setName("AA11"); Car.wheelFL(32, 33, 25); ...; Car.begin(); }
//   void loop()  { Car.update(); Car.driveFromRemote(); }

#include "WUD_Protocol.h"
#include "drivers/WUD_MotorDriver.h"
#include "drivers/WUD_L298N.h"
#include "WUD_Wheel.h"
#include "WUD_Button.h"
#include "WUD_Car.h"
