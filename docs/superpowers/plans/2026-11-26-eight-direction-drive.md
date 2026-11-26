# Eight-Direction Drive Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Snap all joystick input to the nearest of eight full-strength directions and remove web-side soft acceleration.

**Architecture:** Add one shared direction-quantization helper to the drive model and use it in both CONTROL packet generation and wheel PWM previews. Simplify `ControlLoop` to send the latest input unchanged, remove the soft-acceleration setting and UI, and retain legacy-storage compatibility by ignoring the old property during normalization.

**Tech Stack:** React, TypeScript, Vitest, Vite.

**Spec:** `docs/superpowers/specs/2026-11-26-eight-direction-drive-design.md`

## Global Constraints

- Keep the joystick's existing deadzone, speed presets, speed limit, BLE protocol, and motor controls.
- Do not change the separate rotate controls for Omni/Mecanum.
- Existing local settings may still contain `softAccelMs`; it will be ignored when normalized.
- Quantize the normalized joystick direction to the nearest of eight evenly spaced angles; directions exactly between sectors resolve consistently to one adjacent sector.
- Neutral input remains zero.

## Review Focus

- Neutral and deadzone input must still stop; exercise with existing and added `mapDrive` cases.
- Sector boundaries must resolve deterministically; test the exact 22.5-degree boundary in `driveModel.test.ts`.
- All wheel types must receive only cardinal or diagonal vectors; test Standard, Omni, and Mecanum in `mapInput.test.ts`.
- Omni/Mecanum rotation controls must remain independent of snapped movement; retain and run existing rotation-bit tests in `mapInput.test.ts`.
- ControlLoop must send both movement and stop commands immediately; test consecutive changed inputs in `carConfig.test.ts`.

---

### Task 1: Snap joystick directions and remove soft acceleration

**Files:**
- Modify: `web/src/drive/driveModel.ts` — add and use a shared eight-direction quantizer; remove `softAccelMs` from the active profile and normalization output.
- Test: `web/src/drive/driveModel.test.ts` — cardinal, diagonal, neutral, exact-sector-boundary, and legacy profile normalization behavior.
- Modify: `web/src/control/mapInput.ts` — use the quantized direction when building CONTROL values.
- Test: `web/src/control/mapInput.test.ts` — verify all three wheel types snap to full cardinal/diagonal values while preserving speed caps and rotation flags.
- Modify: `web/src/control/ControlLoop.ts` — remove ramp state and emit the current input immediately.
- Test: `web/src/control/carConfig.test.ts` — replace soft-ramp tests with immediate movement, direction-change, and stop assertions.
- Modify: `web/src/hooks/useDriveInput.ts` — remove soft-acceleration configuration wiring.
- Modify: `web/src/screens/settings/subpages/MotorSubPage.tsx` — remove soft-acceleration controls while preserving motor test and inversion controls.
- Modify: `web/src/screens/settings/subpages/SpeedSubPage.tsx` — explain that the joystick selects the nearest of eight directions.
- Modify: `web/src/screens/ControllerScreen.tsx` — replace the obsolete analog/continuous joystick accessibility text with the eight-direction behavior.
- Modify: `web/src/screens/SettingsScreen.tsx` — remove the obsolete soft-acceleration description and update the MotorSubPage props.

**Interfaces:**
- Produces: `snapJoystickDirection(direction: Vec): Vec` in `driveModel.ts`; returns `{x: 0, y: 0}` for neutral, otherwise one of the eight cardinal/diagonal direction vectors.
- Consumes: `snapJoystickDirection` from both `mapDrive` and `mixDrive`, so telemetry/readouts and transmitted movement use the same direction.
- Produces: `ControlLoop.nextOutput(): ControlInput`; returns a copy of the latest input without ramping.
- Legacy profile JSON containing `softAccelMs` remains accepted; normalized profiles omit it.

- [x] **Step 1: Write failing tests** for the quantizer and integration: assert the eight cardinal/diagonal vectors, neutral, deterministic assignment of an exact 22.5-degree boundary, snapping for Standard/Omni/Mecanum, preservation of max PWM caps and rotate flags, and legacy profile normalization without `softAccelMs`. Replace the ramp tests with immediate output assertions for movement, changing direction, and reset/stop.

- [x] **Step 2: Run focused tests and verify they fail** because the quantizer is missing, old expectations still describe analog output, and ramp-removal assertions are not yet satisfied.

  Run from `web`: `npm run test -- src/drive/driveModel.test.ts src/control/mapInput.test.ts src/control/carConfig.test.ts`

- [x] **Step 3: Implement the shared quantizer** in `driveModel.ts`, selecting the nearest of eight 45-degree sectors with a deterministic tie rule, and use it in both `mapDrive` and `mixDrive`.

- [x] **Step 4: Remove ramping and soft-acceleration configuration** from `ControlLoop`, `useDriveInput`, `DriveProfile` normalization/defaults, and the Motor settings UI. Keep old stored `softAccelMs` data harmlessly ignored. Update the speed-setting hint, joystick accessibility text, and Motor settings description to describe the new behavior.

- [x] **Step 5: Run focused tests and verify they pass.**

  Run from `web`: `npm run test -- src/drive/driveModel.test.ts src/control/mapInput.test.ts src/control/carConfig.test.ts`

- [x] **Step 6: Run the web typecheck.**

  Run from `web`: `npm run typecheck`
