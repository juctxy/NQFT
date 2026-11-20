# BLE Drive Protocol (Proposed)

This is the phone application's proposed contract for compatible ESP32 firmware. No firmware source is present in this repository, so the UUIDs and packet behavior below have not been verified against a physical car.

The web build uses Web Bluetooth with the same GATT UUIDs and frames as the native app. It requires a secure context and a user gesture to open the browser's device chooser. The separate `quanhuy38/NQFT` reference firmware uses a different 4-byte control protocol and does not implement PWM outputs, so it is not compatible with this contract.

## GATT

| Attribute | UUID | Required properties |
| --- | --- | --- |
| Service | `4e514654-0001-4e51-4654-000000000001` | Primary service |
| Command characteristic | `4e514654-0001-4e51-4654-000000000002` | Write and Write Without Response |
| Response characteristic | `4e514654-0001-4e51-4654-000000000003` | Notify |

The app writes configuration with response and sends control, level, stop, and motor-test frames without response. The default ATT payload can be smaller than a configuration frame. Firmware must treat characteristic writes as a byte stream, buffer fragments, and parse complete frames by their declared length; it must not assume one GATT write equals one frame.

## Frame

All multibyte integers are little-endian. A frame is:

| Offset | Size | Meaning |
| ---: | ---: | --- |
| 0 | 2 | Magic bytes `A5 5A` |
| 2 | 1 | Protocol version, currently `01` |
| 3 | 1 | Packet type |
| 4 | 2 | Sequence number |
| 6 | 2 | Payload length in bytes |
| 8 | variable | Payload |
| 8 + length | 2 | CRC-16/CCITT, low byte first |

CRC-16/CCITT uses initial value `FFFF` and polynomial `1021`. Calculate it over version through the final payload byte, excluding the magic and CRC. Reject unknown versions, incomplete/oversized frames, invalid lengths, or CRC failures.

Sequence numbers increment modulo 65536. ACKs echo the request sequence.

## App-to-car packets

| Type | Payload | Meaning |
| ---: | --- | --- |
| `02` | `x:int16`, `y:int16`, `rotate:int8` | Continuous joystick/rotation input. `x` and `y` are signed thousandths in `[-1000,1000]`; positive x is right and positive y is forward. `rotate` is `-1`, `0`, or `+1` (left, neutral, right). App sends at 40 ms intervals while input is active. |
| `04` | empty | Stop all motors immediately. |
| `05` | `wheel:uint8`, `pwm:uint8` | Low-speed motor test. Wheel indices: `0 FL`, `1 FR`, `2 RL`, `3 RR`; PWM is `0..50`; PWM zero cancels the test for that wheel. |
| `10` | 32-byte configuration | Apply configuration in RAM. |
| `11` | 32-byte configuration | Apply configuration and save it to non-volatile memory. |
| `12` | `level:uint8` | Select speed level: `0 Chậm`, `1 Vừa`, `2 Nhanh`. |

Configuration payload (`10` and `11`):

| Payload offset | Size | Meaning |
| ---: | ---: | --- |
| 0 | 1 | Wheel type: `0 Standard`, `1 Omni`, `2 Mecanum` |
| 1 | 1 | Minimum PWM |
| 2 | 1 | Global maximum PWM |
| 3 | 2 | Soft acceleration duration in milliseconds (`0..400`) |
| 5 | 1 | Custom matrix flag (`0` default, `1` user-edited) |
| 6 | 9 | Three levels in order `Chậm`, `Vừa`, `Nhanh`; each is `V_fwd`, `V_side`, `V_turn` (one unsigned byte each) |
| 15 | 12 | Matrix signs in order `Forward`, `Sideways`, `Turn`; each row is `FL`, `FR`, `RL`, `RR` (signed byte `-1`, `0`, `+1`) |
| 27 | 4 | Per-wheel compensation percentages in `FL`, `FR`, `RL`, `RR` order (`80..100`) |
| 31 | 1 | Invert bitmask: bits 0..3 correspond to `FL`, `FR`, `RL`, `RR` |

The phone stores profile names and profile selection locally; they are not part of this payload. The firmware should validate every field, including `minPWM <= maxLimit`, before applying any part of a configuration.

## Car-to-app notifications

| Type | Payload | Meaning |
| ---: | --- | --- |
| `80` | `requestType:uint8`, `status:uint8` | ACK for a configuration request. Status `0` means accepted (and persisted for type `11`); nonzero means rejected. The sequence matches the request. |
| `81` | `batteryMillivolts:uint16` | Battery voltage in millivolts. |

The settings screen reports “Đã đồng bộ” only after a matching successful ACK. The current app times out ACK waits after 1500 ms and provides a retry action.

## Firmware safety and control-loop requirements

These are firmware responsibilities and are not implemented or hardware-verified by this app:

- Run the motor mixer every 10 ms. For Standard, use joystick x for turn-in-place and ignore lateral translation. For Omni/Mecanum, use x for sideways translation and the rotate buttons for rotation.
- Apply slew limiting to axis velocities before wheel mixing, with the configured ramp-up and a short fixed ramp-down. Do not slew each wheel independently.
- Apply the selected level's speeds, matrix signs, compensation, one global ceiling, then the minimum-PWM deadzone and motor inversion. Compensation must only reduce output.
- Stop all motors if no valid control frame arrives for 300–500 ms, and stop immediately for type `04`.
- Treat malformed frames, invalid configuration, disconnects, and incomplete frame buffers safely. A type `11` success ACK must only be sent after non-volatile persistence succeeds.
