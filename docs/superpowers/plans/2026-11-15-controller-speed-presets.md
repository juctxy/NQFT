# Controller Speed Presets and Simultaneous Touch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a driver select a speed preset in Vietnamese from the controller and keep joystick movement active while tapping one other control.

**Architecture:** Keep preset values and motor speeds in `ControllerContext`; add a compact `SpeedPresetSelector` to the existing PWM slider group. Use React Native Gesture Handler to replace the joystick's exclusive `PanResponder` and allow its pan gesture to run simultaneously with taps on function/action and speed controls.

**Tech Stack:** Expo SDK 58, React Native 0.88, React Native Gesture Handler `~3.3.0`, TypeScript, existing Node test runner.

**Spec:** [2026-11-15-controller-speed-presets-design.md](../specs/2026-11-15-controller-speed-presets-design.md)

## Global Constraints

- Preset defaults remain `slow: 130`, `medium: 190`, and `fast: 255`.
- Selecting a preset sets both motor speeds to the same configured value.
- Controller labels are `Chậm`, `Vừa`, and `Nhanh`; the chip shows `CHẬM`, `VỪA`, `NHANH`, or `TÙY CHỈNH`.
- The independent M1 and M2 sliders remain available.
- Keep joystick movement active while tapping one function/action control or using the speed selector; simultaneous taps on two non-joystick controls are out of scope.
- Use the Expo SDK 58-compatible Gesture Handler version (`~3.3.0`) and wrap the app in `GestureHandlerRootView`.
- Preset values remain in memory and reset on app restart.
- The selector does not send BLE commands; the ESP32 GATT protocol is still unknown.
- Keep the controller usable in its `780x360` landscape layout.
- Render the choices in-tree; do not use a native modal.

## Review Focus

- Unequal M1/M2 values show `TÙY CHỈNH`; pin with the `getMatchingSpeedPreset` unequal-speed test in Task 1.
- A unique preset matching both motors shows its correct Vietnamese label; pin with the matching-preset test in Task 1.
- Duplicate preset values do not arbitrarily claim a selected mode; pin with the duplicate-value test in Task 1.
- Editing preset values in Settings changes matching against the current values; pin with the updated-preset-values test in Task 1.
- The popover remains tappable and unclipped in landscape, with an accessible selected choice; verify manually in Task 2 on an iPhone.
- The joystick remains active while a second finger taps a function/action or speed control, then returns to `STOP` when released; verify manually in Task 3 on an iPhone.

---

### Task 1: Share and test speed-preset matching

**Files:**
- Modify: `controller.ts`
- Modify: `components/SettingsScreen.tsx`
- Modify: `context/ControllerContext.tsx`
- Test: `controller.test.mjs`

**Interfaces:**
- Produces `SpeedPresets`, with `slow`, `medium`, and `fast` numeric fields, from `controller.ts`.
- Produces `getMatchingSpeedPreset(motor1Speed: number, motor2Speed: number, presets: SpeedPresets): keyof SpeedPresets | null`.
- Returns a preset key only when both motor speeds equal exactly one preset value; returns `null` for unequal speeds, no match, or duplicate matching values.

- [x] **Step 1: Write failing tests** in `controller.test.mjs` for a unique matching preset, unequal motor speeds, no matching value, duplicate preset values, and a changed preset value.
- [x] **Step 2: Run the focused tests** with `node --experimental-strip-types --test controller.test.mjs`; confirm they fail because the helper is not implemented.
- [x] **Step 3: Move the `SpeedPresets` type** from `SettingsScreen.tsx` to `controller.ts`, update the Settings and context type imports, then implement `getMatchingSpeedPreset`.
- [x] **Step 4: Run `node --experimental-strip-types --test controller.test.mjs` and `npm test`;** all tests should pass.
- [x] **Step 5: Commit** the helper, type move, and tests as one focused commit.

### Task 2: Add the controller speed selector

