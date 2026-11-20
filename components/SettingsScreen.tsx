import { useEffect, useMemo, useRef, useState } from 'react';
import Slider from '@react-native-community/slider';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  GestureDetector,
  usePanGesture,
  type PanGestureConfig,
} from 'react-native-gesture-handler';
import { ArrowLeftCircle, RotateCcw, Save, Square, Triangle } from 'lucide-react-native';
import { clampJoystick } from '../controller';
import {
  SPEED_LEVELS,
  SPEED_LEVEL_LABELS,
  WHEEL_IDS,
  mixDrive,
  normalizeDriveProfile,
  normalizeJoystick,
  pwmPercent,
  setDriveWheelType,
  setMatrixSign,
  type DriveAxis,
  type DriveProfile,
  type DriveSign,
  type JoystickVector,
  type SpeedLevel,
  type WheelId,
} from '../drive';

type SettingsTab = 'speed' | 'motor' | 'profiles';
type SyncState = 'idle' | 'pending' | 'synced' | 'error';

interface SettingsScreenProps {
  profile: DriveProfile;
  profiles: DriveProfile[];
  activeProfileId: string;
  level: SpeedLevel;
  ready: boolean;
  connected: boolean;
  batteryVoltageMv: number | null;
  syncState: SyncState;
  syncError: string | null;
  error: string | null;
  canUndo: boolean;
  onUpdateProfile: (profile: DriveProfile) => void;
  onSelectProfile: (id: string) => void;
  onSelectLevel: (level: SpeedLevel) => void;
  onSaveToCar: () => void;
  onRetrySync: () => void;
  onUndo: () => void;
  onRestoreDefaults: () => void;
  onSaveAndClose: () => void;
  onStop: () => void;
  onControlChange: (joystick: JoystickVector) => void;
  onRotateChange: (rotate: -1 | 0 | 1) => void;
  onTestMotor: (wheel: WheelId, pwm: number) => void;
  onCreateProfile: (name: string) => void;
  onDuplicateProfile: (id: string) => void;
  onRenameProfile: (id: string, name: string) => void;
  onDeleteProfile: (id: string) => void;
  onImportProfile: (profile: DriveProfile) => void;
  onExportProfile: (profile: DriveProfile) => Promise<void>;
  onPickImportFile: () => Promise<DriveProfile | null>;
}

const TAB_OPTIONS: { key: SettingsTab; label: string }[] = [
  { key: 'speed', label: 'Tốc độ' },
  { key: 'motor', label: 'Động cơ' },
  { key: 'profiles', label: 'Hồ sơ' },
];

const LEVEL_AXIS_LABELS: Record<keyof DriveProfile['levels']['medium'], string> = {
  vFwd: 'Tiến / lùi (V_fwd)',
  vSide: 'Di chuyển ngang (V_side)',
  vTurn: 'Quay tại chỗ (V_turn)',
};

function wheelTypeLabel(profile: DriveProfile): string {
  switch (profile.wheelType) {
    case 'standard':
      return 'Standard';
    case 'omni':
      return 'Omni';
    case 'mecanum':
      return 'Mecanum';
  }
}

function SignLabel({ sign }: { sign: DriveSign }) {
  return <Text style={styles.matrixSign}>{sign === 1 ? '+' : sign === -1 ? '−' : '0'}</Text>;
}

function WheelDiagram({ profile }: { profile: DriveProfile }) {
  return (
    <View style={styles.diagramCard}>
      <View style={styles.diagramBody}>
        {WHEEL_IDS.map((wheel) => (
          <View key={wheel} style={styles.diagramWheel}>
            <Text style={styles.diagramWheelName}>{wheel.toUpperCase()}</Text>
            <Text style={styles.diagramWheelSigns}>
              {profile.matrix.fwd[wheel] > 0 ? '↑' : profile.matrix.fwd[wheel] < 0 ? '↓' : '·'}
              {'  '}
              {profile.matrix.side[wheel] > 0 ? '→' : profile.matrix.side[wheel] < 0 ? '←' : '·'}
            </Text>
          </View>
        ))}
      </View>
      <Text style={styles.diagramCaption}>
        Bố trí bánh nhìn từ trên xuống · {wheelTypeLabel(profile)}
      </Text>
    </View>
  );
}

function SpeedSettingRow({
  label,
  value,
  minPwm,
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  minPwm: number;
  disabled?: boolean;
  onChange: (value: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);

  const commit = (raw: number) => {
    const next = Math.max(0, Math.min(255, Math.round(raw)));
    setDraft(String(next));
    onChange(next);
  };
  const commitText = () => {
    const parsed = Number(draft);
    if (Number.isFinite(parsed)) commit(parsed);
    else setDraft(String(value));
  };
  const belowMinimum = value > 0 && value < minPwm;

  return (
    <View style={styles.speedCard}>
      <View style={styles.speedTitleRow}>
        <Text style={styles.speedLabel}>{label}</Text>
        <Text style={styles.speedReadout}>
          {value} · {pwmPercent(value)}%
        </Text>
      </View>
      <View style={styles.speedControls}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Giảm ${label}`}
          disabled={disabled || value <= 0}
          onPress={() => commit(value - 1)}
          style={[styles.stepButton, (disabled || value <= 0) && styles.disabled]}
        >
          <Text style={styles.stepButtonText}>−</Text>
        </Pressable>
        <Slider
          accessibilityLabel={label}
          accessibilityValue={{ min: 0, max: 255, now: value }}
          disabled={disabled}
          minimumValue={0}
          maximumValue={255}
          step={1}
          value={Number(draft) || 0}
          onValueChange={(next) => setDraft(String(Math.round(next)))}
          onSlidingComplete={commit}
          minimumTrackTintColor="#f47518"
          maximumTrackTintColor="#cbd5e1"
          thumbTintColor="#f47518"
          style={styles.speedSlider}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Tăng ${label}`}
          disabled={disabled || value >= 255}
          onPress={() => commit(value + 1)}
          style={[styles.stepButton, (disabled || value >= 255) && styles.disabled]}
        >
          <Text style={styles.stepButtonText}>+</Text>
        </Pressable>
        <TextInput
          accessibilityLabel={`Nhập giá trị ${label}`}
          keyboardType="number-pad"
          maxLength={3}
          onBlur={commitText}
          onChangeText={setDraft}
          onSubmitEditing={commitText}
          placeholder="PWM"
          selectTextOnFocus
          style={styles.numberInput}
          value={draft}
        />
      </View>
      {belowMinimum ? (
        <Text style={styles.warningText}>
          PWM đang dưới mức tối thiểu của động cơ ({minPwm}).
        </Text>
      ) : null}
    </View>
  );
}

