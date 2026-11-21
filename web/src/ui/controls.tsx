// Slider và Switch kiểu React Native (màu truyền vào giống props tintColor của bản gốc).
import type { CSSProperties } from 'react';
import { sx, type Style } from './rn';

export function Slider({
  value,
  min,
  max,
  step = 1,
  disabled,
  label,
  minimumTrackTintColor,
  maximumTrackTintColor,
  thumbTintColor,
  style,
  onValueChange,
  onSlidingComplete,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  disabled?: boolean;
  label?: string;
  minimumTrackTintColor: string;
  maximumTrackTintColor: string;
  thumbTintColor: string;
  style?: Style;
  onValueChange?: (v: number) => void;
  onSlidingComplete?: (v: number) => void;
}) {
  const fill = max > min ? ((Math.max(min, Math.min(max, value)) - min) / (max - min)) * 100 : 0;
  const vars = { '--fill': `${fill}%`, '--min': minimumTrackTintColor, '--max': maximumTrackTintColor, '--thumb': thumbTintColor } as CSSProperties;
  const done = (v: string) => onSlidingComplete?.(Number(v));
  return (
    <input
      type="range"
      className="rn-slider"
      aria-label={label}
      min={min}
      max={max}
      step={step}
      value={value}
      disabled={disabled}
      style={sx(vars, style)}
      onChange={(e) => onValueChange?.(Number(e.target.value))}
      onPointerUp={(e) => done(e.currentTarget.value)}
      onKeyUp={(e) => done(e.currentTarget.value)}
    />
  );
}

export function Switch({
  value,
  label,
  trackColor,
  thumbColor,
  onValueChange,
}: {
  value: boolean;
  label?: string;
  trackColor: { false: string; true: string };
  thumbColor: string;
  onValueChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      aria-label={label}
      className="rn-switch"
      style={{ backgroundColor: value ? trackColor.true : trackColor.false }}
      onClick={() => onValueChange(!value)}
    >
      <span className="rn-switch-thumb" style={{ backgroundColor: thumbColor, transform: `translateX(${value ? 20 : 0}px)` }} />
    </button>
  );
}
