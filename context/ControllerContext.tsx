import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { clampSpeed, type SpeedPresets } from '../controller';

export const DEFAULT_PRESETS: SpeedPresets = {
  slow: 130,
  medium: 190,
  fast: 255,
};

interface ControllerContextValue {
  motor1Speed: number;
  motor2Speed: number;
  presets: SpeedPresets;
  setMotor1Speed: (value: number) => void;
  setMotor2Speed: (value: number) => void;
  changePreset: (key: keyof SpeedPresets, value: number) => void;
  applyPreset: (value: number) => void;
  resetPresets: () => void;
}

const ControllerContext = createContext<ControllerContextValue | null>(null);

export function ControllerProvider({ children }: { children: ReactNode }) {
  const [motor1SpeedState, setMotor1SpeedState] = useState(190);
  const [motor2SpeedState, setMotor2SpeedState] = useState(190);
  const [presets, setPresets] = useState<SpeedPresets>(DEFAULT_PRESETS);

  const setMotor1Speed = useCallback((value: number) => {
    setMotor1SpeedState(clampSpeed(value));
  }, []);

  const setMotor2Speed = useCallback((value: number) => {
    setMotor2SpeedState(clampSpeed(value));
  }, []);

  const changePreset = useCallback((key: keyof SpeedPresets, value: number) => {
    setPresets((previous) => ({ ...previous, [key]: clampSpeed(value) }));
  }, []);

  const applyPreset = useCallback((value: number) => {
    const speed = clampSpeed(value);
    setMotor1SpeedState(speed);
    setMotor2SpeedState(speed);
  }, []);

  const resetPresets = useCallback(() => {
    setPresets(DEFAULT_PRESETS);
  }, []);

  const value = useMemo(
    () => ({
      motor1Speed: motor1SpeedState,
      motor2Speed: motor2SpeedState,
      presets,
      setMotor1Speed,
      setMotor2Speed,
      changePreset,
      applyPreset,
      resetPresets,
    }),
    [
      motor1SpeedState,
      motor2SpeedState,
      presets,
      setMotor1Speed,
      setMotor2Speed,
      changePreset,
      applyPreset,
      resetPresets,
    ],
  );

  return <ControllerContext.Provider value={value}>{children}</ControllerContext.Provider>;
}

export function useController() {
  const context = useContext(ControllerContext);
  if (!context) {
    throw new Error('useController must be used within ControllerProvider');
  }
  return context;
}
