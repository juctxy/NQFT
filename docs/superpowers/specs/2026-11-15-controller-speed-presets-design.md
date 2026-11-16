# Controller Speed Presets and Simultaneous Touch

## Intent

Let a driver change speed without leaving the controller and keep joystick movement active while tapping one other control.

## Current behavior and constraints

- Settings defines three configurable PWM values, shown as `State 1: CHẬM`, `State 2: VỪA`, and `State 3: NHANH`; defaults are 130, 190, and 255.
- Applying a preset sets both motor speeds to the same value.
- The controller keeps independent M1 and M2 sliders in a compact 780x360 landscape layout.
- Preset values live in `ControllerContext` and reset on app restart.
- The joystick uses `PanResponder`, claims touch immediately, and refuses responder termination; this prevents a sibling button from responding while the joystick is held.
- Function/action controls and speed controls currently use React Native `Pressable`.
- No motor or function commands are sent to the ESP32 because its GATT protocol is unknown.

## Approaches

- **Yield the current responder:** small change, but a second tap would cancel the joystick gesture instead of running alongside it; this does not meet the simultaneous-control goal.
- **Gesture Handler simultaneous gestures (selected):** use native pan/tap gestures for the joystick and secondary controls, and add the root setup required for Gesture Handler. This supports the requested cross-platform touch interaction with less custom touch bookkeeping; it adds an explicit SDK-compatible dependency and changes gesture handling.
- **Track raw touch IDs in `onTouch*` handlers:** avoids an added direct dependency, but duplicates low-level gesture bookkeeping and is more fragile across iOS and Android.

## Proposed behavior

- Keep the joystick active while the user taps one other function/action control or uses the speed selector. Two non-joystick controls do not need to be held simultaneously.
- Selecting a speed preset applies its configured value to both motors. Manual M1/M2 sliders remain independent.
- The selector chip shows `CHẬM`, `VỪA`, or `NHANH` when both motors uniquely match a preset; otherwise it shows `TÙY CHỈNH`.
- The in-tree choices show `Chậm`, `Vừa`, and `Nhanh` with their current values. They do not include the `State 1/2/3` prefix used in Settings.
- Choices expose accessible labels and a visible selected state. No native modal is added.
- Preset values remain in memory. This change does not add BLE commands or make physical robot movement simultaneous.

## Constraints

- Target Expo SDK 58 / React Native 0.88 on iOS and Android, with iOS as priority.
- Add Gesture Handler as a direct dependency at the version compatible with the project's Expo SDK, using Expo's package installer.
- Put gesture recognizers under `GestureHandlerRootView`; do not edit generated native projects by hand.

## Approval

The revised design was approved on 2026-11-15, with the controller labels `Chậm`, `Vừa`, and `Nhanh` and no `State 1/2/3` prefix.
