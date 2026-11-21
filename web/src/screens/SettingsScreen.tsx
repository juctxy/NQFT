// Màn hình Settings — chuyển từ SettingsScreen của NQFT.
// Các chức năng cần giao thức cấu hình của bản gốc (Lưu vào xe, Kiểm tra từng động cơ) báo rõ là
// firmware hiện tại chưa hỗ trợ; mọi thay đổi hồ sơ vẫn lưu trên điện thoại và mức tốc độ/giới hạn
// được dùng ngay khi tính lệnh lái.
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { ArrowLeftCircle, Download, RotateCcw, Save, Square, Triangle } from 'lucide-react';
import {
  clampJoystick,
  mixDrive,
  normalizeDriveProfile,
  normalizeJoystick,
  pwmPercent,
  setDriveWheelType,
  setMatrixSign,
  SPEED_LEVEL_LABELS,
  SPEED_LEVELS,
  WHEEL_IDS,
  type DriveAxis,
  type DriveProfile,
  type LevelSpeeds,
  type MatrixSign,
  type SpeedLevel,
  type Vec,
  type WheelId,
  type WheelType,
} from '../drive/driveModel';
import { useController } from '../drive/ControllerContext';
import { useBluetooth } from '../hooks/BluetoothContext';
import { useDriveInput } from '../hooks/useDriveInput';
import { useInstallApp } from '../hooks/useInstallApp';
import { InstallAppSheet } from './InstallAppSheet';
import { Slider, Switch } from '../ui/controls';
import { Pressable, Text, View, type Style } from '../ui/rn';

type Tab = 'speed' | 'motor' | 'profiles';
const TABS: { key: Tab; label: string }[] = [
  { key: 'speed', label: 'Tốc độ' },
  { key: 'motor', label: 'Động cơ' },
  { key: 'profiles', label: 'Hồ sơ' },
];
const SPEED_LABELS: Record<keyof LevelSpeeds, string> = {
  vFwd: 'Tiến / lùi (V_fwd)',
  vSide: 'Di chuyển ngang (V_side)',
  vTurn: 'Quay tại chỗ (V_turn)',
};
const NOT_SUPPORTED = 'Firmware ESP32 hiện tại chỉ nhận lệnh ga/lái (gói 4 byte), chưa hỗ trợ chức năng này.';

const wheelTypeName = (p: { wheelType: WheelType }) =>
  p.wheelType === 'standard' ? 'Standard' : p.wheelType === 'omni' ? 'Omni' : 'Mecanum';

function MatrixSignText({ sign }: { sign: MatrixSign }) {
  return <Text style={s.matrixSign}>{sign === 1 ? '+' : sign === -1 ? '−' : '0'}</Text>;
}

function WheelDiagram({ profile }: { profile: DriveProfile }) {
  return (
    <View style={s.diagramCard}>
      <View style={s.diagramBody}>
        {WHEEL_IDS.map((w) => (
          <View key={w} style={s.diagramWheel}>
            <Text style={s.diagramWheelName}>{w.toUpperCase()}</Text>
            <Text style={s.diagramWheelSigns}>
              {profile.matrix.fwd[w] > 0 ? '↑' : profile.matrix.fwd[w] < 0 ? '↓' : '·'}
              {'  '}
              {profile.matrix.side[w] > 0 ? '→' : profile.matrix.side[w] < 0 ? '←' : '·'}
            </Text>
          </View>
        ))}
      </View>
      <Text style={s.diagramCaption}>Bố trí bánh nhìn từ trên xuống · {wheelTypeName(profile)}</Text>
    </View>
  );
}

/** Ô nhập số có kẹp giá trị khi rời ô / Enter. */
function NumberInput({ value, onCommit, maxLength, placeholder, label }: { value: string; onCommit: (raw: string) => void; maxLength: number; placeholder: string; label: string }) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  return (
    <input
      className="rn-input"
      aria-label={label}
      inputMode="numeric"
      maxLength={maxLength}
      placeholder={placeholder}
      value={text}
      style={s.numberInput}
      onFocus={(e) => e.currentTarget.select()}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => onCommit(text)}
      onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
    />
  );
}

function SpeedSetting({ label, value, minPwm, disabled, onChange }: { label: string; value: number; minPwm: number; disabled?: boolean; onChange: (v: number) => void }) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  const commit = (v: number) => {
    const n = Math.max(0, Math.min(255, Math.round(v)));
    setDraft(n);
    onChange(n);
  };
  const lowPwm = value > 0 && value < minPwm;
  return (
    <View style={s.speedCard}>
      <View style={s.speedTitleRow}>
        <Text style={s.speedLabel}>{label}</Text>
        <Text style={s.speedReadout}>
          {value} · {pwmPercent(value)}%
        </Text>
      </View>
      <View style={s.speedControls}>
        <Pressable label={`Giảm ${label}`} disabled={disabled || value <= 0} onPress={() => commit(value - 1)} style={[s.stepButton, (disabled || value <= 0) && s.disabled]}>
          <Text style={s.stepButtonText}>−</Text>
        </Pressable>
        <Slider
          label={label}
          disabled={disabled}
          min={0}
          max={255}
          value={draft}
          onValueChange={(v) => setDraft(Math.round(v))}
          onSlidingComplete={commit}
          minimumTrackTintColor="#f47518"
          maximumTrackTintColor="#cbd5e1"
          thumbTintColor="#f47518"
          style={s.speedSlider}
        />
        <Pressable label={`Tăng ${label}`} disabled={disabled || value >= 255} onPress={() => commit(value + 1)} style={[s.stepButton, (disabled || value >= 255) && s.disabled]}>
          <Text style={s.stepButtonText}>+</Text>
        </Pressable>
        <NumberInput
          label={`Nhập giá trị ${label}`}
          maxLength={3}
          placeholder="PWM"
          value={String(draft)}
          onCommit={(raw) => {
            const n = Number(raw);
            if (raw.trim() !== '' && Number.isFinite(n)) commit(n);
            else setDraft(value);
          }}
        />
      </View>
      {lowPwm ? <Text style={s.warningText}>PWM đang dưới mức tối thiểu của động cơ ({minPwm}).</Text> : null}
    </View>
  );
}

