import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DEFAULT_DRIVE_SETTINGS,
  normalizeDriveProfile,
  normalizeDriveSettings,
  type DriveProfile,
  type DriveSettingsSnapshot,
  type SpeedLevel,
} from '../drive';
import { loadDriveSettings, saveDriveSettings } from './driveSettingsStorage';

interface ControllerContextValue {
  driveSettings: DriveSettingsSnapshot;
  activeDriveProfile: DriveProfile;
  driveSettingsReady: boolean;
  driveSettingsError: string | null;
  canUndoDriveSettings: boolean;
  updateDriveProfile: (profile: DriveProfile) => void;
  selectDriveProfile: (id: string) => void;
  selectSpeedLevel: (level: SpeedLevel) => void;
  addDriveProfile: (profile: DriveProfile) => void;
  createDriveProfile: (name: string) => void;
  duplicateDriveProfile: (id: string) => void;
  renameDriveProfile: (id: string, name: string) => void;
  deleteDriveProfile: (id: string) => void;
  undoDriveSettings: () => void;
  restoreDriveSettings: () => void;
}

const ControllerContext = createContext<ControllerContextValue | null>(null);

export function ControllerProvider({ children }: { children: ReactNode }) {
  const [driveSettings, setDriveSettings] =
    useState<DriveSettingsSnapshot>(DEFAULT_DRIVE_SETTINGS);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const snapshotRef = useRef(driveSettings);
  const undoSnapshotRef = useRef<DriveSettingsSnapshot | null>(null);
  const revisionRef = useRef(0);
  const persistedRevisionRef = useRef<number | null>(null);
  const writeQueueRef = useRef<Promise<void>>(Promise.resolve());
  const errorRef = useRef(error);
  snapshotRef.current = driveSettings;
  errorRef.current = error;

  useEffect(() => {
    let active = true;
    void loadDriveSettings(AsyncStorage).then(
      (settings) => {
        if (!active) return;
        const normalized = normalizeDriveSettings(settings);
        snapshotRef.current = normalized;
        setDriveSettings(normalized);
        setReady(true);
      },
      (loadError: unknown) => {
        if (!active) return;
        setReady(true);
        const message = loadError instanceof Error ? loadError.message : String(loadError);
        setError(`Không thể tải cài đặt đã lưu: ${message}`);
      },
    );
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!ready || persistedRevisionRef.current === revisionRef.current) return;
    const revision = revisionRef.current;
    persistedRevisionRef.current = revision;
    let active = true;
    const write = writeQueueRef.current.then(() =>
      saveDriveSettings(AsyncStorage, driveSettings),
    );
    writeQueueRef.current = write.catch(() => undefined);
    void write.then(
      () => {
        if (active && errorRef.current?.startsWith('Không thể lưu')) setError(null);
      },
      (writeError: unknown) => {
        if (!active) return;
        const message = writeError instanceof Error ? writeError.message : String(writeError);
        setError(`Không thể lưu cài đặt trên điện thoại: ${message}`);
      },
    );
    return () => {
      active = false;
    };
  }, [driveSettings, ready]);

  const commitSnapshot = useCallback((next: DriveSettingsSnapshot) => {
    const normalized = normalizeDriveSettings(next);
    undoSnapshotRef.current = snapshotRef.current;
    snapshotRef.current = normalized;
    revisionRef.current += 1;
    setCanUndo(true);
    setDriveSettings(normalized);
  }, []);

  const updateDriveProfile = useCallback(
    (profile: DriveProfile) => {
      const current = snapshotRef.current;
      commitSnapshot({
        ...current,
        profiles: current.profiles.map((item) =>
          item.id === profile.id ? normalizeDriveProfile(profile) : item,
        ),
      });
    },
    [commitSnapshot],
  );

  const selectDriveProfile = useCallback(
    (id: string) => {
      const current = snapshotRef.current;
      if (!current.profiles.some((profile) => profile.id === id)) return;
      if (current.activeProfileId === id) return;
      commitSnapshot({ ...current, activeProfileId: id });
    },
    [commitSnapshot],
  );

  const selectSpeedLevel = useCallback(
    (level: SpeedLevel) => {
      const current = snapshotRef.current;
      if (current.activeLevel === level) return;
      commitSnapshot({ ...current, activeLevel: level });
    },
    [commitSnapshot],
  );

  const createDriveProfile = useCallback(
    (name: string) => {
      const current = snapshotRef.current;
      const source = current.profiles.find(
        (profile) => profile.id === current.activeProfileId,
      );
      if (!source) return;
      const id = `profile-${Date.now()}`;
      commitSnapshot({
        ...current,
        profiles: [...current.profiles, { ...source, id, name: name.trim() || 'Hồ sơ mới' }],
        activeProfileId: id,
      });
    },
    [commitSnapshot],
  );

  const addDriveProfile = useCallback(
    (profile: DriveProfile) => {
      const current = snapshotRef.current;
      const imported = normalizeDriveProfile(profile);
      const id = `import-${Date.now()}`;
      commitSnapshot({
        ...current,
        profiles: [...current.profiles, { ...imported, id }],
        activeProfileId: id,
      });
    },
    [commitSnapshot],
  );

  const duplicateDriveProfile = useCallback(
    (id: string) => {
      const current = snapshotRef.current;
      const source = current.profiles.find((profile) => profile.id === id);
      if (!source) return;
      const newId = `profile-${Date.now()}`;
      commitSnapshot({
        ...current,
        profiles: [
          ...current.profiles,
          { ...source, id: newId, name: `${source.name} - Bản sao` },
        ],
        activeProfileId: newId,
      });
    },
    [commitSnapshot],
  );

  const renameDriveProfile = useCallback(
    (id: string, name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      const current = snapshotRef.current;
      commitSnapshot({
        ...current,
        profiles: current.profiles.map((profile) =>
          profile.id === id ? { ...profile, name: trimmed.slice(0, 40) } : profile,
        ),
      });
    },
    [commitSnapshot],
  );

  const deleteDriveProfile = useCallback(
    (id: string) => {
      const current = snapshotRef.current;
      if (current.profiles.length <= 1) return;
      const profiles = current.profiles.filter((profile) => profile.id !== id);
      const activeProfileId = current.activeProfileId === id
        ? profiles[0].id
        : current.activeProfileId;
      commitSnapshot({ ...current, profiles, activeProfileId });
    },
    [commitSnapshot],
  );

  const undoDriveSettings = useCallback(() => {
    const previous = undoSnapshotRef.current;
    if (!previous) return;
    const normalized = normalizeDriveSettings(previous);
    undoSnapshotRef.current = null;
    snapshotRef.current = normalized;
    revisionRef.current += 1;
    setCanUndo(false);
    setDriveSettings(normalized);
  }, []);

  const restoreDriveSettings = useCallback(() => {
    commitSnapshot(DEFAULT_DRIVE_SETTINGS);
    setError(null);
  }, [commitSnapshot]);

  const activeDriveProfile = useMemo(
    () =>
      driveSettings.profiles.find(
        (profile) => profile.id === driveSettings.activeProfileId,
      ) ?? driveSettings.profiles[0],
    [driveSettings],
  );

  const value = useMemo(
    () => ({
      driveSettings,
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
    [
      driveSettings,
      activeDriveProfile,
      ready,
      error,
      canUndo,
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
