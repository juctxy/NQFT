# NQFT Robot Controller

A React Native app built with Expo for a robot-controller interface. It includes four direction controls, a direction indicator, motor speed sliders, and function/Bluetooth status buttons.

> **Current limitation:** This is currently a UI prototype. Controls and sliders update the display only; the Bluetooth button does not connect to a device, and no commands are sent to a robot.

## Requirements

- Node.js (current LTS version) and npm
- Expo Go on a physical Android or iOS device, if you want to test on a phone

## Install

Clone the repository and enter the project folder:

```bash
git clone https://github.com/juctxy/NQFT.git
cd NQFT
```

Install the dependencies:

```bash
npm install
```

## Run the app

Start the Expo development server:

```bash
npm start
```

The app is locked to landscape. Rotate your phone horizontally before opening it in Expo Go.

Then:

- **Web:** press `w` in the Expo terminal, or run `npm run web`.
- **Android/iOS device:** scan the QR code with Expo Go. Keep the computer and phone on the same network. If the network blocks local connections, sign in with `npx expo login`, then run `npx expo start --tunnel`.
- **Android emulator:** run `npm run android` with an Android emulator installed and running.
- **iOS simulator:** run `npm run ios` on macOS with an iOS simulator installed.

To start the web app directly:

```bash
npm run web
```

## Using the controls

- Press and hold a direction control on a phone, or click and hold it with a mouse on the web. The direction indicator returns to `STOP` when released.
- Use the motor sliders to change each displayed PWM value from `0` to `255`.
- The `FUNC 1`, `FUNC 2`, and `BLUETOOTH` buttons currently toggle their on-screen state only.

## Project structure

```text
App.tsx          Main screen and controller UI
app.json         Expo app configuration
index.ts         Expo entry point
assets/          App icons and other static assets
package.json     Dependencies and npm commands
```

## Available commands

| Command | Description |
| --- | --- |
| `npm install` | Install project dependencies |
| `npm start` | Start the Expo development server |
| `npm run web` | Start Expo for web |
| `npm run android` | Start Expo targeting Android |
| `npm run ios` | Start Expo targeting iOS |
| `npx tsc --noEmit` | Check TypeScript types |