**Files:**
- Create: `components/SpeedPresetSelector.tsx`
- Modify: `App.tsx`
- Modify: `components/ControllerScreen.tsx`
- Modify: `README.md`

**Interfaces:**
- `SpeedPresetSelector` receives `presets: SpeedPresets`, `motor1Speed: number`, `motor2Speed: number`, and `onSelectSpeed: (value: number) => void`.
- `ControllerScreen` receives the current presets and the existing `applyPreset` callback from `App.tsx`.
- Selecting an option calls `onSelectSpeed(presets[key])` and closes the popover.

- [ ] **Step 1: Add a compact `SpeedPresetSelector`** with a chip showing `CHẬM`, `VỪA`, `NHANH`, or `TÙY CHỈNH`; the in-tree popover shows `Chậm`, `Vừa`, and `Nhanh` with current values, accessible labels, and a visible selected state.
- [ ] **Step 2: Wire the selector** from `App.tsx` through `ControllerScreen` to `useController().presets` and `applyPreset`.
- [ ] **Step 3: Place it at the end of the existing slider group** without widening the `820` px top bar; reduce `motorSlider` width from `120` to `104` px to make room for an `88` px chip. Keep each slider independently operable.
- [ ] **Step 4: Verify selector behavior manually** on an iPhone in landscape: the default `VỪA` choice sets both readouts to `190`; selecting `Chậm`/`Nhanh` updates both; changing either motor slider shows `TÙY CHỈNH`; tapping the chip and a choice closes the popover.
- [ ] **Step 5: Update the README** to mention quick speed selection on the controller and retain Settings as the place to edit preset values.
- [ ] **Step 6: Run `npm test`, `npx tsc --noEmit`, and `npx expo config --type public`;** all should pass.
- [ ] **Step 7: Commit** the selector, wiring, documentation, and verification-ready tests as one focused commit.

### Task 3: Enable simultaneous joystick and button input

**Files:**
- Modify: `package.json` and `package-lock.json` via Expo's installer
- Modify: `app/_layout.tsx`
- Modify: `components/ControllerScreen.tsx`
- Modify: `components/SpeedPresetSelector.tsx`
- Modify: `README.md`

**Interfaces:**
- Create the joystick pan gesture in `ControllerScreen` with `usePanGesture` and pass that `PanGesture` to `Joystick`, `FunctionButton`, `ActionButton`, and `SpeedPresetSelector`.
- Use Gesture Handler `Pressable`'s `simultaneousWith` relation for the function/action and speed-selector taps.
- Wrap the application navigator in `GestureHandlerRootView` so all these gestures share a Gesture Handler root.

- [ ] **Step 1: Add the Expo-compatible Gesture Handler dependency** by running `npx expo install react-native-gesture-handler`; Expo SDK 58 should resolve `~3.3.0`.
- [ ] **Step 2: Wrap the existing root layout** in `app/_layout.tsx` with `GestureHandlerRootView`, preserving the existing safe-area and controller providers.
- [ ] **Step 3: Replace `Joystick`'s `PanResponder`** with `usePanGesture` and `GestureDetector`, preserving direction mapping and the stop/reset behavior on release.
- [ ] **Step 4: Make the intended secondary taps simultaneous** by using Gesture Handler `Pressable` with `simultaneousWith={joystickGesture}` for function/action buttons and speed-selector controls.
- [ ] **Step 5: Verify manually on an iPhone in landscape:** hold the joystick, tap a function/action control and confirm the joystick remains active; repeat while opening and selecting a speed. Confirm the speed updates both readouts and releasing the joystick returns to `STOP`.
- [ ] **Step 6: Run `npm test`, `npx tsc --noEmit`, `npx expo config --type public`, and `npx expo install --check`;** tests, typecheck, Expo config, and dependency compatibility should pass.
- [ ] **Step 7: Update the README** to explain simultaneous touch input and retain the note that robot commands are not sent over BLE.
- [ ] **Step 8: Commit** the simultaneous gesture changes, dependency, documentation, and verification-ready tests as one focused commit.
