// Quản lý hồ sơ lái (chuyển từ ControllerProvider của NQFT): tải/lưu localStorage, hoàn tác 1 bước.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  DEFAULT_DRIVE_SETTINGS,
  normalizeDriveProfile,
  normalizeDriveSettings,
  type DriveProfile,
  type DriveSettings,
  type SpeedLevel,
} from './driveModel';
import { loadDriveSettings, saveDriveSettings } from './storage';

export interface ControllerValue {
  driveSettings: DriveSettings;
  activeDriveProfile: DriveProfile;
  driveSettingsReady: boolean;
  canUndoDriveSettings: boolean;
  updateDriveProfile: (p: DriveProfile) => void;
  selectSpeedLevel: (l: SpeedLevel) => void;
  undoDriveSettings: () => void;
  restoreDriveSettings: () => void;
}

const Ctx = createContext<ControllerValue | null>(null);
const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

export function ControllerProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<DriveSettings>(DEFAULT_DRIVE_SETTINGS);
  const [ready, setReady] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const current = useRef(settings);
  const previous = useRef<DriveSettings | null>(null);
  const revision = useRef(0);
  const savedRevision = useRef<number | null>(null);
  current.current = settings;

  useEffect(() => {
    let alive = true;
    loadDriveSettings().then(
      (s) => {
        if (!alive) return;
        const n = normalizeDriveSettings(s);
        current.current = n;
        setSettings(n);
        setReady(true);
      },
      (e) => {
        if (!alive) return;
        setReady(true);
        console.warn(`Không thể tải cài đặt đã lưu: ${message(e)}`);
      },
    );
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!ready || savedRevision.current === revision.current) return;
    savedRevision.current = revision.current;
    saveDriveSettings(settings).catch((e) => console.warn(`Không thể lưu cài đặt trên điện thoại: ${message(e)}`));
  }, [settings, ready]);

  const commit = useCallback((next: DriveSettings) => {
    const n = normalizeDriveSettings(next);
    previous.current = current.current;
    current.current = n;
    revision.current += 1;
    setCanUndo(true);
    setSettings(n);
  }, []);

  const updateDriveProfile = useCallback(
    (p: DriveProfile) => {
      const s = current.current;
      commit({ ...s, profiles: s.profiles.map((q) => (q.id === p.id ? normalizeDriveProfile(p) : q)) });
    },
    [commit],
  );
  const selectSpeedLevel = useCallback(
    (l: SpeedLevel) => {
      const s = current.current;
      if (s.activeLevel !== l) commit({ ...s, activeLevel: l });
    },
    [commit],
  );
  const undoDriveSettings = useCallback(() => {
    const prev = previous.current;
    if (!prev) return;
    const n = normalizeDriveSettings(prev);
    previous.current = null;
    current.current = n;
    revision.current += 1;
    setCanUndo(false);
    setSettings(n);
  }, []);
  const restoreDriveSettings = useCallback(() => {
    commit(DEFAULT_DRIVE_SETTINGS);
  }, [commit]);

  const activeDriveProfile = useMemo(
    () => settings.profiles.find((p) => p.id === settings.activeProfileId) ?? settings.profiles[0],
    [settings],
  );

  const value = useMemo<ControllerValue>(
    () => ({
      driveSettings: settings,
      activeDriveProfile,
      driveSettingsReady: ready,
      canUndoDriveSettings: canUndo,
      updateDriveProfile,
      selectSpeedLevel,
      undoDriveSettings,
      restoreDriveSettings,
    }),
    [settings, activeDriveProfile, ready, canUndo, updateDriveProfile, selectSpeedLevel, undoDriveSettings, restoreDriveSettings],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useController(): ControllerValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useController must be used within ControllerProvider');
  return v;
}
