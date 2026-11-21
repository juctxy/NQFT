import {
  createDefaultDriveProfile,
  DEFAULT_DRIVE_SETTINGS,
  normalizeDriveSettings,
  setDriveWheelType,
  type DriveSettings,
} from './driveModel';

// Cùng key với bản NQFT (AsyncStorage trên web = localStorage).
export const DRIVE_SETTINGS_STORAGE_KEY = '@nqft/robot-drive-settings';
const LEGACY_KEY = '@nqft/drive-settings';

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Chuyển định dạng cũ (preset1..3 với vMain/vSide) sang hồ sơ mới. */
function migrateLegacy(raw: unknown): DriveSettings {
  const src = isObj(raw) ? raw : {};
  const presets = isObj(src.profiles) ? src.profiles : {};
  const profiles = ['preset1', 'preset2', 'preset3']
    .map((key, i) => {
      const p = isObj(presets[key]) ? presets[key] : null;
      if (!p) return null;
      const base = setDriveWheelType(
        createDefaultDriveProfile(`profile-${i + 1}`, `Hồ sơ ${i + 1}`),
        p.mode === 'omni' || p.mode === 'mecanum' ? p.mode : 'standard',
      );
      const v = typeof p.vMain === 'number' ? p.vMain : 190;
      const speeds = { vFwd: v, vSide: v, vTurn: typeof p.vSide === 'number' ? p.vSide : v };
      return { ...base, levels: { slow: speeds, medium: speeds, fast: speeds } };
    })
    .filter((p) => p !== null);
  return normalizeDriveSettings({
    profiles: profiles.length > 0 ? profiles : DEFAULT_DRIVE_SETTINGS.profiles,
    activeProfileId: profiles[0]?.id ?? DEFAULT_DRIVE_SETTINGS.activeProfileId,
    activeLevel: 'medium',
  });
}

export async function loadDriveSettings(): Promise<DriveSettings> {
  const current = localStorage.getItem(DRIVE_SETTINGS_STORAGE_KEY);
  if (current !== null) return normalizeDriveSettings(JSON.parse(current));
  const legacy = localStorage.getItem(LEGACY_KEY);
  if (legacy !== null) return migrateLegacy(JSON.parse(legacy));
  return normalizeDriveSettings(DEFAULT_DRIVE_SETTINGS);
}

export async function saveDriveSettings(settings: DriveSettings): Promise<void> {
  localStorage.setItem(DRIVE_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}
