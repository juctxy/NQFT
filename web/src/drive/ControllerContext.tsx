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
  driveSettingsError: string | null;
  canUndoDriveSettings: boolean;
  updateDriveProfile: (p: DriveProfile) => void;
  selectDriveProfile: (id: string) => void;
  selectSpeedLevel: (l: SpeedLevel) => void;
  addDriveProfile: (p: DriveProfile) => void;
  createDriveProfile: (name: string) => void;
  duplicateDriveProfile: (id: string) => void;
  renameDriveProfile: (id: string, name: string) => void;
  deleteDriveProfile: (id: string) => void;
  undoDriveSettings: () => void;
  restoreDriveSettings: () => void;
}

const Ctx = createContext<ControllerValue | null>(null);
const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

export function ControllerProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<DriveSettings>(DEFAULT_DRIVE_SETTINGS);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const current = useRef(settings);
  const previous = useRef<DriveSettings | null>(null);
  const revision = useRef(0);
  const savedRevision = useRef<number | null>(null);
  const errorRef = useRef(error);
  current.current = settings;
  errorRef.current = error;

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
        setError(`Không thể tải cài đặt đã lưu: ${message(e)}`);
      },
    );
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!ready || savedRevision.current === revision.current) return;
    savedRevision.current = revision.current;
    let alive = true;
    saveDriveSettings(settings).then(
      () => {
        if (alive && errorRef.current?.startsWith('Không thể lưu')) setError(null);
      },
      (e) => {
        if (alive) setError(`Không thể lưu cài đặt trên điện thoại: ${message(e)}`);
      },
    );
    return () => {
      alive = false;
    };
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
  const selectDriveProfile = useCallback(
    (id: string) => {
      const s = current.current;
      if (s.profiles.some((p) => p.id === id) && s.activeProfileId !== id) commit({ ...s, activeProfileId: id });
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
  const createDriveProfile = useCallback(
    (name: string) => {
      const s = current.current;
      const active = s.profiles.find((p) => p.id === s.activeProfileId);
      if (!active) return;
      const id = `profile-${Date.now()}`;
      commit({ ...s, profiles: [...s.profiles, { ...active, id, name: name.trim() || 'Hồ sơ mới' }], activeProfileId: id });
    },
    [commit],
  );
  const addDriveProfile = useCallback(
    (p: DriveProfile) => {
      const s = current.current;
      const id = `import-${Date.now()}`;
      commit({ ...s, profiles: [...s.profiles, { ...normalizeDriveProfile(p), id }], activeProfileId: id });
    },
    [commit],
  );
  const duplicateDriveProfile = useCallback(
    (id: string) => {
      const s = current.current;
      const src = s.profiles.find((p) => p.id === id);
      if (!src) return;
      const nid = `profile-${Date.now()}`;
      commit({ ...s, profiles: [...s.profiles, { ...src, id: nid, name: `${src.name} - Bản sao` }], activeProfileId: nid });
    },
    [commit],
  );
  const renameDriveProfile = useCallback(
    (id: string, name: string) => {
      const n = name.trim();
      if (!n) return;
      const s = current.current;
      commit({ ...s, profiles: s.profiles.map((p) => (p.id === id ? { ...p, name: n.slice(0, 40) } : p)) });
    },
    [commit],
  );
  const deleteDriveProfile = useCallback(
    (id: string) => {
      const s = current.current;
      if (s.profiles.length <= 1) return;
      const rest = s.profiles.filter((p) => p.id !== id);
      commit({ ...s, profiles: rest, activeProfileId: s.activeProfileId === id ? rest[0].id : s.activeProfileId });
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
    setError(null);
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
      driveSettingsError: error,
      canUndoDriveSettings: canUndo,
      updateDriveProfile,
      selectDriveProfile,
      selectSpeedLevel,
      addDriveProfile,
      createDriveProfile,
      duplicateDriveProfile,
      renameDriveProfile,
      deleteDriveProfile,
      undoDriveSettings,
      restoreDriveSettings,
    }),
    [settings, activeDriveProfile, ready, error, canUndo, updateDriveProfile, selectDriveProfile, selectSpeedLevel, addDriveProfile, createDriveProfile, duplicateDriveProfile, renameDriveProfile, deleteDriveProfile, undoDriveSettings, restoreDriveSettings],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useController(): ControllerValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useController must be used within ControllerProvider');
  return v;
}