function NumericSetting({ label, value, min, max, suffix, onChange }: { label: string; value: number; min: number; max: number; suffix?: string; onChange: (v: number) => void }) {
  return (
    <View style={s.numericSetting}>
      <Text style={s.settingLabel}>{label}</Text>
      <View style={s.numericInputWrap}>
        <NumberInput
          label={label}
          maxLength={4}
          placeholder="Nhập giá trị"
          value={String(value)}
          onCommit={(raw) => {
            const n = Number(raw);
            onChange(raw.trim() !== '' && Number.isFinite(n) ? Math.max(min, Math.min(max, Math.round(n))) : value);
          }}
        />
        {suffix ? <Text style={s.settingSuffix}>{suffix}</Text> : null}
        <Text style={s.settingRange}>
          {min}–{max}
        </Text>
      </View>
    </View>
  );
}

/** Ô "Chạy thử": joystick nhỏ + PWM tính được cho 4 bánh; đồng thời gửi lệnh lái thật. */
function TestDrive({ profile, level, onControlChange, onRotateChange }: { profile: DriveProfile; level: SpeedLevel; onControlChange: (v: Vec) => void; onRotateChange: (r: number) => void }) {
  const [knob, setKnob] = useState<Vec>({ x: 0, y: 0 });
  const [joy, setJoy] = useState<Vec>({ x: 0, y: 0 });
  const [rotate, setRotate] = useState(0);
  const active = useRef<{ id: number; left: number; top: number } | null>(null);

  const move = (cx: number, cy: number) => {
    const a = active.current;
    if (!a) return;
    const o = clampJoystick(cx - a.left - 59, cy - a.top - 59, 37);
    const n = normalizeJoystick(o.x / 37, -o.y / 37);
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
    <View style={s.testDriveCard}>
      <Text style={s.sectionTitle}>Chạy thử</Text>
      <View style={s.testDriveContent}>
        <View style={s.testDriveControls}>
          <View
            className="rn-touch"
            style={[s.miniJoystick, { width: 118, height: 118 }]}
            onPointerDown={(e) => {
              if (active.current) return;
              const r = e.currentTarget.getBoundingClientRect();
              e.currentTarget.setPointerCapture(e.pointerId);
              active.current = { id: e.pointerId, left: r.left, top: r.top };
              move(e.clientX, e.clientY);
            }}
            onPointerMove={(e) => active.current?.id === e.pointerId && move(e.clientX, e.clientY)}
            onPointerUp={end}
            onPointerCancel={end}
            onLostPointerCapture={end}
          >
            <Text style={s.miniArrowUp}>↑</Text>
            <Text style={s.miniArrowDown}>↓</Text>
            <Text style={s.miniArrowLeft}>←</Text>
            <Text style={s.miniArrowRight}>→</Text>
            <View style={[s.miniKnob, { transform: `translate(${knob.x}px, ${knob.y}px)`, pointerEvents: 'none' }]} />
          </View>
          {profile.wheelType !== 'standard' ? (
            <View style={s.testRotateRow}>
              <Pressable label="Giữ để xoay trái khi chạy thử" style={s.testRotateButton} {...rot(-1)}>
                <Text style={s.testRotateText}>↶</Text>
              </Pressable>
              <Pressable label="Giữ để xoay phải khi chạy thử" style={s.testRotateButton} {...rot(1)}>
                <Text style={s.testRotateText}>↷</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
        <View style={s.wheelPwmGrid}>
          {WHEEL_IDS.map((w) => (
            <View key={w} style={s.wheelPwmCard}>
              <Text style={s.wheelPwmName}>{w.toUpperCase()}</Text>
              <Text style={s.wheelRotation}>{pwm[w] > 0 ? '↻' : pwm[w] < 0 ? '↺' : '·'}</Text>
              <Text style={s.wheelPwmValue}>{Math.abs(Math.round(pwm[w]))} PWM</Text>
            </View>
          ))}
        </View>
      </View>
      <Text style={s.hintText}>Hướng quay và PWM được tính trực tiếp từ ma trận, mức tốc độ và thông số từng bánh.</Text>
    </View>
  );
}

function DirectionMatrix({ profile, onUpdate }: { profile: DriveProfile; onUpdate: (p: DriveProfile) => void }) {
  const [open, setOpen] = useState(false);
  const axes: { axis: DriveAxis; label: string }[] = [
    { axis: 'fwd', label: 'Tiến' },
    { axis: 'side', label: 'Ngang' },
    { axis: 'turn', label: 'Quay' },
  ];
  return (
    <View style={s.matrixCard}>
      <Pressable onPress={() => setOpen((v) => !v)} style={s.matrixHeader}>
        <Text style={s.sectionTitle}>Ma trận hướng</Text>
        <Text style={s.matrixHeaderRight}>
          {profile.customMatrix ? 'Tùy chỉnh' : 'Mặc định'} · {open ? 'Ẩn' : 'Hiện'}
        </Text>
      </Pressable>
      {open ? (
        <>
          <View style={s.matrixRow}>
            <Text style={s.matrixAxisLabel}>Trục</Text>
            {WHEEL_IDS.map((w) => (
              <Text key={w} style={s.matrixColumn}>
                {w.toUpperCase()}
              </Text>
            ))}
          </View>
          {axes.map(({ axis, label }) => (
            <View key={axis} style={s.matrixRow}>
              <Text style={s.matrixAxisLabel}>{label}</Text>
              {WHEEL_IDS.map((w: WheelId) => {
                const locked = axis === 'side' && profile.wheelType === 'standard';
                return (
                  <Pressable
                    key={w}
                    label={`${label}, bánh ${w.toUpperCase()}: ${profile.matrix[axis][w]}`}
                    disabled={locked}
                    onPress={() => {
                      const order: MatrixSign[] = [1, -1, 0];
                      const next = order[(order.indexOf(profile.matrix[axis][w]) + 1) % order.length];
                      onUpdate(setMatrixSign(profile, axis, w, next));
                    }}
                    style={[s.matrixCell, locked && s.disabled]}
                  >
                    {locked ? <Text style={s.matrixSign}>—</Text> : <MatrixSignText sign={profile.matrix[axis][w]} />}
                  </Pressable>
                );
              })}
            </View>
          ))}
          <Text style={s.hintText}>Chạm ô để đổi dấu theo thứ tự +, −, 0.</Text>
        </>
      ) : null}
    </View>
  );
}

function SpeedTab({ profile, level, onUpdate, onSelectLevel, onControlChange, onRotateChange }: { profile: DriveProfile; level: SpeedLevel; onUpdate: (p: DriveProfile) => void; onSelectLevel: (l: SpeedLevel) => void; onControlChange: (v: Vec) => void; onRotateChange: (r: number) => void }) {
  return (
    <View style={s.tabContent}>
      <View style={s.sectionCard}>
        <Text style={s.sectionTitle}>Loại bánh xe</Text>
        <View style={s.wheelTypeOptions}>
          {(['standard', 'omni', 'mecanum'] as const).map((t) => (
            <Pressable key={t} selected={profile.wheelType === t} onPress={() => onUpdate(setDriveWheelType(profile, t))} style={[s.wheelTypeButton, profile.wheelType === t && s.wheelTypeButtonSelected]}>
              <Text style={[s.wheelTypeText, profile.wheelType === t && s.wheelTypeTextSelected]}>{wheelTypeName({ wheelType: t })}</Text>
            </Pressable>
          ))}
        </View>
        <WheelDiagram profile={profile} />
      </View>

      <View style={s.sectionCard}>
        <Text style={s.sectionTitle}>Mức tốc độ</Text>
        <View style={s.levelOptions}>
          {SPEED_LEVELS.map((l) => (
            <Pressable key={l} selected={level === l} onPress={() => onSelectLevel(l)} style={[s.levelButton, level === l && s.levelButtonSelected]}>
              <Text style={[s.levelText, level === l && s.levelTextSelected]}>{SPEED_LEVEL_LABELS[l]}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={s.hintText}>Mỗi mức lưu riêng tốc độ từng trục; không nhân theo phần trăm từ mức khác.</Text>
        <View style={s.speedList}>
          {(['vFwd', 'vSide', 'vTurn'] as const)
            .filter((k) => k !== 'vSide' || profile.wheelType !== 'standard')
            .map((k) => (
              <SpeedSetting
                key={`${level}-${k}`}
                label={SPEED_LABELS[k]}
                value={profile.levels[level][k]}
                minPwm={profile.minPwm}
                onChange={(v) => onUpdate({ ...profile, levels: { ...profile.levels, [level]: { ...profile.levels[level], [k]: v } } })}
              />
            ))}
        </View>
      </View>

      <TestDrive profile={profile} level={level} onControlChange={onControlChange} onRotateChange={onRotateChange} />
      <DirectionMatrix profile={profile} onUpdate={onUpdate} />
    </View>
  );
}

function MotorTab({ profile, onUpdate, onTestMotor }: { profile: DriveProfile; onUpdate: (p: DriveProfile) => void; onTestMotor: () => void }) {
  const [advanced, setAdvanced] = useState(false);
  const [accel, setAccel] = useState(profile.softAccelMs);
  useEffect(() => setAccel(profile.softAccelMs), [profile.softAccelMs]);
  return (
    <View style={s.tabContent}>
      <View style={s.sectionCard}>
        <Text style={s.sectionTitle}>Kiểm tra từng động cơ</Text>
        <Text style={s.hintText}>Nhấn giữ để quay ở PWM thấp; thả ra để dừng.</Text>
        <View style={s.motorGrid}>
          {WHEEL_IDS.map((w) => (
            <View key={w} style={s.motorCard}>
              <Text style={s.motorName}>Bánh {w.toUpperCase()}</Text>
              <Pressable label={`Nhấn giữ để kiểm tra động cơ ${w.toUpperCase()}`} onPressIn={onTestMotor} style={({ pressed }) => [s.motorTestButton, pressed && s.motorTestButtonPressed]}>
                <Triangle color="#fff" size={18} />
                <Text style={s.motorTestText}>KIỂM TRA</Text>
              </Pressable>
              <View style={s.motorOptionRow}>
                <Text style={s.settingLabel}>Đảo chiều</Text>
                <Switch
                  label={`Đảo chiều động cơ ${w.toUpperCase()}`}
                  value={profile.motors[w].inverted}
                  onValueChange={(v) => onUpdate({ ...profile, motors: { ...profile.motors, [w]: { ...profile.motors[w], inverted: v } } })}
                  trackColor={{ false: '#cbd5e1', true: '#f9a66c' }}
                  thumbColor={profile.motors[w].inverted ? '#f47518' : '#f8fafc'}
                />
              </View>
              <NumericSetting
                label="Bù công suất"
                value={profile.motors[w].compensation}
                min={80}
                max={100}
                suffix="%"
                onChange={(v) => onUpdate({ ...profile, motors: { ...profile.motors, [w]: { ...profile.motors[w], compensation: v } } })}
              />
              <Text style={s.hintText}>Chỉ giảm công suất bánh này.</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={s.sectionCard}>
        <Text style={s.sectionTitle}>Giới hạn động cơ</Text>
        <NumericSetting label="PWM tối thiểu (vùng chết)" value={profile.minPwm} min={0} max={profile.maxLimit} onChange={(v) => onUpdate({ ...profile, minPwm: v })} />
        <NumericSetting label="Giới hạn tốc độ tối đa" value={profile.maxLimit} min={Math.max(1, profile.minPwm)} max={255} onChange={(v) => onUpdate({ ...profile, maxLimit: v })} />
        <Text style={s.hintText}>PWM tối thiểu không thể lớn hơn giới hạn tối đa.</Text>
      </View>

      <View style={s.sectionCard}>
        <Pressable onPress={() => setAdvanced((v) => !v)} style={s.matrixHeader}>
          <Text style={s.sectionTitle}>Nâng cao</Text>
          <Text style={s.matrixHeaderRight}>{advanced ? 'Ẩn' : 'Hiện'}</Text>
        </Pressable>
        {advanced ? (
          <View style={s.speedCard}>
            <View style={s.speedTitleRow}>
              <Text style={s.speedLabel}>Tăng tốc mềm</Text>
              <Text style={s.speedReadout}>{accel} ms</Text>
            </View>
            <Slider
              label="Thời gian tăng tốc mềm"
              min={0}
              max={400}
              step={10}
              value={accel}
              onValueChange={(v) => setAccel(Math.round(v))}
              onSlidingComplete={(v) => onUpdate({ ...profile, softAccelMs: Math.round(v) })}
              minimumTrackTintColor="#f47518"
              maximumTrackTintColor="#cbd5e1"
              thumbTintColor="#f47518"
              style={s.speedSlider}
            />
            <NumericSetting label="Nhập thời gian tăng tốc" value={profile.softAccelMs} min={0} max={400} suffix="ms" onChange={(v) => onUpdate({ ...profile, softAccelMs: v })} />
          </View>
        ) : null}
      </View>
    </View>
  );
}

function SmallButton({ label, onPress, destructive = false }: { label: string; onPress: () => void; destructive?: boolean }) {
  return (
    <Pressable onPress={onPress} style={[s.smallButton, destructive && s.destructiveButton]}>
      <Text style={[s.smallButtonText, destructive && s.destructiveText]}>{label}</Text>
    </Pressable>
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
}: {
  profile: DriveProfile;
  profiles: DriveProfile[];
  activeProfileId: string;
  onSelectProfile: (id: string) => void;
  onUpdateProfile: (p: DriveProfile) => void;
  onCreateProfile: (name: string) => void;
  onDuplicateProfile: (id: string) => void;
  onRenameProfile: (id: string, name: string) => void;
  onDeleteProfile: (id: string) => void;
  onImportProfile: (p: DriveProfile) => void;
}) {
  const [pasted, setPasted] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const exportProfile = () => {
    try {
      const safe = profile.name.replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-|-$/g, '');
      const url = URL.createObjectURL(new Blob([JSON.stringify(profile, null, 2)], { type: 'application/json' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `${safe || 'drive-profile'}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setMessage(`Không thể xuất hồ sơ: ${e instanceof Error ? e.message : String(e)}`);
    }
  };
  const importFile = async (file: File) => {
    try {
      const data: unknown = JSON.parse(await file.text());
      if (typeof data !== 'object' || data === null || Array.isArray(data)) throw new Error('Tệp phải chứa một hồ sơ JSON.');
      onImportProfile(normalizeDriveProfile(data));
      setMessage(null);
    } catch (e) {
      setMessage(`Không thể nhập hồ sơ: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  return (
    <View style={s.tabContent}>
      <View style={s.quickProfiles}>
        {profiles.slice(0, 2).map((p, i) => (
          <Pressable key={p.id} label={`Chọn nhanh hồ sơ ${i === 0 ? 'A' : 'B'}`} selected={activeProfileId === p.id} onPress={() => onSelectProfile(p.id)} style={[s.quickProfileButton, activeProfileId === p.id && s.quickProfileButtonSelected]}>
            <Text style={[s.quickProfileText, activeProfileId === p.id && s.quickProfileTextSelected]}>
              {i === 0 ? 'A' : 'B'} · {p.name}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={s.sectionCard}>
        <View style={s.sectionHeadingRow}>
          <Text style={s.sectionTitle}>Hồ sơ trên điện thoại</Text>
          <Pressable onPress={() => onCreateProfile(`Hồ sơ ${profiles.length + 1}`)} style={s.smallActionButton}>
            <Text style={s.smallActionText}>+ Tạo hồ sơ</Text>
          </Pressable>
        </View>
        {profiles.map((p) => (
          <View key={p.id} style={s.profileCard}>
            <input
              className="rn-input"
              aria-label="Tên hồ sơ"
              defaultValue={p.name}
              placeholder="Tên hồ sơ"
              style={s.profileNameInput}
              onBlur={(e) => onRenameProfile(p.id, e.currentTarget.value)}
              onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
            />
            <Text style={s.profileSummary}>
              {wheelTypeName(p)} · Vừa: {p.levels.medium.vFwd}/{p.levels.medium.vSide}/{p.levels.medium.vTurn}
            </Text>
            <View style={s.profileActions}>
              <SmallButton label="Tải" onPress={() => onSelectProfile(p.id)} />
              <SmallButton
                label="Ghi đè"
                onPress={() => {
                  if (window.confirm(`Ghi đè hồ sơ?\n\nThay toàn bộ cài đặt của “${p.name}” bằng cấu hình hiện tại?`)) onUpdateProfile({ ...profile, id: p.id, name: p.name });
                }}
              />
              <SmallButton label="Nhân bản" onPress={() => onDuplicateProfile(p.id)} />
              <SmallButton
                label="Xóa"
                destructive
                onPress={() => {
                  if (window.confirm(`Xóa hồ sơ?\n\nBạn có chắc muốn xóa “${p.name}”?`)) onDeleteProfile(p.id);
                }}
              />
            </View>
          </View>
        ))}
      </View>

      <View style={s.sectionCard}>
        <Text style={s.sectionTitle}>Xuất / nhập tệp JSON</Text>
        <Text style={s.hintText}>Chia sẻ tệp hồ sơ hoặc chọn tệp JSON đã lưu trên điện thoại.</Text>
        <Pressable onPress={exportProfile} style={s.primaryActionButton}>
          <Text style={s.primaryActionText}>Xuất tệp hồ sơ đang dùng</Text>
        </Pressable>
        <Pressable onPress={() => fileInput.current?.click()} style={s.secondaryActionButton}>
          <Text style={s.secondaryActionText}>Chọn tệp JSON để nhập</Text>
        </Pressable>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,text/json,text/plain,.json"
          hidden
          onChange={(e) => {
            const f = e.currentTarget.files?.[0];
            e.currentTarget.value = '';
            if (f) void importFile(f);
          }}
        />
        <textarea
          className="rn-input"
          aria-label="Dán JSON hồ sơ để nhập"
          placeholder="Dán nội dung JSON hồ sơ vào đây"
          value={pasted}
          onChange={(e) => setPasted(e.target.value)}
          style={s.importInput}
        />
        <Pressable
          disabled={!pasted.trim()}
          onPress={() => {
            try {
              const p = normalizeDriveProfile(JSON.parse(pasted));
              onImportProfile({ ...p, id: `import-${Date.now()}`, name: p.name || 'Hồ sơ nhập' });
              setPasted('');
              setMessage(null);
            } catch (e) {
              setMessage(`Dữ liệu hồ sơ không hợp lệ: ${e instanceof Error ? e.message : String(e)}`);
            }
          }}
          style={[s.secondaryActionButton, !pasted.trim() && s.disabled]}
        >
          <Text style={s.secondaryActionText}>Nhập hồ sơ</Text>
        </Pressable>
        {message ? <Text style={s.warningText}>{message}</Text> : null}
      </View>
    </View>
  );
}

export function SettingsScreen({ onClose }: { onClose: () => void }) {
  const c = useController();
  const bt = useBluetooth();
  const profile = c.activeDriveProfile;
  const level = c.driveSettings.activeLevel;
  const drive = useDriveInput(bt.controlLoop, profile, level, bt.connectionKey);
  const [tab, setTab] = useState<Tab>('speed');
  const [installVisible, setInstallVisible] = useState(false);
  const { standalone } = useInstallApp();
  const connected = Boolean(bt.connectedDevice);
  const ready = c.driveSettingsReady;
  const battery = bt.batteryVoltageMv === null ? 'Pin: —' : `Pin: ${(bt.batteryVoltageMv / 1000).toFixed(2)} V`;

  return (
    <View style={s.screen}>
      <View style={s.topBar}>
        <View style={s.connectionInfo}>
          <View style={[s.connectionDot, connected && s.connectedDot]} />
          <Text style={s.connectionText}>{connected ? 'Đã kết nối với xe' : 'Chưa kết nối'}</Text>
          <Text style={s.batteryText}>{battery}</Text>
        </View>
        {standalone ? null : (
          <Pressable label="Tải app về máy (Android, iPhone)" onPress={() => setInstallVisible(true)} style={s.installButton}>
            <Download color="#f47518" size={16} />
            <Text style={s.installButtonText}>TẢI APP</Text>
          </Pressable>
        )}
        <Pressable label="Dừng xe ngay" onPress={drive.stop} style={s.stopButton}>
          <Square color="#fff" size={14} fill="#fff" />
          <Text style={s.stopButtonText}>DỪNG</Text>
        </Pressable>
        <Pressable
          onPress={() => {
            drive.stop();
            onClose();
          }}
          style={s.closeButton}
        >
          <ArrowLeftCircle color="#fff" size={16} />
          <Text style={s.closeButtonText}>LƯU & ĐÓNG</Text>
        </Pressable>
      </View>

      <View style={s.tabs} role="tablist">
        {TABS.map((t) => (
          <Pressable key={t.key} role="tab" selected={tab === t.key} onPress={() => setTab(t.key)} style={[s.tabButton, tab === t.key && s.tabButtonSelected]}>
            <Text style={[s.tabText, tab === t.key && s.tabTextSelected]}>{t.label}</Text>
          </Pressable>
        ))}
      </View>

      {ready ? (
        <View style={s.scroll}>
          <View style={s.scrollContent}>
            {c.driveSettingsError ? <Text style={s.errorText}>{c.driveSettingsError}</Text> : null}
            {tab === 'speed' ? (
              <SpeedTab profile={profile} level={level} onUpdate={c.updateDriveProfile} onSelectLevel={c.selectSpeedLevel} onControlChange={drive.setJoystick} onRotateChange={drive.setRotate} />
            ) : tab === 'motor' ? (
              <MotorTab profile={profile} onUpdate={c.updateDriveProfile} onTestMotor={() => window.alert(NOT_SUPPORTED)} />
            ) : (
              <ProfilesTab
                profile={profile}
                profiles={c.driveSettings.profiles}
                activeProfileId={c.driveSettings.activeProfileId}
                onSelectProfile={c.selectDriveProfile}
                onUpdateProfile={c.updateDriveProfile}
                onCreateProfile={c.createDriveProfile}
                onDuplicateProfile={c.duplicateDriveProfile}
                onRenameProfile={c.renameDriveProfile}
                onDeleteProfile={c.deleteDriveProfile}
                onImportProfile={c.addDriveProfile}
              />
            )}
          </View>
        </View>
      ) : (
        <View style={s.messageWrap}>
          <Text style={s.hintText}>Đang tải hồ sơ đã lưu…</Text>
        </View>
      )}

      <View style={s.bottomBar}>
        <View style={s.syncStatus}>
          <View style={s.syncDot} />
          <View style={s.syncCopy}>
            <Text style={s.syncText}>Chưa gửi cấu hình</Text>
          </View>
        </View>
        <View style={s.bottomActions}>
          <Pressable label="Hoàn tác thay đổi gần nhất" disabled={!c.canUndoDriveSettings} onPress={c.undoDriveSettings} style={[s.footerButton, !c.canUndoDriveSettings && s.disabled]}>
            <RotateCcw color="#334155" size={14} />
            <Text style={s.footerButtonText}>Hoàn tác</Text>
          </Pressable>
          <Pressable disabled={!ready || !connected} onPress={() => window.alert(NOT_SUPPORTED)} style={[s.footerButton, s.saveToCarButton, (!ready || !connected) && s.disabled]}>
            <Save color="#fff" size={14} />
            <Text style={s.saveToCarText}>Lưu vào xe</Text>
          </Pressable>
          <Pressable
            disabled={!ready}
            onPress={() => {
              if (window.confirm('Khôi phục mặc định?\n\nToàn bộ cấu hình và hồ sơ trên điện thoại sẽ được đặt lại.')) c.restoreDriveSettings();
            }}
            style={[s.footerButton, !ready && s.disabled]}
          >
            <Text style={s.footerButtonText}>Khôi phục</Text>
          </Pressable>
        </View>
      </View>
      {installVisible ? <InstallAppSheet onClose={() => setInstallVisible(false)} /> : null}
    </View>
  );
}

const mono = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
const s: Record<string, Style> = {
  screen: { backgroundColor: '#e2e8f0', flex: '1 1 0%' },
  topBar: { alignItems: 'center', backgroundColor: '#06324d', flexDirection: 'row', gap: 12, minHeight: 58, padding: '8px 12px' },
  connectionInfo: { alignItems: 'center', flex: '1 1 0%', flexDirection: 'row', gap: 7 },
  connectionDot: { backgroundColor: '#94a3b8', borderRadius: 5, height: 10, width: 10 },
  connectedDot: { backgroundColor: '#22c55e' },
  connectionText: { color: '#fff', fontSize: 12, fontWeight: 700 },
  batteryText: { color: '#cbd5e1', fontSize: 11, marginLeft: 8 },
  installButton: { alignItems: 'center', backgroundColor: '#fff', borderRadius: 8, flexDirection: 'row', gap: 5, justifyContent: 'center', minHeight: 38, paddingLeft: 10, paddingRight: 10 },
  installButtonText: { color: '#06324d', fontSize: 10, fontWeight: 800 },
  stopButton: { alignItems: 'center', backgroundColor: '#dc2626', borderRadius: 8, flexDirection: 'row', gap: 6, justifyContent: 'center', minHeight: 38, minWidth: 76, paddingLeft: 10, paddingRight: 10 },
  stopButtonText: { color: '#fff', fontSize: 12, fontWeight: 900 },
  closeButton: { alignItems: 'center', backgroundColor: '#f47518', borderRadius: 8, flexDirection: 'row', gap: 5, justifyContent: 'center', minHeight: 38, paddingLeft: 10, paddingRight: 10 },
  closeButtonText: { color: '#fff', fontSize: 10, fontWeight: 800 },
  tabs: { backgroundColor: '#fff', borderBottom: '1px solid #cbd5e1', flexDirection: 'row', paddingLeft: 10, paddingRight: 10 },
  tabButton: { alignItems: 'center', borderBottomWidth: 3, borderBottomStyle: 'solid', borderBottomColor: 'transparent', flex: '1 1 0%', justifyContent: 'center', minHeight: 44 },
  tabButtonSelected: { borderBottomColor: '#f47518' },
  tabText: { color: '#64748b', fontSize: 13, fontWeight: 700 },
  tabTextSelected: { color: '#06324d' },
  scroll: { flex: '1 1 0%', overflowY: 'auto' },
  scrollContent: { gap: 12, padding: '12px 12px 20px' },
  tabContent: { gap: 12 },
  sectionCard: { backgroundColor: '#fff', borderColor: '#dbe3ec', borderRadius: 12, borderWidth: 1, gap: 10, padding: 12 },
  sectionTitle: { color: '#06324d', fontSize: 14, fontWeight: 800 },
  hintText: { color: '#64748b', fontSize: 11, lineHeight: '16px' },
  wheelTypeOptions: { flexDirection: 'row', gap: 7 },
  wheelTypeButton: { alignItems: 'center', backgroundColor: '#f8fafc', borderColor: '#cbd5e1', borderRadius: 8, borderWidth: 1, flex: '1 1 0%', justifyContent: 'center', minHeight: 38 },
  wheelTypeButtonSelected: { backgroundColor: '#fff7ed', borderColor: '#f47518' },
  wheelTypeText: { color: '#334155', fontSize: 11, fontWeight: 700 },
  wheelTypeTextSelected: { color: '#c2410c' },
  diagramCard: { alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 10, gap: 6, padding: 9 },
  diagramBody: { alignItems: 'center', backgroundColor: '#dbeafe', borderColor: '#93c5fd', borderRadius: 12, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', minHeight: 68, paddingLeft: 12, paddingRight: 12, width: '100%' },
  diagramWheel: { alignItems: 'center', backgroundColor: '#06324d', borderRadius: 7, gap: 2, minWidth: 48, padding: 6 },
  diagramWheelName: { color: '#fff', fontSize: 10, fontWeight: 800 },
  diagramWheelSigns: { color: '#f9a66c', fontSize: 12, fontWeight: 800, whiteSpace: 'pre' },
  diagramCaption: { color: '#64748b', fontSize: 10 },
  levelOptions: { flexDirection: 'row', gap: 8 },
  levelButton: { alignItems: 'center', backgroundColor: '#f1f5f9', borderColor: '#cbd5e1', borderRadius: 8, borderWidth: 1, flex: '1 1 0%', justifyContent: 'center', minHeight: 38 },
  levelButtonSelected: { backgroundColor: '#06324d', borderColor: '#06324d' },
  levelText: { color: '#334155', fontSize: 12, fontWeight: 800 },
  levelTextSelected: { color: '#fff' },
  speedList: { gap: 8 },
  speedCard: { backgroundColor: '#f8fafc', borderColor: '#e2e8f0', borderRadius: 9, borderWidth: 1, gap: 5, padding: 9 },
  speedTitleRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  speedLabel: { color: '#06324d', flex: '1 1 0%', fontSize: 12, fontWeight: 700 },
  speedReadout: { color: '#c2410c', fontFamily: mono, fontSize: 13, fontWeight: 800 },
  speedControls: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  speedSlider: { flex: '1 1 0%', height: 30 },
  stepButton: { alignItems: 'center', backgroundColor: '#e2e8f0', borderRadius: 6, height: 32, justifyContent: 'center', width: 32 },
  stepButtonText: { color: '#06324d', fontSize: 19, fontWeight: 700 },
  numberInput: { backgroundColor: '#fff', border: '1px solid #cbd5e1', borderRadius: 6, color: '#06324d', fontFamily: mono, fontSize: 13, minWidth: 74, padding: '5px 7px', textAlign: 'center' },
  warningText: { color: '#b45309', fontSize: 11, fontWeight: 600 },
  testDriveCard: { backgroundColor: '#fff', borderColor: '#dbe3ec', borderRadius: 12, borderWidth: 1, gap: 10, padding: 12 },
  testDriveContent: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 14, justifyContent: 'space-around' },
  testDriveControls: { alignItems: 'center', gap: 8 },
  miniJoystick: { alignItems: 'center', backgroundColor: '#042337', borderColor: '#0b476b', borderRadius: 60, borderWidth: 3, justifyContent: 'center' },
  miniArrowUp: { color: '#f9a66c', position: 'absolute', top: 3 },
  miniArrowDown: { bottom: 3, color: '#f9a66c', position: 'absolute' },
  miniArrowLeft: { color: '#f9a66c', left: 3, position: 'absolute' },
  miniArrowRight: { color: '#f9a66c', position: 'absolute', right: 3 },
  miniKnob: { backgroundColor: '#f47518', borderColor: '#ffad66', borderRadius: 18, borderWidth: 3, height: 36, width: 36 },
  testRotateRow: { flexDirection: 'row', gap: 8 },
  testRotateButton: { alignItems: 'center', backgroundColor: '#0b8795', borderRadius: 8, height: 34, justifyContent: 'center', width: 46 },
  testRotateText: { color: '#fff', fontSize: 20, fontWeight: 800 },
  wheelPwmGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center', maxWidth: 210 },
  wheelPwmCard: { alignItems: 'center', backgroundColor: '#f8fafc', borderColor: '#e2e8f0', borderRadius: 8, borderWidth: 1, minWidth: 82, padding: 7 },
  wheelPwmName: { color: '#64748b', fontSize: 9, fontWeight: 800 },
  wheelRotation: { color: '#f47518', fontSize: 18, fontWeight: 900 },
  wheelPwmValue: { color: '#06324d', fontFamily: mono, fontSize: 10, fontWeight: 700 },
  matrixCard: { backgroundColor: '#fff', borderColor: '#dbe3ec', borderRadius: 12, borderWidth: 1, gap: 8, padding: 12 },
  matrixHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', minHeight: 30 },
  matrixHeaderRight: { color: '#64748b', fontSize: 10, fontWeight: 700 },
  matrixRow: { alignItems: 'center', borderBottom: '1px solid #e2e8f0', flexDirection: 'row', minHeight: 36 },
  matrixAxisLabel: { color: '#334155', flex: '1.4 1 0%', fontSize: 11, fontWeight: 700 },
  matrixColumn: { color: '#64748b', flex: '1 1 0%', fontSize: 10, fontWeight: 800, textAlign: 'center' },
  matrixCell: { alignItems: 'center', flex: '1 1 0%', justifyContent: 'center', minHeight: 34 },
  matrixSign: { color: '#c2410c', fontSize: 17, fontWeight: 900 },
  motorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  motorCard: { backgroundColor: '#f8fafc', borderColor: '#e2e8f0', borderRadius: 10, borderWidth: 1, flexBasis: '48%', flexGrow: 1, flexShrink: 1, gap: 7, padding: 9 },
  motorName: { color: '#06324d', fontSize: 12, fontWeight: 800 },
  motorTestButton: { alignItems: 'center', backgroundColor: '#06324d', borderRadius: 8, flexDirection: 'row', gap: 7, justifyContent: 'center', minHeight: 38 },
  motorTestButtonPressed: { backgroundColor: '#f47518' },
  motorTestText: { color: '#fff', fontSize: 10, fontWeight: 800 },
  motorOptionRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', minHeight: 38 },
  settingLabel: { color: '#334155', fontSize: 11, fontWeight: 700 },
  numericSetting: { alignItems: 'center', flexDirection: 'row', gap: 8, justifyContent: 'space-between', minHeight: 38 },
  numericInputWrap: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  settingSuffix: { color: '#64748b', fontSize: 11 },
  settingRange: { color: '#94a3b8', fontSize: 10, minWidth: 50, textAlign: 'right' },
  quickProfiles: { flexDirection: 'row', gap: 8 },
  quickProfileButton: { backgroundColor: '#fff', borderColor: '#cbd5e1', borderRadius: 8, borderWidth: 1, flex: '1 1 0%', minHeight: 38, justifyContent: 'center', paddingLeft: 8, paddingRight: 8 },
  quickProfileButtonSelected: { backgroundColor: '#fff7ed', borderColor: '#f47518' },
  quickProfileText: { color: '#334155', fontSize: 11, fontWeight: 700, textAlign: 'center' },
  quickProfileTextSelected: { color: '#c2410c' },
  sectionHeadingRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  smallActionButton: { backgroundColor: '#fff7ed', borderRadius: 7, padding: '7px 9px' },
  smallActionText: { color: '#c2410c', fontSize: 10, fontWeight: 800 },
  profileCard: { backgroundColor: '#f8fafc', borderColor: '#e2e8f0', borderRadius: 9, borderWidth: 1, gap: 6, padding: 9 },
  profileNameInput: { color: '#06324d', fontSize: 13, fontWeight: 800, minHeight: 32, padding: '0 3px', background: 'transparent', border: 0 },
  profileSummary: { color: '#64748b', fontFamily: mono, fontSize: 10 },
  profileActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  smallButton: { alignItems: 'center', backgroundColor: '#06324d', borderRadius: 6, flexGrow: 1, flexShrink: 1, justifyContent: 'center', minHeight: 34, paddingLeft: 8, paddingRight: 8 },
  smallButtonText: { color: '#fff', fontSize: 10, fontWeight: 700 },
  destructiveButton: { backgroundColor: '#fee2e2' },
  destructiveText: { color: '#b91c1c' },
  primaryActionButton: { alignItems: 'center', backgroundColor: '#06324d', borderRadius: 8, justifyContent: 'center', minHeight: 38 },
  primaryActionText: { color: '#fff', fontSize: 11, fontWeight: 700 },
  importInput: { backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 8, color: '#334155', fontFamily: mono, fontSize: 10, minHeight: 100, padding: 8, resize: 'none' },
  secondaryActionButton: { alignItems: 'center', backgroundColor: '#e2e8f0', borderRadius: 8, justifyContent: 'center', minHeight: 38 },
  secondaryActionText: { color: '#06324d', fontSize: 11, fontWeight: 800 },
  disabled: { opacity: 0.45 },
  messageWrap: { alignItems: 'center', flex: '1 1 0%', justifyContent: 'center' },
  errorText: { backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#b91c1c', fontSize: 11, padding: 8 },
  bottomBar: { backgroundColor: '#fff', borderTop: '1px solid #cbd5e1', gap: 7, padding: '7px 9px' },
  syncStatus: { alignItems: 'center', flexDirection: 'row', gap: 7, minHeight: 22 },
  syncDot: { backgroundColor: '#94a3b8', borderRadius: 4, height: 8, width: 8 },
  syncCopy: { flex: '1 1 0%' },
  syncText: { color: '#334155', fontSize: 10, fontWeight: 700 },
  bottomActions: { flexDirection: 'row', gap: 6 },
  footerButton: { alignItems: 'center', backgroundColor: '#e2e8f0', borderRadius: 7, flexDirection: 'row', flex: '1 1 0%', gap: 5, justifyContent: 'center', minHeight: 38, paddingLeft: 5, paddingRight: 5 },
  saveToCarButton: { backgroundColor: '#f47518', flex: '1.2 1 0%' },
  footerButtonText: { color: '#334155', fontSize: 10, fontWeight: 800 },
  saveToCarText: { color: '#fff', fontSize: 10, fontWeight: 800 },
};

