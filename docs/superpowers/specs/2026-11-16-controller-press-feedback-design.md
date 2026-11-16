# Controller Press Feedback Design

## Intent

Make function/action controls and speed preset controls reliably respond while
the joystick is being moved, so operators can control the robot and adjust
speed without lifting their joystick finger.

## Goals and non-goals

- Give function/action controls a clear held state from touch-down through
  touch release/cancel.
- Allow the speed chip to open and a preset option to be selected while the
  joystick pan remains active.
- Avoid publishing the same joystick direction repeatedly while it remains
  unchanged.
- Preserve the current controller layout, action behavior, and multitouch model.
- Do not redesign touch arbitration or change robot/BLE command behavior.

## Constraints

- The app is an Expo / React Native mobile app and must continue to work in Expo
  Go.
- Earlier on-device traces showed that the screen can receive a second touch
  while the joystick is held, but the control feedback is not consistently
  apparent.
- Validate with the existing TypeScript check and tests; visual responsiveness
  still requires confirmation on the user's iPhone.

## Approaches

1. **React Native `Pressable` with explicit local state.** This is the smallest
   change, but on-device testing showed the first button press can work while
   the next button touch is lost during the same joystick hold. This approach
   does not meet the repeated-tap requirement.
2. **Per-control Gesture Handler `TapGesture` recognizers (selected).** Give
   each function/action button, speed chip, and speed option a native tap
   recognizer simultaneous with the joystick pan. Function/action recognizers
   drive held feedback from begin through finalize and invoke their action on
   activation; speed recognizers open the selector or apply a preset on
   activation. This avoids depending on repeated React Native responder
   acquisition without adding a controller-wide dispatcher.
3. **Controller-wide multitouch dispatcher.** Track all active fingers and
   dispatch joystick and button interactions centrally. This is broader and
   adds hit-testing and cancellation complexity; reserve it if per-button
   recognizers still fail on device.

## Design

Function and action controls, the speed chip, and each speed option will use
`useTapGesture` with `simultaneousWith: joystickGesture`. Function/action
gesture begin sets local pressed state, finalize clears it, and activate
invokes the existing action callback. Speed chip activation toggles the menu;
option activation applies its preset and closes the menu. Keep accessible
roles and labels on the views. The joystick will track its last published
direction and call the parent only when that direction changes; release will
still publish `STOP` when needed.

## Verification

Run TypeScript and the existing test suite. On iPhone, hold and move the
joystick while repeatedly tapping different function/action controls and while
opening/selecting speed presets. Each control should respond without lifting
the joystick finger.
