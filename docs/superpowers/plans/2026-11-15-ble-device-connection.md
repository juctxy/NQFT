# BLE Device Connection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the controller's placeholder Bluetooth flag with a real BLE scanner and connect/disconnect flow for the ESP32 robot.

**Architecture:** `useBluetoothConnection` owns native BLE setup, permission requests, scan results, and connection state. A focused `BluetoothPicker` modal presents discovered devices; `App.tsx` wires the hook to `ControllerScreen`.

**Tech Stack:** Expo SDK 58, React Native 0.88.1, `react-native-ble-manager` 13.0.1, TypeScript, Node's built-in test runner.

**Spec:** [2026-11-15-ble-device-connection-design.md](../specs/2026-11-15-ble-device-connection-design.md)

## Global Constraints

- Use `react-native-ble-manager` 13.0.1; its documented minimum is React Native 0.76+ with the New Architecture.
- Support iOS 15.1+ and Android API 23+; iOS is the priority platform.
- Real BLE access requires an Expo development build; Expo Go is not sufficient.
- Configure native permissions through the package's Expo config plugin and `app.json`; do not hand-edit generated `ios/` or `android/` directories.
- This increment implements discovery and connection only; do not write motor, joystick, or action commands without the ESP32 GATT UUIDs and protocol.

## Review Focus

- **Android API 23–30 vs. 31+:** request location only on older Android and BLE scan/connect permissions on newer Android; test the permission selection helper at API 30 and 31.
- **Repeated advertisements:** update the existing peripheral by ID instead of duplicating it; test a repeated ID with updated RSSI.
- **Missing advertised name:** display a stable “Unnamed BLE device” fallback while retaining the peripheral ID; test the fallback formatting.
- **Permission denied or Bluetooth unavailable:** do not report scanning/connection success; keep a user-visible error in the picker and verify on device.
- **Connect failure or remote disconnect:** clear the connected state and show the failure/disconnect state; verify with a powered-off or out-of-range ESP32.

---

### Task 1: Configure BLE dependency and pure device helpers

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `app.json`
- Create: `bluetooth.ts`
- Create: `bluetooth.test.mjs`

**Interfaces:**
- Produces `NearbyDevice` with `id: string`, optional `name: string`, and `rssi: number`.
- Produces `mergeNearbyDevice(devices: NearbyDevice[], incoming: NearbyDevice): NearbyDevice[]`, preserving one entry per ID and updating existing scan data.
- Produces `nearbyDeviceName(device: NearbyDevice): string`, returning a non-empty advertised name or `Unnamed BLE device`.
- Produces `getAndroidBlePermissions(version: number): Permission[]`: API 23–30 returns `ACCESS_FINE_LOCATION`; API 31+ returns `BLUETOOTH_SCAN` and `BLUETOOTH_CONNECT`.

- [x] **Step 1: Write failing tests** for updating a repeated peripheral without duplicating it, preserving a known name when a later advertisement omits it, using the unnamed-device fallback, and choosing Android permissions at API 30 and 31.
- [x] **Step 2: Run `node --experimental-strip-types --test bluetooth.test.mjs`** and confirm the tests fail because the helpers do not exist.
- [x] **Step 3: Implement the three helpers** in `bluetooth.ts` with no native side effects.
- [x] **Step 4: Add `react-native-ble-manager@13.0.1`** using Expo's installer and add its config plugin in `app.json`, with an iOS Bluetooth usage message and Android `neverForLocation: true` (the app does not derive location from scan results).
- [x] **Step 5: Re-run the focused tests** and confirm they pass.

### Task 2: Implement the native BLE connection hook

**Files:**
- Create: `hooks/useBluetoothConnection.ts`
- Modify: `bluetooth.ts`

**Interfaces:**
- Produces `useBluetoothConnection()` with `devices`, `connectedDevice`, `isScanning`, `isConnecting`, `error`, `scan()`, `stopScan()`, `connect(device)`, and `disconnect()`.
- Consumes `NearbyDevice`, `mergeNearbyDevice`, and `getAndroidBlePermissions` from Task 1.
- Produces `BluetoothConnectionState`, `BluetoothAction`, `initialBluetoothConnectionState`, and `bluetoothConnectionReducer(state, action)` in `bluetooth.ts`; the hook uses this reducer so connection transitions can be tested without native Bluetooth.

- [x] **Step 1: Write failing reducer tests** for scan start clearing stale results, connection failure leaving no device connected, and a remote disconnect clearing only the matching connected peripheral.
- [x] **Step 2: Run `node --experimental-strip-types --test bluetooth.test.mjs`** and confirm the new reducer tests fail before the reducer exists.
- [x] **Step 3: Implement the typed reducer and hook** using `BleManager.start`, the library's discovery/stop/disconnect events, bounded scans, Android runtime permissions, and explicit error state for unavailable Bluetooth, permission denial, scan failure, and connection failure.
- [x] **Step 4: Ensure cleanup** stops any active scan and removes every event subscription on unmount; closing the picker will stop scanning without disconnecting an already-connected robot.
- [x] **Step 5: Run `npx tsc --noEmit` and `npm test`**; fix any compile or regression failures before adding UI.

### Task 3: Add the picker UI and replace the dummy toggle

**Files:**
- Create: `components/BluetoothPicker.tsx`
- Modify: `App.tsx`
- Modify: `components/ControllerScreen.tsx`
- Modify: `README.md`
- Modify: `package.json`

**Interfaces:**
- `BluetoothPicker` receives `visible`, `devices`, `isScanning`, `isConnecting`, `connectedDevice`, and `error`, plus close/scan/connect/disconnect callbacks.
- `App.tsx` owns `useBluetoothConnection()` and passes its state/actions through `ControllerScreen`.
- `ControllerScreen` opens the picker to scan or manage a connection, showing the connected device name and disconnect action when connected.
- `npm test` runs both the existing controller tests and `bluetooth.test.mjs`.

- [x] **Step 1: Build the picker** with scan progress, nearby peripheral list, a stable unnamed-device label, connect progress, visible errors, rescan, and close controls.
- [x] **Step 2: Wire the controller button** to open the picker for scanning or connection management, and reflect connection events (including remote disconnects) instead of toggling a local boolean.
- [x] **Step 3: Update the README** to remove the statement that Bluetooth only simulates UI state and explain the development-build/physical-device requirement and command-control limitation.
- [x] **Step 4: Run `node --experimental-strip-types --test bluetooth.test.mjs`, `npm test`, `npx tsc --noEmit`, and `npx expo config --type prebuild`**; confirm tests/typecheck pass and the BLE config plugin resolves.
- [ ] **Step 5: Verify on physical iPhone and Android device** with the ESP32 powered on: scan, connect, disconnect, deny permissions, test a failed connection, and test a remote disconnect. Native hardware verification is required before claiming end-to-end BLE compatibility.
