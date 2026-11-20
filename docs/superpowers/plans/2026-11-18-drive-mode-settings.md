# Drive Mode Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add locally persisted Standard/Omni/Mecanum drive configurations with three editable profiles, while preserving manual M1/M2 control.

**Architecture:** Define typed, range-checked drive configuration and profile defaults in `controller.ts`. Keep configuration and saved profiles in `ControllerContext`, persisted locally; update Settings to edit/load/save them and connect the existing quick selector to profile loading.

**Tech Stack:** Expo SDK 58, React Native 0.88, TypeScript, `@react-native-community/slider`, Expo-compatible AsyncStorage, Node test runner.

**Spec:** `docs/superpowers/specs/2026-11-18-drive-mode-settings-design.md`

## Global Constraints

- Target Expo SDK 58 / React Native 0.88 on iOS and Android.
- Keep current M1/M2 controls and Bluetooth connection UI.
- No BLE packets, motor output, or firmware changes.
- Keep drive values in their specified ranges: PWM 0–255, trim -30–30, soft-start 0–400 ms.
- Use an Expo-SDK-compatible local persistence package and surface persistence errors rather than silently discarding them.
- Persist slider changes on release, not for every drag update; mode/profile/reset actions persist immediately.

## Review Focus

- Malformed or out-of-range persisted data must fall back to safe defaults; test normalization of partial and invalid config/profile records in Task 1.
- Slider/text values at and beyond each boundary must remain valid; test PWM, trim, and ramp limits in Task 1.
- Saving a profile must capture a snapshot and loading it must restore every field; test save/load profile behavior in Task 1.
- Async hydration must not overwrite edits made before stored values are loaded; test the state/hydration path in Task 2.
- Loading a profile must update the drive settings and both M1/M2 speeds to its `V_main`, while manual M1/M2 edits remain independent; test profile setpoint mapping in Task 3.
- Slider drags must not enqueue repeated local writes; test draft-versus-commit persistence revisions in Task 3.

---

### Task 1: Define drive settings and profile model

**Files:**
- Modify: `controller.ts`
- Test: `controller.test.mjs`

**Interfaces:**
- Produce `DriveMode = 'standard' | 'omni' | 'mecanum'`, `DriveConfig` (`mode`, `vMain`, `vSide`, `vSub`, `trim`, `softStartMs`), `DriveProfileId = 'preset1' | 'preset2' | 'preset3'`, and `DriveProfiles = Record<DriveProfileId, DriveConfig>`.
- Produce typed default config/profile values, `normalizeDriveConfig(value: unknown): DriveConfig`, and `normalizeDriveProfiles(value: unknown): DriveProfiles`.
- Produce a pure `DriveSettingsState` / action reducer that ignores edits until storage hydration finishes and snapshots profile values on save.
- Defaults: Standard mode; profile main/side speeds 130, 190, 255; all `vSub` 90, trim 0, soft-start 0.

- [ ] **Step 1: Write failing tests** for normalization of valid, partial, malformed, and out-of-range config/profile values; assert exact clamped defaults and ensure normalization does not mutate input. Test that pre-hydration edits are ignored and profile saving captures a snapshot.
- [ ] **Step 2: Run** `npm test` and verify the new normalization tests fail before implementation.
- [ ] **Step 3: Implement** the types, defaults, and normalization helpers in `controller.ts`, using integer clamping for PWM/trim and 0–400 ms ramp.
- [ ] **Step 4: Run** `npm test`; expect all controller and Bluetooth tests to pass.

### Task 2: Persist active settings and profile operations

**Files:**
- Modify: `package.json`, `package-lock.json`
- Modify: `tsconfig.json`
- Modify: `context/ControllerContext.tsx`
- Create: `context/driveSettingsStorage.ts`
- Test: `controller.test.mjs`

**Interfaces:**
- Consume Task 1's `DriveConfig`, `DriveProfiles`, defaults, and normalization functions.
- Expose context values `driveConfig`, `driveProfiles`, `changeDriveConfig(key, value)`, `saveDriveProfile(id)`, `loadDriveProfile(id)`, and `resetDriveSettings()`.
- Also expose `driveSettingsReady` and `driveSettingsError`; edits and profile loads are disabled until hydration completes, and storage read/write errors are shown in Settings.
- Preserve existing `motor1Speed`, `motor2Speed`, and manual setters; loading a profile sets both motor speeds to its `vMain`.

- [ ] **Step 1: Write failing tests** for the storage helper's default load, normalized round trip, and propagated read/write errors; run `npm test` and verify the missing helper causes the expected failures.
- [ ] **Step 2: Implement** the small storage adapter with injected `getItem`/`setItem` methods, then run `npm test` and verify the tests pass.
- [ ] **Step 3: Add** an Expo-SDK-compatible AsyncStorage dependency using the Expo package installer.
- [ ] **Step 4: Enable** TypeScript imports ending in `.ts` so the Node strip-types tests can load the typed storage helper and Expo's no-emit typecheck can validate it.
- [ ] **Step 5: Implement** context persistence and hydration using the Task 1 reducer. Gate Settings edits/profile loading until hydration completes, so early interaction cannot overwrite stored settings; keep the error visible in Settings after read/write failures.
- [ ] **Step 6: Run** `npm test` and `npx tsc --noEmit`; expect both to pass.

### Task 3: Build settings UI and connect profile selection

**Files:**
- Modify: `components/SettingsScreen.tsx`
- Modify: `app/settings.tsx`
- Modify: `components/SpeedPresetSelector.tsx`
- Modify: `components/ControllerScreen.tsx`
- Modify: `App.tsx`
- Modify: `components/InstructionsScreen.tsx`
- Modify: `README.md`

**Interfaces:**
- Consume Task 2's active config/profile state and operations.
- Settings exposes mode choices, five labeled numeric sliders/values, save/load actions for Preset 1–3, reset, hydration readiness, and any storage error.
- The controller's existing selector loads the selected profile; M1/M2 manual controls remain unchanged.

- [ ] **Step 1: Update** the settings component props and route to edit mode, `vMain`/`vSide`/`vSub`, trim, and soft-start; add accessible labels/current values, profile load/save actions, loading guards, and visible storage errors.
- [ ] **Step 2: Write failing tests** for mapping a selected profile's `vMain` to both M1/M2 speeds and for draft-versus-commit persistence revisions; run them to verify the helpers/actions are missing, then implement and use them in the context.
- [ ] **Step 3: Update** the quick selector to list Preset 1–3 with each profile's `vMain`, and load the selected profile through the context.
- [ ] **Step 4: Update** instructions and README to describe the saved drive profiles and clearly state that ESP32 commands are not transmitted yet.
- [ ] **Step 5: Run** `npm test`, `npx tsc --noEmit`, and `npm run lint`; document existing lint blockers rather than fixing unrelated code.