function NumericSetting({
  label,
  value,
  min,
  max,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  suffix?: string;
  onChange: (value: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  const commit = () => {
    const parsed = Number(draft);
    if (!Number.isFinite(parsed)) {
      setDraft(String(value));
      return;
    }
    const next = Math.max(min, Math.min(max, Math.round(parsed)));
    setDraft(String(next));
    onChange(next);
  };

  return (
    <View style={styles.numericSetting}>
      <Text style={styles.settingLabel}>{label}</Text>
      <View style={styles.numericInputWrap}>
        <TextInput
          accessibilityLabel={label}
          keyboardType="number-pad"
          maxLength={4}
          onBlur={commit}
          onChangeText={setDraft}
          onSubmitEditing={commit}
          placeholder="Nhập giá trị"
          selectTextOnFocus
          style={styles.numberInput}
          value={draft}
        />
        {suffix ? <Text style={styles.settingSuffix}>{suffix}</Text> : null}
        <Text style={styles.settingRange}>{min}–{max}</Text>
      </View>
    </View>
  );
}

function MiniDriveTest({
  profile,
  level,
  onControlChange,
  onRotateChange,
}: {
  profile: DriveProfile;
  level: SpeedLevel;
  onControlChange: (joystick: JoystickVector) => void;
  onRotateChange: (rotate: -1 | 0 | 1) => void;
}) {
  const size = 118;
  const radius = 37;
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [joystick, setJoystick] = useState<JoystickVector>({ x: 0, y: 0 });
  const [rotate, setRotate] = useState<-1 | 0 | 1>(0);
  const origin = useRef({ x: 0, y: 0 });

  const updatePosition = (x: number, y: number) => {
    const next = clampJoystick(x - size / 2, y - size / 2, radius);
    const vector = normalizeJoystick(next.x / radius, -next.y / radius);
    setPosition(next);
    setJoystick(vector);
    onControlChange(vector);
  };
  const resetPosition = () => {
    setPosition({ x: 0, y: 0 });
    setJoystick({ x: 0, y: 0 });
    setRotate(0);
    onControlChange({ x: 0, y: 0 });
    onRotateChange(0);
  };
  const gesture = usePanGesture(
    useMemo<PanGestureConfig>(
      () => ({
        runOnJS: true,
        onBegin: ({ x, y }) => {
          origin.current = { x, y };
          updatePosition(x, y);
        },
        onUpdate: ({ translationX, translationY }) =>
          updatePosition(
            origin.current.x + translationX,
            origin.current.y + translationY,
          ),
        onFinalize: resetPosition,
      }),
      [],
    ),
  );
  const wheelPwm = mixDrive(profile, level, joystick, rotate);

  return (
    <View style={styles.testDriveCard}>
      <Text style={styles.sectionTitle}>Chạy thử</Text>
      <View style={styles.testDriveContent}>
        <View style={styles.testDriveControls}>
          <GestureDetector gesture={gesture}>
            <View style={[styles.miniJoystick, { width: size, height: size }]}>
              <Text style={styles.miniArrowUp}>↑</Text>
              <Text style={styles.miniArrowDown}>↓</Text>
              <Text style={styles.miniArrowLeft}>←</Text>
              <Text style={styles.miniArrowRight}>→</Text>
              <View
                style={[
                  styles.miniKnob,
                  { transform: [{ translateX: position.x }, { translateY: position.y }] },
                ]}
              />
            </View>
          </GestureDetector>
          {profile.wheelType !== 'standard' ? (
            <View style={styles.testRotateRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Giữ để xoay trái khi chạy thử"
                onPressIn={() => {
                  setRotate(-1);
                  onRotateChange(-1);
                }}
                onPressOut={() => {
                  setRotate(0);
                  onRotateChange(0);
                }}
                style={styles.testRotateButton}
              >
                <Text style={styles.testRotateText}>↶</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Giữ để xoay phải khi chạy thử"
                onPressIn={() => {
                  setRotate(1);
                  onRotateChange(1);
                }}
                onPressOut={() => {
                  setRotate(0);
                  onRotateChange(0);
                }}
                style={styles.testRotateButton}
              >
                <Text style={styles.testRotateText}>↷</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
        <View style={styles.wheelPwmGrid}>
          {WHEEL_IDS.map((wheel) => (
            <View key={wheel} style={styles.wheelPwmCard}>
              <Text style={styles.wheelPwmName}>{wheel.toUpperCase()}</Text>
              <Text style={styles.wheelRotation}>
                {wheelPwm[wheel] > 0 ? '↻' : wheelPwm[wheel] < 0 ? '↺' : '·'}
              </Text>
              <Text style={styles.wheelPwmValue}>{Math.abs(wheelPwm[wheel])} PWM</Text>
            </View>
          ))}
        </View>
      </View>
      <Text style={styles.hintText}>
        Hướng quay và PWM được tính trực tiếp từ ma trận, mức tốc độ và thông số từng bánh.
      </Text>
    </View>
  );
}

function DirectionMatrix({
  profile,
  onUpdate,
}: {
  profile: DriveProfile;
  onUpdate: (profile: DriveProfile) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const rows: { axis: DriveAxis; label: string }[] = [
    { axis: 'fwd', label: 'Tiến' },
    { axis: 'side', label: 'Ngang' },
    { axis: 'turn', label: 'Quay' },
  ];

  return (
    <View style={styles.matrixCard}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        onPress={() => setExpanded((open) => !open)}
        style={styles.matrixHeader}
      >
        <Text style={styles.sectionTitle}>Ma trận hướng</Text>
        <Text style={styles.matrixHeaderRight}>
          {profile.customMatrix ? 'Tùy chỉnh' : 'Mặc định'} · {expanded ? 'Ẩn' : 'Hiện'}
        </Text>
      </Pressable>
      {expanded ? (
        <>
          <View style={styles.matrixRow}>
            <Text style={styles.matrixAxisLabel}>Trục</Text>
            {WHEEL_IDS.map((wheel) => (
              <Text key={wheel} style={styles.matrixColumn}>{wheel.toUpperCase()}</Text>
            ))}
          </View>
          {rows.map(({ axis, label }) => (
            <View key={axis} style={styles.matrixRow}>
              <Text style={styles.matrixAxisLabel}>{label}</Text>
              {WHEEL_IDS.map((wheel) => {
                const disabled = axis === 'side' && profile.wheelType === 'standard';
                return (
                  <Pressable
                    key={wheel}
                    accessibilityRole="button"
                    accessibilityLabel={`${label}, bánh ${wheel.toUpperCase()}: ${profile.matrix[axis][wheel]}`}
                    accessibilityState={{ disabled }}
                    disabled={disabled}
                    onPress={() => {
                      const sequence: DriveSign[] = [1, -1, 0];
                      const current = profile.matrix[axis][wheel];
                      const next = sequence[(sequence.indexOf(current) + 1) % sequence.length];
                      onUpdate(setMatrixSign(profile, axis, wheel, next));
                    }}
                    style={[styles.matrixCell, disabled && styles.disabled]}
                  >
                    {disabled ? (
                      <Text style={styles.matrixSign}>—</Text>
                    ) : (
                      <SignLabel sign={profile.matrix[axis][wheel]} />
                    )}
                  </Pressable>
                );
              })}
            </View>
          ))}
          <Text style={styles.hintText}>Chạm ô để đổi dấu theo thứ tự +, −, 0.</Text>
        </>
      ) : null}
    </View>
  );
}

function SpeedTab({
  profile,
  level,
  onUpdate,
  onSelectLevel,
  onControlChange,
  onRotateChange,
}: {
  profile: DriveProfile;
  level: SpeedLevel;
  onUpdate: (profile: DriveProfile) => void;
  onSelectLevel: (level: SpeedLevel) => void;
  onControlChange: (joystick: JoystickVector) => void;
  onRotateChange: (rotate: -1 | 0 | 1) => void;
}) {
  return (
    <View style={styles.tabContent}>
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Loại bánh xe</Text>
        <View style={styles.wheelTypeOptions}>
          {(['standard', 'omni', 'mecanum'] as const).map((type) => (
            <Pressable
              key={type}
              accessibilityRole="button"
              accessibilityState={{ selected: profile.wheelType === type }}
              onPress={() => onUpdate(setDriveWheelType(profile, type))}
              style={[
                styles.wheelTypeButton,
                profile.wheelType === type && styles.wheelTypeButtonSelected,
              ]}
            >
              <Text
                style={[
                  styles.wheelTypeText,
                  profile.wheelType === type && styles.wheelTypeTextSelected,
                ]}
              >
                {type === 'standard' ? 'Standard' : type === 'omni' ? 'Omni' : 'Mecanum'}
              </Text>
            </Pressable>
          ))}
        </View>
        <WheelDiagram profile={profile} />
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Mức tốc độ</Text>
        <View style={styles.levelOptions}>
          {SPEED_LEVELS.map((item) => (
            <Pressable
              key={item}
              accessibilityRole="button"
              accessibilityState={{ selected: level === item }}
              onPress={() => onSelectLevel(item)}
              style={[styles.levelButton, level === item && styles.levelButtonSelected]}
            >
              <Text style={[styles.levelText, level === item && styles.levelTextSelected]}>
                {SPEED_LEVEL_LABELS[item]}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.hintText}>
          Mỗi mức lưu riêng tốc độ từng trục; không nhân theo phần trăm từ mức khác.
        </Text>
        <View style={styles.speedList}>
          {(['vFwd', 'vSide', 'vTurn'] as const)
            .filter((axis) => axis !== 'vSide' || profile.wheelType !== 'standard')
            .map((axis) => (
              <SpeedSettingRow
                key={`${level}-${axis}`}
                label={LEVEL_AXIS_LABELS[axis]}
                value={profile.levels[level][axis]}
                minPwm={profile.minPwm}
                onChange={(value) =>
                  onUpdate({
                    ...profile,
                    levels: {
                      ...profile.levels,
                      [level]: { ...profile.levels[level], [axis]: value },
                    },
                  })
                }
              />
            ))}
        </View>
      </View>

      <MiniDriveTest
        profile={profile}
        level={level}
        onControlChange={onControlChange}
        onRotateChange={onRotateChange}
      />
      <DirectionMatrix profile={profile} onUpdate={onUpdate} />
    </View>
  );
}

function MotorTab({
  profile,
  onUpdate,
  onTestMotor,
}: {
  profile: DriveProfile;
  onUpdate: (profile: DriveProfile) => void;
  onTestMotor: (wheel: WheelId, pwm: number) => void;
}) {
  const [advancedExpanded, setAdvancedExpanded] = useState(false);
  const [softAccelDraft, setSoftAccelDraft] = useState(profile.softAccelMs);
  useEffect(() => setSoftAccelDraft(profile.softAccelMs), [profile.softAccelMs]);
  return (
    <View style={styles.tabContent}>
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Kiểm tra từng động cơ</Text>
        <Text style={styles.hintText}>Nhấn giữ để quay ở PWM thấp; thả ra để dừng.</Text>
        <View style={styles.motorGrid}>
          {WHEEL_IDS.map((wheel) => (
            <View key={wheel} style={styles.motorCard}>
              <Text style={styles.motorName}>Bánh {wheel.toUpperCase()}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Nhấn giữ để kiểm tra động cơ ${wheel.toUpperCase()}`}
                onPressIn={() => onTestMotor(wheel, 45)}
                onPressOut={() => onTestMotor(wheel, 0)}
                style={({ pressed }) => [
                  styles.motorTestButton,
                  pressed && styles.motorTestButtonPressed,
                ]}
              >
                <Triangle color="#fff" size={18} />
                <Text style={styles.motorTestText}>KIỂM TRA</Text>
              </Pressable>
              <View style={styles.motorOptionRow}>
                <Text style={styles.settingLabel}>Đảo chiều</Text>
                <Switch
                  accessibilityLabel={`Đảo chiều động cơ ${wheel.toUpperCase()}`}
                  value={profile.motors[wheel].inverted}
                  onValueChange={(inverted) =>
                    onUpdate({
                      ...profile,
                      motors: {
                        ...profile.motors,
                        [wheel]: { ...profile.motors[wheel], inverted },
                      },
                    })
                  }
                  trackColor={{ false: '#cbd5e1', true: '#f9a66c' }}
                  thumbColor={profile.motors[wheel].inverted ? '#f47518' : '#f8fafc'}
                />
              </View>
              <NumericSetting
                label="Bù công suất"
                value={profile.motors[wheel].compensation}
                min={80}
                max={100}
                suffix="%"
                onChange={(compensation) =>
                  onUpdate({
                    ...profile,
                    motors: {
                      ...profile.motors,
                      [wheel]: { ...profile.motors[wheel], compensation },
                    },
                  })
                }
              />
              <Text style={styles.hintText}>Chỉ giảm công suất bánh này.</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Giới hạn động cơ</Text>
        <NumericSetting
          label="PWM tối thiểu (vùng chết)"
          value={profile.minPwm}
          min={0}
          max={profile.maxLimit}
          onChange={(minPwm) => onUpdate({ ...profile, minPwm })}
        />
        <NumericSetting
          label="Giới hạn tốc độ tối đa"
          value={profile.maxLimit}
          min={Math.max(1, profile.minPwm)}
          max={255}
          onChange={(maxLimit) => onUpdate({ ...profile, maxLimit })}
        />
        <Text style={styles.hintText}>
          PWM tối thiểu không thể lớn hơn giới hạn tối đa.
        </Text>
      </View>

      <View style={styles.sectionCard}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: advancedExpanded }}
          onPress={() => setAdvancedExpanded((expanded) => !expanded)}
          style={styles.matrixHeader}
        >
          <Text style={styles.sectionTitle}>Nâng cao</Text>
          <Text style={styles.matrixHeaderRight}>{advancedExpanded ? 'Ẩn' : 'Hiện'}</Text>
        </Pressable>
        {advancedExpanded ? (
          <View style={styles.speedCard}>
            <View style={styles.speedTitleRow}>
              <Text style={styles.speedLabel}>Tăng tốc mềm</Text>
              <Text style={styles.speedReadout}>{softAccelDraft} ms</Text>
            </View>
            <Slider
              accessibilityLabel="Thời gian tăng tốc mềm"
              accessibilityValue={{ min: 0, max: 400, now: profile.softAccelMs }}
              minimumValue={0}
              maximumValue={400}
              step={10}
              value={softAccelDraft}
              onValueChange={(softAccelMs) => setSoftAccelDraft(Math.round(softAccelMs))}
              onSlidingComplete={(softAccelMs) =>
                onUpdate({ ...profile, softAccelMs: Math.round(softAccelMs) })
              }
              minimumTrackTintColor="#f47518"
              maximumTrackTintColor="#cbd5e1"
              thumbTintColor="#f47518"
              style={styles.speedSlider}
            />
            <NumericSetting
              label="Nhập thời gian tăng tốc"
              value={profile.softAccelMs}
              min={0}
              max={400}
              suffix="ms"
              onChange={(softAccelMs) => onUpdate({ ...profile, softAccelMs })}
            />
          </View>
        ) : null}
      </View>
    </View>
  );
}

function ProfilesTab({
  profile,
  profiles,
  activeProfileId,
  onSelectProfile,
  onUpdateProfile,
  onCreateProfile,
  onDuplicateProfile,
  onRenameProfile,
  onDeleteProfile,
  onImportProfile,
  onExportProfile,
  onPickImportFile,
}: {
  profile: DriveProfile;
  profiles: DriveProfile[];
  activeProfileId: string;
  onSelectProfile: (id: string) => void;
  onUpdateProfile: (profile: DriveProfile) => void;
  onCreateProfile: (name: string) => void;
  onDuplicateProfile: (id: string) => void;
  onRenameProfile: (id: string, name: string) => void;
  onDeleteProfile: (id: string) => void;
  onImportProfile: (profile: DriveProfile) => void;
  onExportProfile: (profile: DriveProfile) => Promise<void>;
  onPickImportFile: () => Promise<DriveProfile | null>;
}) {
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);

  const exportActiveProfile = async () => {
    try {
      await onExportProfile(profile);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setImportError(`Không thể xuất hồ sơ: ${message}`);
    }
  };

  const importProfileFile = async () => {
    try {
      const imported = await onPickImportFile();
      if (imported) onImportProfile(imported);
      setImportError(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setImportError(`Không thể nhập hồ sơ: ${message}`);
    }
  };

  const importProfile = () => {
    try {
      const parsed: unknown = JSON.parse(importText);
      const normalized = normalizeDriveProfile(parsed);
      onImportProfile({
        ...normalized,
        id: `import-${Date.now()}`,
        name: normalized.name || 'Hồ sơ nhập',
      });
      setImportText('');
      setImportError(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setImportError(`Dữ liệu hồ sơ không hợp lệ: ${message}`);
    }
  };

  const overwriteProfile = (id: string, name: string) => {
    Alert.alert(
      'Ghi đè hồ sơ?',
      `Thay toàn bộ cài đặt của “${name}” bằng cấu hình hiện tại?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Ghi đè',
          style: 'destructive',
          onPress: () => onUpdateProfile({ ...profile, id, name }),
        },
      ],
    );
  };

  return (
    <View style={styles.tabContent}>
      <View style={styles.quickProfiles}>
        {profiles.slice(0, 2).map((item, index) => (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            accessibilityLabel={`Chọn nhanh hồ sơ ${index === 0 ? 'A' : 'B'}`}
            accessibilityState={{ selected: activeProfileId === item.id }}
            onPress={() => onSelectProfile(item.id)}
            style={[
              styles.quickProfileButton,
              activeProfileId === item.id && styles.quickProfileButtonSelected,
            ]}
          >
            <Text
              style={[
                styles.quickProfileText,
                activeProfileId === item.id && styles.quickProfileTextSelected,
              ]}
            >
              {index === 0 ? 'A' : 'B'} · {item.name}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.sectionCard}>
        <View style={styles.sectionHeadingRow}>
          <Text style={styles.sectionTitle}>Hồ sơ trên điện thoại</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => onCreateProfile(`Hồ sơ ${profiles.length + 1}`)}
            style={styles.smallActionButton}
          >
            <Text style={styles.smallActionText}>+ Tạo hồ sơ</Text>
          </Pressable>
        </View>
        {profiles.map((item) => (
          <View key={item.id} style={styles.profileCard}>
            <TextInput
              accessibilityLabel="Tên hồ sơ"
              defaultValue={item.name}
              onEndEditing={(event) => onRenameProfile(item.id, event.nativeEvent.text)}
              placeholder="Tên hồ sơ"
              style={styles.profileNameInput}
            />
            <Text style={styles.profileSummary}>
              {wheelTypeLabel(item)} · Vừa: {item.levels.medium.vFwd}/
              {item.levels.medium.vSide}/{item.levels.medium.vTurn}
            </Text>
            <View style={styles.profileActions}>
              <SmallButton label="Tải" onPress={() => onSelectProfile(item.id)} />
              <SmallButton label="Ghi đè" onPress={() => overwriteProfile(item.id, item.name)} />
              <SmallButton label="Nhân bản" onPress={() => onDuplicateProfile(item.id)} />
              <SmallButton
                label="Xóa"
                destructive
                onPress={() =>
                  Alert.alert(
                    'Xóa hồ sơ?',
                    `Bạn có chắc muốn xóa “${item.name}”?`,
                    [
                      { text: 'Hủy', style: 'cancel' },
                      {
                        text: 'Xóa',
                        style: 'destructive',
                        onPress: () => onDeleteProfile(item.id),
                      },
                    ],
                  )
                }
              />
            </View>
          </View>
        ))}
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Xuất / nhập tệp JSON</Text>
        <Text style={styles.hintText}>
          Chia sẻ tệp hồ sơ hoặc chọn tệp JSON đã lưu trên điện thoại.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => void exportActiveProfile()}
          style={styles.primaryActionButton}
        >
          <Text style={styles.primaryActionText}>Xuất tệp hồ sơ đang dùng</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => void importProfileFile()}
          style={styles.secondaryActionButton}
        >
          <Text style={styles.secondaryActionText}>Chọn tệp JSON để nhập</Text>
        </Pressable>
        <TextInput
          accessibilityLabel="Dán JSON hồ sơ để nhập"
          multiline
          onChangeText={setImportText}
          placeholder="Dán nội dung JSON hồ sơ vào đây"
          style={styles.importInput}
          value={importText}
        />
        <Pressable
          accessibilityRole="button"
          disabled={!importText.trim()}
          onPress={importProfile}
          style={[styles.secondaryActionButton, !importText.trim() && styles.disabled]}
        >
          <Text style={styles.secondaryActionText}>Nhập hồ sơ</Text>
        </Pressable>
        {importError ? <Text style={styles.warningText}>{importError}</Text> : null}
      </View>
    </View>
  );
}

function SmallButton({
  label,
  onPress,
  destructive = false,
}: {
  label: string;
  onPress: () => void;
  destructive?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.smallButton, destructive && styles.destructiveButton]}
    >
      <Text style={[styles.smallButtonText, destructive && styles.destructiveText]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function SettingsScreen({
  profile,
  profiles,
  activeProfileId,
  level,
  ready,
  connected,
  batteryVoltageMv,
  syncState,
  syncError,
  error,
  canUndo,
  onUpdateProfile,
  onSelectProfile,
  onSelectLevel,
  onSaveToCar,
  onRetrySync,
  onUndo,
  onRestoreDefaults,
  onSaveAndClose,
  onStop,
  onControlChange,
  onRotateChange,
  onTestMotor,
  onCreateProfile,
  onDuplicateProfile,
  onRenameProfile,
  onDeleteProfile,
  onImportProfile,
  onExportProfile,
  onPickImportFile,
}: SettingsScreenProps) {
  const [tab, setTab] = useState<SettingsTab>('speed');
  const batteryLabel = batteryVoltageMv === null
    ? 'Pin: —'
    : `Pin: ${(batteryVoltageMv / 1000).toFixed(2)} V`;
  const syncLabel = syncState === 'synced'
    ? 'Đã đồng bộ'
    : syncState === 'pending'
      ? 'Đang chờ xe xác nhận…'
      : syncState === 'error'
        ? 'Chưa đồng bộ'
        : 'Chưa gửi cấu hình';

  return (
    <View style={styles.screen}>
      <View style={styles.topBar}>
        <View style={styles.connectionInfo}>
          <View style={[styles.connectionDot, connected ? styles.connectedDot : null]} />
          <Text style={styles.connectionText}>
            {connected ? 'Đã kết nối với xe' : 'Chưa kết nối'}
          </Text>
          <Text style={styles.batteryText}>{batteryLabel}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dừng xe ngay"
          onPress={onStop}
          style={styles.stopButton}
        >
          <Square color="#fff" size={14} fill="#fff" />
          <Text style={styles.stopButtonText}>DỪNG</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={onSaveAndClose}
          style={styles.closeButton}
        >
          <ArrowLeftCircle color="#fff" size={16} />
          <Text style={styles.closeButtonText}>LƯU & ĐÓNG</Text>
        </Pressable>
      </View>

      <View style={styles.tabs}>
        {TAB_OPTIONS.map((item) => (
          <Pressable
            key={item.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === item.key }}
            onPress={() => setTab(item.key)}
            style={[styles.tabButton, tab === item.key && styles.tabButtonSelected]}
          >
            <Text style={[styles.tabText, tab === item.key && styles.tabTextSelected]}>
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {!ready ? (
        <View style={styles.messageWrap}>
          <Text style={styles.hintText}>Đang tải hồ sơ đã lưu…</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          {tab === 'speed' ? (
            <SpeedTab
              profile={profile}
              level={level}
              onUpdate={onUpdateProfile}
              onSelectLevel={onSelectLevel}
              onControlChange={onControlChange}
              onRotateChange={onRotateChange}
            />
          ) : tab === 'motor' ? (
            <MotorTab
              profile={profile}
              onUpdate={onUpdateProfile}
              onTestMotor={onTestMotor}
            />
          ) : (
            <ProfilesTab
              profile={profile}
              profiles={profiles}
              activeProfileId={activeProfileId}
              onSelectProfile={onSelectProfile}
              onUpdateProfile={onUpdateProfile}
              onCreateProfile={onCreateProfile}
              onDuplicateProfile={onDuplicateProfile}
              onRenameProfile={onRenameProfile}
              onDeleteProfile={onDeleteProfile}
              onImportProfile={onImportProfile}
              onExportProfile={onExportProfile}
              onPickImportFile={onPickImportFile}
            />
          )}
        </ScrollView>
      )}

      <View style={styles.bottomBar}>
        <View style={styles.syncStatus}>
          <View
            style={[
              styles.syncDot,
              syncState === 'synced' && styles.connectedDot,
              syncState === 'error' && styles.errorDot,
              syncState === 'pending' && styles.pendingDot,
            ]}
          />
          <View style={styles.syncCopy}>
            <Text style={styles.syncText}>{syncLabel}</Text>
            {syncError ? <Text style={styles.syncError}>{syncError}</Text> : null}
          </View>
          {syncState === 'error' ? (
            <Pressable
              accessibilityRole="button"
              onPress={onRetrySync}
              style={styles.retryButton}
            >
              <Text style={styles.retryText}>Thử lại</Text>
            </Pressable>
          ) : null}
        </View>
        <View style={styles.bottomActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Hoàn tác thay đổi gần nhất"
            disabled={!canUndo}
            onPress={onUndo}
            style={[styles.footerButton, !canUndo && styles.disabled]}
          >
            <RotateCcw color="#334155" size={14} />
            <Text style={styles.footerButtonText}>Hoàn tác</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={!ready || !connected || syncState === 'pending'}
            onPress={onSaveToCar}
            style={[
              styles.footerButton,
              styles.saveToCarButton,
              (!ready || !connected || syncState === 'pending') && styles.disabled,
            ]}
          >
            <Save color="#fff" size={14} />
            <Text style={styles.saveToCarText}>Lưu vào xe</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={!ready}
            onPress={() =>
              Alert.alert(
                'Khôi phục mặc định?',
                'Toàn bộ cấu hình và hồ sơ trên điện thoại sẽ được đặt lại.',
                [
                  { text: 'Hủy', style: 'cancel' },
                  {
                    text: 'Khôi phục',
                    style: 'destructive',
                    onPress: onRestoreDefaults,
                  },
                ],
              )
            }
            style={[styles.footerButton, !ready && styles.disabled]}
          >
            <Text style={styles.footerButtonText}>Khôi phục</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#e2e8f0',
    flex: 1,
  },
  topBar: {
    alignItems: 'center',
    backgroundColor: '#06324d',
    flexDirection: 'row',
    gap: 12,
    minHeight: 58,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  connectionInfo: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 7,
  },
  connectionDot: {
    backgroundColor: '#94a3b8',
    borderRadius: 5,
    height: 10,
    width: 10,
  },
  connectedDot: {
    backgroundColor: '#22c55e',
  },
  pendingDot: {
    backgroundColor: '#f59e0b',
  },
  errorDot: {
    backgroundColor: '#ef4444',
  },
  connectionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  batteryText: {
    color: '#cbd5e1',
    fontSize: 11,
    marginLeft: 8,
  },
  stopButton: {
    alignItems: 'center',
    backgroundColor: '#dc2626',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    minHeight: 38,
    minWidth: 76,
    paddingHorizontal: 10,
  },
  stopButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
  },
  closeButton: {
    alignItems: 'center',
    backgroundColor: '#f47518',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 5,
    justifyContent: 'center',
    minHeight: 38,
    paddingHorizontal: 10,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },
  tabs: {
    backgroundColor: '#fff',
    borderBottomColor: '#cbd5e1',
    borderBottomWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: 10,
  },
  tabButton: {
    alignItems: 'center',
    borderBottomColor: 'transparent',
    borderBottomWidth: 3,
    flex: 1,
    justifyContent: 'center',
    minHeight: 44,
  },
  tabButtonSelected: {
    borderBottomColor: '#f47518',
  },
  tabText: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '700',
  },
  tabTextSelected: {
    color: '#06324d',
  },
  scrollContent: {
    gap: 12,
    padding: 12,
    paddingBottom: 20,
  },
  tabContent: {
    gap: 12,
  },
  sectionCard: {
    backgroundColor: '#fff',
    borderColor: '#dbe3ec',
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
    padding: 12,
  },
  sectionTitle: {
    color: '#06324d',
    fontSize: 14,
    fontWeight: '800',
  },
  hintText: {
    color: '#64748b',
    fontSize: 11,
    lineHeight: 16,
  },
  wheelTypeOptions: {
    flexDirection: 'row',
    gap: 7,
  },
  wheelTypeButton: {
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderColor: '#cbd5e1',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 38,
  },
  wheelTypeButtonSelected: {
    backgroundColor: '#fff7ed',
    borderColor: '#f47518',
  },
  wheelTypeText: {
    color: '#334155',
    fontSize: 11,
    fontWeight: '700',
  },
  wheelTypeTextSelected: {
    color: '#c2410c',
  },
  diagramCard: {
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    gap: 6,
    padding: 9,
  },
  diagramBody: {
    alignItems: 'center',
    backgroundColor: '#dbeafe',
    borderColor: '#93c5fd',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 68,
    paddingHorizontal: 12,
    width: '100%',
  },
  diagramWheel: {
    alignItems: 'center',
    backgroundColor: '#06324d',
    borderRadius: 7,
    gap: 2,
    minWidth: 48,
    padding: 6,
  },
  diagramWheelName: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },
  diagramWheelSigns: {
    color: '#f9a66c',
    fontSize: 12,
    fontWeight: '800',
  },
  diagramCaption: {
    color: '#64748b',
    fontSize: 10,
  },
  levelOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  levelButton: {
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderColor: '#cbd5e1',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 38,
  },
  levelButtonSelected: {
    backgroundColor: '#06324d',
    borderColor: '#06324d',
  },
  levelText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '800',
  },
  levelTextSelected: {
    color: '#fff',
  },
  speedList: {
    gap: 8,
  },
  speedCard: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
    borderRadius: 9,
    borderWidth: 1,
    gap: 5,
    padding: 9,
  },
  speedTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  speedLabel: {
    color: '#06324d',
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
  },
  speedReadout: {
    color: '#c2410c',
    fontFamily: 'monospace',
    fontSize: 13,
    fontWeight: '800',
  },
  speedControls: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  speedSlider: {
    flex: 1,
    height: 30,
  },
  stepButton: {
    alignItems: 'center',
    backgroundColor: '#e2e8f0',
    borderRadius: 6,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  stepButtonText: {
    color: '#06324d',
    fontSize: 19,
    fontWeight: '700',
  },
  numberInput: {
    backgroundColor: '#fff',
    borderColor: '#cbd5e1',
    borderRadius: 6,
    borderWidth: 1,
    color: '#06324d',
    fontFamily: 'monospace',
    fontSize: 13,
    minWidth: 74,
    paddingHorizontal: 7,
    paddingVertical: 5,
    textAlign: 'center',
  },
  warningText: {
    color: '#b45309',
    fontSize: 11,
    fontWeight: '600',
  },
  testDriveCard: {
    backgroundColor: '#fff',
    borderColor: '#dbe3ec',
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
    padding: 12,
  },
  testDriveContent: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    justifyContent: 'space-around',
  },
  testDriveControls: {
    alignItems: 'center',
    gap: 8,
  },
  miniJoystick: {
    alignItems: 'center',
    backgroundColor: '#042337',
    borderColor: '#0b476b',
    borderRadius: 60,
    borderWidth: 3,
    justifyContent: 'center',
  },
  miniArrowUp: {
    color: '#f9a66c',
    position: 'absolute',
    top: 3,
  },
  miniArrowDown: {
    bottom: 3,
    color: '#f9a66c',
    position: 'absolute',
  },
  miniArrowLeft: {
    color: '#f9a66c',
    left: 3,
    position: 'absolute',
  },
  miniArrowRight: {
    color: '#f9a66c',
    position: 'absolute',
    right: 3,
  },
  miniKnob: {
    backgroundColor: '#f47518',
    borderColor: '#ffad66',
    borderRadius: 18,
    borderWidth: 3,
    height: 36,
    width: 36,
  },
  testRotateRow: {
    flexDirection: 'row',
    gap: 8,
  },
  testRotateButton: {
    alignItems: 'center',
    backgroundColor: '#0b8795',
    borderRadius: 8,
    height: 34,
    justifyContent: 'center',
    width: 46,
  },
  testRotateText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
  },
  wheelPwmGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
    maxWidth: 210,
  },
  wheelPwmCard: {
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 82,
    padding: 7,
  },
  wheelPwmName: {
    color: '#64748b',
    fontSize: 9,
    fontWeight: '800',
  },
  wheelRotation: {
    color: '#f47518',
    fontSize: 18,
    fontWeight: '900',
  },
  wheelPwmValue: {
    color: '#06324d',
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: '700',
  },
  matrixCard: {
    backgroundColor: '#fff',
    borderColor: '#dbe3ec',
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
    padding: 12,
  },
  matrixHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 30,
  },
  matrixHeaderRight: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '700',
  },
  matrixRow: {
    alignItems: 'center',
    borderBottomColor: '#e2e8f0',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    minHeight: 36,
  },
  matrixAxisLabel: {
    color: '#334155',
    flex: 1.4,
    fontSize: 11,
    fontWeight: '700',
  },
  matrixColumn: {
    color: '#64748b',
    flex: 1,
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
  },
  matrixCell: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    minHeight: 34,
  },
  matrixSign: {
    color: '#c2410c',
    fontSize: 17,
    fontWeight: '900',
  },
  motorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  motorCard: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
    borderRadius: 10,
    borderWidth: 1,
    flexBasis: '48%',
    flexGrow: 1,
    gap: 7,
    padding: 9,
  },
  motorName: {
    color: '#06324d',
    fontSize: 12,
    fontWeight: '800',
  },
  motorTestButton: {
    alignItems: 'center',
    backgroundColor: '#06324d',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 7,
    justifyContent: 'center',
    minHeight: 38,
  },
  motorTestButtonPressed: {
    backgroundColor: '#f47518',
  },
  motorTestText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },
  motorOptionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 38,
  },
  settingLabel: {
    color: '#334155',
    fontSize: 11,
    fontWeight: '700',
  },
  numericSetting: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
    minHeight: 38,
  },
  numericInputWrap: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  settingSuffix: {
    color: '#64748b',
    fontSize: 11,
  },
  settingRange: {
    color: '#94a3b8',
    fontSize: 10,
    minWidth: 50,
    textAlign: 'right',
  },
  quickProfiles: {
    flexDirection: 'row',
    gap: 8,
  },
  quickProfileButton: {
    backgroundColor: '#fff',
    borderColor: '#cbd5e1',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    minHeight: 38,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  quickProfileButtonSelected: {
    backgroundColor: '#fff7ed',
    borderColor: '#f47518',
  },
  quickProfileText: {
    color: '#334155',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  quickProfileTextSelected: {
    color: '#c2410c',
  },
  sectionHeadingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  smallActionButton: {
    backgroundColor: '#fff7ed',
    borderRadius: 7,
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  smallActionText: {
    color: '#c2410c',
    fontSize: 10,
    fontWeight: '800',
  },
  profileCard: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
    borderRadius: 9,
    borderWidth: 1,
    gap: 6,
    padding: 9,
  },
  profileNameInput: {
    color: '#06324d',
    fontSize: 13,
    fontWeight: '800',
    minHeight: 32,
    paddingHorizontal: 3,
  },
  profileSummary: {
    color: '#64748b',
    fontFamily: 'monospace',
    fontSize: 10,
  },
  profileActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  smallButton: {
    alignItems: 'center',
    backgroundColor: '#06324d',
    borderRadius: 6,
    flexGrow: 1,
    justifyContent: 'center',
    minHeight: 34,
    paddingHorizontal: 8,
  },
  smallButtonText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  destructiveButton: {
    backgroundColor: '#fee2e2',
  },
  destructiveText: {
    color: '#b91c1c',
  },
  primaryActionButton: {
    alignItems: 'center',
    backgroundColor: '#06324d',
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 38,
  },
  primaryActionText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  importInput: {
    backgroundColor: '#f8fafc',
    borderColor: '#cbd5e1',
    borderRadius: 8,
    borderWidth: 1,
    color: '#334155',
    fontFamily: 'monospace',
    fontSize: 10,
    minHeight: 100,
    padding: 8,
    textAlignVertical: 'top',
  },
  secondaryActionButton: {
    alignItems: 'center',
    backgroundColor: '#e2e8f0',
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 38,
  },
  secondaryActionText: {
    color: '#06324d',
    fontSize: 11,
    fontWeight: '800',
  },
  disabled: {
    opacity: 0.45,
  },
  messageWrap: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  errorText: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderRadius: 8,
    borderWidth: 1,
    color: '#b91c1c',
    fontSize: 11,
    padding: 8,
  },
  bottomBar: {
    backgroundColor: '#fff',
    borderTopColor: '#cbd5e1',
    borderTopWidth: 1,
    gap: 7,
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  syncStatus: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 7,
    minHeight: 22,
  },
  syncDot: {
    backgroundColor: '#94a3b8',
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  syncCopy: {
    flex: 1,
  },
  syncText: {
    color: '#334155',
    fontSize: 10,
    fontWeight: '700',
  },
  syncError: {
    color: '#b91c1c',
    fontSize: 9,
  },
  retryButton: {
    backgroundColor: '#fff7ed',
    borderRadius: 6,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  retryText: {
    color: '#c2410c',
    fontSize: 10,
    fontWeight: '800',
  },
  bottomActions: {
    flexDirection: 'row',
    gap: 6,
  },
  footerButton: {
    alignItems: 'center',
    backgroundColor: '#e2e8f0',
    borderRadius: 7,
    flexDirection: 'row',
    flex: 1,
    gap: 5,
    justifyContent: 'center',
    minHeight: 38,
    paddingHorizontal: 5,
  },
  saveToCarButton: {
    backgroundColor: '#f47518',
    flex: 1.2,
  },
  footerButtonText: {
    color: '#334155',
    fontSize: 10,
    fontWeight: '800',
  },
  saveToCarText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },
});
