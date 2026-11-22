# Main and Settings UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Simplify tournament operation with a three-state main speed control and focused Settings tabs.

**Architecture:** Replace the existing dropdown component with a horizontal state button group and split the oversized Settings screen into speed, wheel/direction, motor, and test-drive tabs. Keep drive state and profile persistence in ControllerContext unchanged.

**Tech Stack:** React 19, TypeScript, Vite, existing Pressable/rn UI helpers.

**Spec:** Approved UI split in the 2026-11-22 conversation:
- Main: STATE 1 / STATE 2 / STATE 3 button group; active state is orange.
- Settings: no Hồ sơ tab.
- Settings tabs: Tốc độ, Hướng & bánh, Động cơ, Chạy thử.

## Global Constraints

- Map STATE 1 to `slow`, STATE 2 to `medium`, and STATE 3 to `fast`.
- Preserve active level and profile behavior for existing saved localStorage settings.
- Tournament users must not need to change or manage wheel profiles.
- Unsupported firmware operations must remain visibly unsupported; do not simulate success.
- Use existing project styles and components; do not add dependencies.

## Review Focus

- Selecting the current state must remain stable and disabled state must prevent changes.
- Switching states must immediately update `activeLevel` and sent drive input.
- `SpeedTab` must edit only the selected state and must not expose wheel/profile controls.
- Standard wheel type must hide the side-axis setting and test rotation behavior must remain unchanged.
- Reloading saved settings must restore the active level and selected profile correctly.

---

### Task 1: Replace the main speed dropdown

**Files:**
- Modify: `web/src/screens/SpeedPresetSelector.tsx`
- Modify: `web/src/screens/ControllerScreen.tsx`
- Test: `web/src/screens/SpeedPresetSelector.test.tsx` (create only if the project has a React test environment; otherwise validate through build and existing Vitest tests)

**Interfaces:**
- Consumes: `level: SpeedLevel`, `ready: boolean`, `onSelectLevel: (l: SpeedLevel) => void`.
- Produces: a horizontal 3-button selector with labels `STATE 1`, `STATE 2`, `STATE 3`.

- [ ] **Step 1: Replace dropdown state and menu markup with a horizontal button group.**

Map labels and values explicitly:
- `STATE 1` -> `slow`
- `STATE 2` -> `medium`
- `STATE 3` -> `fast`

The active button uses the orange background and white text; inactive buttons use white background and navy text.

- [ ] **Step 2: Add compact group styles to `SpeedPresetSelector.tsx`.**

Use a 3-button row with a 1px border, rounded container, compact height, and no absolute menu.

- [ ] **Step 3: Adjust `ControllerScreen` layout if needed.**

Keep the speed state group centered above the controller and remove the old quick profile A/B row from the top bar. Tournament operation should use the active stored profile only.

- [ ] **Step 4: Run `npm run typecheck` and `npm run build` from `web/`.**

Expected: both complete without errors.

### Task 2: Split Settings into focused tabs

**Files:**
- Modify: `web/src/screens/SettingsScreen.tsx`

**Interfaces:**
- Replace `Tab = 'speed' | 'motor' | 'profiles'` with:
  - `speed`
  - `wheel`
  - `motor`
  - `test`
- Keep `c.updateDriveProfile`, `c.selectSpeedLevel`, `useDriveInput`, and `activeDriveProfile` signatures unchanged.

- [ ] **Step 1: Remove the Profiles tab and all profile-management UI from Settings.**

Remove `ProfilesTab` rendering and `TABS` entry for Hồ sơ.

- [ ] **Step 2: Split the current combined SpeedTab.**

Create focused sections/components:
- `SpeedTab`: selected speed state, 1-3 PWM axis settings only.
- `WheelTab`: wheel type and direction matrix only.
- `MotorTab`: motor inversion, compensation, minimum/maximum PWM, and advanced acceleration.
- `TestTab`: existing `TestDrive` component only.

Do not change existing profile update or speed calculation behavior.

- [ ] **Step 3: Add explicit four-tab navigation labels: `Tốc độ`, `Hướng & bánh`, `Động cơ`, `Chạy thử`.**

Keep one active tab, with no nested profile or wheel editing in the speed tab.

- [ ] **Step 4: Verify unsupported actions remain clear.**

Keep the firmware-not-supported message for motor test and save-to-car actions. Do not enable a control that has no firmware implementation.

- [ ] **Step 5: Run `npm run typecheck`, `npm run build`, and `npm test` from `web/`.**

Expected: typecheck and build pass; all existing tests pass.
