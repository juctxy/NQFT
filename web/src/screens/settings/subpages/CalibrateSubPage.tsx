import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { RotateCcw, RotateCw } from 'lucide-react';
import { theme } from '../theme';
import {
  clampJoystick,
  mixDrive,
  normalizeJoystick,
  WHEEL_IDS,
  type DriveProfile,
  type SpeedLevel,
  type Vec,
} from '../../../drive/driveModel';
import { Pressable, Text, View, type Style } from '../../../ui/rn';

interface CalibrateSubPageProps {
  profile: DriveProfile;
  level: SpeedLevel;
  onControlChange: (v: Vec) => void;
  onRotateChange: (r: number) => void;
}

export function CalibrateSubPage({
  profile,
  level,
  onControlChange,
  onRotateChange,
}: CalibrateSubPageProps) {
  const [knob, setKnob] = useState<Vec>({ x: 0, y: 0 });
  const [joy, setJoy] = useState<Vec>({ x: 0, y: 0 });
  const [rotate, setRotate] = useState(0);
  const active = useRef<{ id: number; left: number; top: number } | null>(null);

  const move = (cx: number, cy: number) => {
    const a = active.current;
    if (!a) return;
    const o = clampJoystick(cx - a.left - 65, cy - a.top - 65, 45);
    const n = normalizeJoystick(o.x / 45, -o.y / 45);
    setKnob(o);
    setJoy(n);
    onControlChange(n);
  };

  const end = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (active.current?.id !== e.pointerId) return;
    active.current = null;
    setKnob({ x: 0, y: 0 });
    setJoy({ x: 0, y: 0 });
    setRotate(0);
    onControlChange({ x: 0, y: 0 });
    onRotateChange(0);
  };

  const pwm = mixDrive(profile, level, joy, rotate);

  const rot = (r: number) => ({
    onPressIn: () => {
      setRotate(r);
      onRotateChange(r);
    },
    onPressOut: () => {
      setRotate(0);
      onRotateChange(0);
    },
  });

  return (
    <View style={s.container}>
      <View style={s.sectionCard}>
        <Text style={s.sectionTitle}>Kiểm tra chuyển động & Hiệu chỉnh</Text>
        <Text style={s.hintText}>
          Kéo cần joystick hoặc giữ nút xoay để chạy thử xe trực tiếp. Theo dõi hướng quay và xung PWM của 4 bánh bên phải.
        </Text>

        <View style={s.twoColumns}>
          {/* Cột 1: Cần gạt joystick & xoay */}
          <View style={s.controlsColumn}>
            <Text style={s.columnLabel}>Cần gạt chạy thử</Text>
            <View
              className="rn-touch"
              style={s.miniJoystick}
              onPointerDown={(e) => {
                if (active.current) return;
                const r = e.currentTarget.getBoundingClientRect();
                e.currentTarget.setPointerCapture(e.pointerId);
                active.current = { id: e.pointerId, left: r.left, top: r.top };
                move(e.clientX, e.clientY);
              }}
              onPointerMove={(e) =>
                active.current?.id === e.pointerId && move(e.clientX, e.clientY)
              }
              onPointerUp={end}
              onPointerCancel={end}
              onLostPointerCapture={end}
            >
              <Text style={s.arrowUp}>↑</Text>
              <Text style={s.arrowDown}>↓</Text>
              <Text style={s.arrowLeft}>←</Text>
              <Text style={s.arrowRight}>→</Text>
              <View
                style={[
                  s.miniKnob,
                  {
                    transform: `translate(${knob.x}px, ${knob.y}px)`,
                    pointerEvents: 'none',
                  },
                ]}
              />
            </View>

            {profile.wheelType !== 'standard' && (
              <View style={s.rotateRow}>
                <Pressable
                  label="Giữ để xoay trái"
                  style={s.rotateButton}
                  {...rot(-1)}
                >
                  <RotateCcw color={theme.text} size={18} />
                  <Text style={s.rotateText}>Xoay trái</Text>
                </Pressable>
                <Pressable
                  label="Giữ để xoay phải"
                  style={s.rotateButton}
                  {...rot(1)}
                >
                  <RotateCw color={theme.text} size={18} />
                  <Text style={s.rotateText}>Xoay phải</Text>
                </Pressable>
              </View>
            )}
          </View>

          {/* Cột 2: Bảng hiển thị PWM 4 bánh */}
          <View style={s.readoutColumn}>
            <Text style={s.columnLabel}>Xung PWM & Chiều quay 4 bánh</Text>
            <View style={s.wheelGrid}>
              {WHEEL_IDS.map((w) => {
                const val = Math.abs(Math.round(pwm[w]));
                const isForward = pwm[w] > 0;
                const isReverse = pwm[w] < 0;

                return (
                  <View key={w} style={s.wheelCard}>
                    <Text style={s.wheelName}>BÁNH {w.toUpperCase()}</Text>
                    <Text
                      style={[
                        s.wheelRotation,
                        isForward && s.forwardRotation,
                        isReverse && s.reverseRotation,
                      ]}
                    >
                      {isForward ? '↻ Quay thuận' : isReverse ? '↺ Quay nghịch' : '· Đang dừng'}
                    </Text>
                    <Text style={s.wheelPwmValue}>{val} PWM</Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const s: Record<string, Style> = {
  container: {
    gap: 14,
  },
  sectionCard: {
    backgroundColor: theme.card,
    borderColor: theme.cardBorder,
    borderRadius: 14,
    borderStyle: 'solid',
    borderWidth: 1,
    gap: 16,
    padding: 16,
  },
  sectionTitle: {
    color: theme.text,
    fontSize: 15,
    fontWeight: 800,
  },
  hintText: {
    color: theme.textMuted,
    fontSize: 12,
    lineHeight: '16px',
  },
  twoColumns: {
    display: 'grid',
    gap: 20,
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
  },
  controlsColumn: {
    alignItems: 'center',
    backgroundColor: theme.backgroundSubtle,
    borderColor: theme.border,
    borderRadius: 12,
    borderStyle: 'solid',
    borderWidth: 1,
    gap: 14,
    justifyContent: 'center',
    padding: '20px 16px',
  },
  columnLabel: {
    color: theme.textMuted,
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  miniJoystick: {
    alignItems: 'center',
    backgroundColor: theme.card,
    borderColor: theme.cardBorder,
    borderRadius: 65,
    borderStyle: 'solid',
    borderWidth: 2,
    cursor: 'pointer',
    height: 130,
    justifyContent: 'center',
    position: 'relative',
    touchAction: 'none',
    width: 130,
  },
  arrowUp: {
    color: theme.accent,
    fontSize: 14,
    fontWeight: 900,
    position: 'absolute',
    top: 6,
  },
  arrowDown: {
    color: theme.accent,
    fontSize: 14,
    fontWeight: 900,
    bottom: 6,
    position: 'absolute',
  },
  arrowLeft: {
    color: theme.accent,
    fontSize: 14,
    fontWeight: 900,
    left: 8,
    position: 'absolute',
  },
  arrowRight: {
    color: theme.accent,
    fontSize: 14,
    fontWeight: 900,
    position: 'absolute',
    right: 8,
  },
  miniKnob: {
    backgroundColor: theme.accent,
    borderColor: '#fff',
    borderRadius: 20,
    borderStyle: 'solid',
    borderWidth: 2,
    height: 40,
    width: 40,
  },
  rotateRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  rotateButton: {
    alignItems: 'center',
    backgroundColor: theme.card,
    borderColor: theme.cardBorder,
    borderRadius: 8,
    borderStyle: 'solid',
    borderWidth: 1,
    cursor: 'pointer',
    flex: '1 1 0%',
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    minHeight: 44,
    padding: '8px 12px',
  },
  rotateText: {
    color: theme.text,
    fontSize: 12,
    fontWeight: 700,
  },
  readoutColumn: {
    backgroundColor: theme.backgroundSubtle,
    borderColor: theme.border,
    borderRadius: 12,
    borderStyle: 'solid',
    borderWidth: 1,
    gap: 12,
    padding: 16,
  },
  wheelGrid: {
    display: 'grid',
    gap: 10,
    gridTemplateColumns: 'repeat(2, 1fr)',
  },
  wheelCard: {
    alignItems: 'center',
    backgroundColor: theme.card,
    borderColor: theme.cardBorder,
    borderRadius: 10,
    borderStyle: 'solid',
    borderWidth: 1,
    gap: 4,
    justifyContent: 'center',
    padding: '12px 8px',
  },
  wheelName: {
    color: theme.text,
    fontSize: 12,
    fontWeight: 800,
  },
  wheelRotation: {
    color: theme.textSubtle,
    fontSize: 11,
    fontWeight: 600,
  },
  forwardRotation: {
    color: theme.success,
  },
  reverseRotation: {
    color: theme.accent,
  },
  wheelPwmValue: {
    color: theme.text,
    fontSize: 15,
    fontWeight: 800,
    letterSpacing: 0.3,
  },
};
