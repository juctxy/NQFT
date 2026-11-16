# Controller Press Feedback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make function/action buttons and speed presets respond while the joystick is held, without redundant joystick command updates.

**Architecture:** Keep the Gesture Handler joystick and use one Gesture Handler `TapGesture` per function/action control and per speed-selector control, with each tap recognizer simultaneous with the joystick pan. Use a small controller helper to suppress repeated direction notifications.

**Tech Stack:** Expo 58, React Native 0.88, TypeScript, Node test runner.

**Spec:** `docs/superpowers/specs/2026-11-16-controller-press-feedback-design.md`

## Global Constraints

- Preserve the current controller layout, action behavior, and speed preset values.
- Do not redesign touch arbitration or change robot/BLE command behavior.
- Keep the app compatible with Expo Go.
- Confirm touch responsiveness on the user's iPhone; automated tests cannot establish native touch behavior.
- Function/action controls, the speed chip, and speed options must use tap recognizers simultaneous with the joystick, not React Native `Pressable` responders.

## Review Focus

- Repeated pan updates in one direction must not repeatedly notify the parent; test same-command suppression.
- Crossing into a different direction must still notify the parent; test a direction transition.
- Releasing from movement must publish `STOP`, while releasing when already stopped must not duplicate it; test both helper transitions.
- Each function/action tap must be recognized repeatedly during one continuous joystick pan; verify several alternating button taps on iPhone.
- The speed chip must open and a speed option must apply while one joystick pan remains active; verify on iPhone.
- A tap canceled by moving outside its button must clear the held visual state without firing an action; verify on iPhone.

---

### Task 1: Stabilize controller press feedback

**Files:**
- Modify: `controller.ts`
- Modify: `components/ControllerScreen.tsx`
- Modify: `components/SpeedPresetSelector.tsx`
- Test: `controller.test.mjs`

**Interfaces:**
- Consumes the existing `PanGesture` from `usePanGesture` in both controller controls and the speed selector.
- Produces `getChangedCommand(previous: CommandType, next: CommandType): CommandType | null`; returns `null` when unchanged, otherwise returns `next`.

- [ ] **Step 1: Add failing command-change tests**

Add tests proving unchanged directions return `null`, a direction transition returns the new command, moving to `STOP` returns `STOP`, and repeated `STOP` returns `null`.

- [ ] **Step 2: Run the focused tests and confirm they fail**

Run: `npm test`
Expected: the new tests fail because `getChangedCommand` is not implemented.

- [ ] **Step 3: Implement `getChangedCommand` in `controller.ts`**

Use the exact signature above and return the next command only when it differs from the previous command.

- [ ] **Step 4: Replace controller and speed responders with simultaneous tap gestures**

In `components/ControllerScreen.tsx`, pass `joystickGesture: PanGesture` to `FunctionButton` and `ActionButton`. In `components/SpeedPresetSelector.tsx`, pass the same gesture to a small reusable tap-control component used for the chip and each option. Use `useTapGesture` with `runOnJS: true` and `simultaneousWith: joystickGesture`; for action controls, begin sets local held state, finalize clears it, and activate invokes the existing action. For speed controls, activate toggles the selector or applies the preset and closes it. Wrap accessible `View`s in `GestureDetector` instead of using React Native `Pressable` responders; retain roles and labels.

- [ ] **Step 5: Publish only changed joystick commands**

Track the last published `CommandType` in a ref. Use `getChangedCommand` for both movement and reset so direction changes and the first `STOP` are published, but repeated commands are not.

- [ ] **Step 6: Run automated checks**

Run: `npx tsc --noEmit`
Expected: PASS.

Run: `npm test`
Expected: all tests PASS.

- [ ] **Step 7: Verify repeated taps on iPhone**

Hold and continuously move the joystick while alternating between FUNC 1, FUNC 2, and an action button, then open the speed menu and select a preset without releasing the joystick. Confirm each operation responds and actions/preset updates occur exactly once.

## Execution notes

The working tree already contains unrelated BLE and controller changes. Keep implementation edits limited to the files listed above and do not stage or commit the existing mixed changes. The first Pressable-based implementation failed the repeated-tap iPhone check; use the approved TapGesture design instead.
