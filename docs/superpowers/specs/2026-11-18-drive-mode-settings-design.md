# Drive Mode Settings and Saved Profiles

## Intent

Let users configure drive behavior for standard, omni, and mecanum wheel setups and quickly save or restore three configurations on the phone.

## Current behavior and constraints

- Settings currently edits three speed values (130, 190, 255 by default). The controller uses these values to set both M1 and M2.
- The controller also has independent M1/M2 sliders.
- BLE currently scans, connects, and disconnects only. No movement/configuration writes or ESP32 firmware are present.
- The app targets Expo SDK 58 and React Native 0.88.

## Approaches

- **Add drive controls alongside the existing speed presets:** preserves all behavior but duplicates the three speed tiers beside three new profiles and makes settings harder to understand.
- **Replace editable speed presets with saved drive profiles (selected):** each of three profiles contains the full drive configuration; the controller's existing quick selector loads a profile and sets both motor sliders to its `V_main`. This keeps one coherent set of quick choices while retaining manual M1/M2 control.
- **Add BLE packet delivery now:** cannot be completed reliably because the repository has no write path, GATT service/characteristic IDs, or firmware contract.

## Proposed behavior

- Settings offers Standard, Omni, and Mecanum modes; `V_main`, `V_side`, and `V_sub` integer sliders from 0–255; trim from -30 to +30; and soft-start from 0–400 ms.
- Three profile slots (Preset 1–3) load the full configuration or save the current configuration to that slot.
- The existing controller quick selector loads the chosen profile and sets M1/M2 to its `V_main`; its manual M1/M2 sliders remain independent.
- Persist the current configuration and all profiles on the phone. On first launch, seed Standard-mode profiles with `V_main` / `V_side` of 130, 190, and 255; `V_sub` 90; trim 0; and soft-start 0. Reset restores these defaults.
- Validate loaded and edited values against their ranges.
- These values are local settings only in this scope. They do not send CFG/control packets, alter motor output, or provide soft-start until a compatible ESP32 firmware and BLE GATT contract are added.

## Constraints and calls left to the builder

- Keep the change in the existing settings/controller/context structure and use an Expo-SDK-compatible local persistence package.
- Keep the current M1/M2 controls and Bluetooth connection UI.
- No migration of old preset edits is needed beyond seeding the three initial profiles from the existing 130/190/255 defaults; local data is new.
