# BLE Device Connection Design

## Intent

Replace the controller's placeholder Bluetooth toggle with a real BLE scan and connection flow for the ESP32 robot, targeting iOS first while supporting Android.

## Goals and non-goals

- Open a device picker from the controller, scan nearby BLE peripherals, connect to a selected device, display connection state, and allow disconnecting or scanning again.
- Show actionable permission, Bluetooth-state, scan, and connection errors; stop scans and remove native event listeners when the picker closes or the screen unmounts.
- Do not transmit joystick, motor, or action commands yet. That requires the robot's GATT service/characteristic UUIDs and wire protocol, which are not present in the repository.
- Do not add background scanning, automatic reconnection, or saved-device behavior.

## Approaches

- **`react-native-ble-manager` 13.0.1 (recommended):** its current documentation supports React Native 0.76+ on the New Architecture, iOS 15.1+, and Android API 23+, and the package ships an Expo config plugin. This is the best evidence for the project's Expo 58 / React Native 0.88.1 stack.
- **`react-native-ble-plx` 3.5.1:** supports BLE scan/connect, but its README reports testing only through Expo 51 and its package metadata lists React Native 0.77 for development; exact compatibility evidence is weaker.
- A custom Expo native module would add unnecessary native maintenance for standard BLE central scanning and connection.

Use `react-native-ble-manager`. Add its config plugin and permission rationale through `app.json`; keep generated native directories untouched. Build a development client for actual BLE access; Expo Go is not sufficient. The library's stated React Native minimum is met, but an Expo 58 / RN 0.88 native build is still required to verify the exact combination.

## Implementation outline

Keep BLE scanning and connection state in the app layer and pass the necessary state/actions to the controller UI. The Bluetooth button opens a picker that scans for a bounded interval, lists discovered peripherals, and connects to the selected device. The connected state shows the peripheral name and provides a disconnect action. Errors remain visible in the picker rather than appearing as a successful connection.

## Validation

Run the existing tests and TypeScript check, then build a development client. Real scanning and connection require a physical iPhone or Android phone and the powered-on ESP32; simulator-only verification can cover the picker UI but not the radio connection.
