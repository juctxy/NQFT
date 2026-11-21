// Khối dựng giống react-native-web để chép style từ StyleSheet của NQFT gần như nguyên văn.
import { forwardRef, useState, type CSSProperties, type HTMLAttributes, type ReactNode } from 'react';

export type Style = CSSProperties;
type Styles = Style | false | null | undefined | Styles[];

/** Gộp style giống mảng style của React Native. */
export function sx(...styles: Styles[]): Style {
  const out: Style = {};
  const add = (s: Styles) => {
    if (!s) return;
    if (Array.isArray(s)) s.forEach(add);
    else Object.assign(out, s);
  };
  styles.forEach(add);
  return out;
}

/** shadowColor/Opacity/Radius/Offset của React Native -> box-shadow. */
export function shadow(hex: string, opacity: number, radius: number, offsetY = 0): Style {
  const n = parseInt(hex.slice(1), 16);
  const rgb = hex.length === 4
    ? [(n >> 8) & 0xf, (n >> 4) & 0xf, n & 0xf].map((c) => c * 17)
    : [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
  return { boxShadow: `0px ${offsetY}px ${radius}px rgba(${rgb.join(',')},${opacity})` };
}

type ViewProps = Omit<HTMLAttributes<HTMLDivElement>, 'style'> & { style?: Styles };

/** View: flex cột, position relative, box-sizing border-box. */
export const View = forwardRef<HTMLDivElement, ViewProps>(function View({ style, className, ...rest }, ref) {
  return <div ref={ref} className={className ? `rn-v ${className}` : 'rn-v'} style={sx(style)} {...rest} />;
});

type TextProps = Omit<HTMLAttributes<HTMLSpanElement>, 'style'> & { style?: Styles; numberOfLines?: number };

export function Text({ style, numberOfLines, className, ...rest }: TextProps) {
  const clamp: Style | undefined = numberOfLines === 1 ? { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } : undefined;
  return <span className={className ? `rn-t ${className}` : 'rn-t'} style={sx(style, clamp)} {...rest} />;
}

type PressableProps = {
  style?: Styles | ((s: { pressed: boolean }) => Styles);
  children?: ReactNode;
  onPress?: () => void;
  onPressIn?: () => void;
  onPressOut?: () => void;
  disabled?: boolean;
  label?: string;
  selected?: boolean;
  role?: string;
};

/** Pressable: nút bấm, hỗ trợ style theo trạng thái nhấn và onPressIn/onPressOut (giữ nhiều ngón). */
export function Pressable({ style, children, onPress, onPressIn, onPressOut, disabled, label, selected, role }: PressableProps) {
  const [pressed, setPressed] = useState(false);
  const resolved = typeof style === 'function' ? style({ pressed }) : style;
  const end = () => {
    if (!pressed) return;
    setPressed(false);
    onPressOut?.();
  };
  return (
    <button
      type="button"
      className="rn-v rn-p"
      role={role}
      aria-label={label}
      aria-selected={role === 'tab' ? selected : undefined}
      aria-pressed={role !== 'tab' && selected !== undefined ? selected : undefined}
      disabled={disabled}
      style={sx(resolved)}
      onPointerDown={(e) => {
        if (disabled) return;
        if (onPressOut) e.currentTarget.setPointerCapture(e.pointerId);
        setPressed(true);
        onPressIn?.();
      }}
      onPointerUp={end}
      onPointerCancel={end}
      onLostPointerCapture={end}
      onPointerLeave={() => !onPressOut && setPressed(false)}
      onClick={() => !disabled && onPress?.()}
      onContextMenu={(e) => e.preventDefault()}
    >
      {children}
    </button>
  );
}
