import {
  DEFAULT_DRIVE_SETTINGS,
  createDefaultDriveProfile,
  normalizeDriveSettings,
  setDriveWheelType,
  type AxisSpeeds,
  type DriveSettingsSnapshot,
  type SpeedLevel,
} from '../drive.ts';

export const DRIVE_SETTINGS_STORAGE_KEY = '@nqft/robot-drive-settings';
const LEGACY_DRIVE_SETTINGS_STORAGE_KEY = '@nqft/drive-settings';

export interface DriveSettingsStorage {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function migrateLegacySettings(value: unknown): DriveSettingsSnapshot {
  const legacy = isRecord(value) ? value : {};
  const oldProfiles = isRecord(legacy.profiles) ? legacy.profiles : {};
  const profileEntries = ['preset1', 'preset2', 'preset3']
    .map((key, index) => {
      const old = isRecord(oldProfiles[key]) ? oldProfiles[key] : null;
      if (!old) return null;
      const profile = setDriveWheelType(
        createDefaultDriveProfile(`profile-${index + 1}`, `Hồ sơ ${index + 1}`),
        old.mode === 'omni' || old.mode === 'mecanum' ? old.mode : 'standard',
      );
      const vFwd = typeof old.vMain === 'number' ? old.vMain : 190;
      const vTurn = typeof old.vSide === 'number' ? old.vSide : vFwd;
      const speeds: AxisSpeeds = { vFwd, vSide: vFwd, vTurn };
      return {
        ...profile,
        levels: { slow: speeds, medium: speeds, fast: speeds } satisfies Record<SpeedLevel, AxisSpeeds>,
      };
    })
    .filter((profile) => profile !== null);
  return normalizeDriveSettings({
    profiles: profileEntries.length > 0
      ? profileEntries
      : DEFAULT_DRIVE_SETTINGS.profiles,
    activeProfileId: profileEntries[0]?.id ?? DEFAULT_DRIVE_SETTINGS.activeProfileId,
    activeLevel: 'medium',
  });
}

export async function loadDriveSettings(
  storage: DriveSettingsStorage,
): Promise<DriveSettingsSnapshot> {
  const storedValue = await storage.getItem(DRIVE_SETTINGS_STORAGE_KEY);
  if (storedValue !== null) {
    return normalizeDriveSettings(JSON.parse(storedValue));
  }

  const legacyValue = await storage.getItem(LEGACY_DRIVE_SETTINGS_STORAGE_KEY);
  if (legacyValue !== null) {
    return migrateLegacySettings(JSON.parse(legacyValue));
  }
  return normalizeDriveSettings(DEFAULT_DRIVE_SETTINGS);
}

export async function saveDriveSettings(
  storage: DriveSettingsStorage,
  settings: DriveSettingsSnapshot,
): Promise<void> {
  await storage.setItem(DRIVE_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}
