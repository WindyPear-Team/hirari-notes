import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { createId } from "@/lib/notes/schema";
import type { ConflictRecord, SyncBase, SyncProfile } from "./types";

const PROFILES_KEY = "tsumugi-notes/sync-profiles-v1";
const BASES_KEY = "tsumugi-notes/sync-bases-v1";
const CONFLICTS_KEY = "tsumugi-notes/sync-conflicts-v1";

interface SyncContextValue {
  isReady: boolean;
  profiles: SyncProfile[];
  bases: SyncBase[];
  conflicts: ConflictRecord[];
  saveProfile: (profile: Omit<SyncProfile, "id" | "createdAt" | "updatedAt"> & { id?: string }) => Promise<SyncProfile>;
  removeProfile: (id: string) => Promise<void>;
  saveBase: (base: SyncBase) => Promise<void>;
  appendConflicts: (entries: ConflictRecord[]) => Promise<void>;
}

const SyncContext = createContext<SyncContextValue | null>(null);

export function SyncProvider({ children }: PropsWithChildren) {
  const [profiles, setProfiles] = useState<SyncProfile[]>([]);
  const [bases, setBases] = useState<SyncBase[]>([]);
  const [conflicts, setConflicts] = useState<ConflictRecord[]>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    Promise.all([AsyncStorage.getItem(PROFILES_KEY), AsyncStorage.getItem(BASES_KEY), AsyncStorage.getItem(CONFLICTS_KEY)])
      .then(([storedProfiles, storedBases, storedConflicts]) => {
        if (storedProfiles) setProfiles(JSON.parse(storedProfiles) as SyncProfile[]);
        if (storedBases) setBases(JSON.parse(storedBases) as SyncBase[]);
        if (storedConflicts) setConflicts(JSON.parse(storedConflicts) as ConflictRecord[]);
      })
      .finally(() => setIsReady(true));
  }, []);

  const saveProfile = useCallback(async (input: Omit<SyncProfile, "id" | "createdAt" | "updatedAt"> & { id?: string }) => {
    const now = new Date().toISOString();
    const current = input.id ? profiles.find((profile) => profile.id === input.id) : undefined;
    const profile: SyncProfile = { ...input, id: input.id ?? createId("sync"), createdAt: current?.createdAt ?? now, updatedAt: now };
    const next = current ? profiles.map((entry) => entry.id === profile.id ? profile : entry) : [profile, ...profiles];
    setProfiles(next);
    await AsyncStorage.setItem(PROFILES_KEY, JSON.stringify(next));
    return profile;
  }, [profiles]);

  const removeProfile = useCallback(async (id: string) => {
    const nextProfiles = profiles.filter((profile) => profile.id !== id);
    const nextBases = bases.filter((base) => base.profileId !== id);
    setProfiles(nextProfiles); setBases(nextBases);
    await Promise.all([AsyncStorage.setItem(PROFILES_KEY, JSON.stringify(nextProfiles)), AsyncStorage.setItem(BASES_KEY, JSON.stringify(nextBases))]);
  }, [bases, profiles]);

  const saveBase = useCallback(async (base: SyncBase) => {
    const next = bases.some((entry) => entry.profileId === base.profileId) ? bases.map((entry) => entry.profileId === base.profileId ? base : entry) : [base, ...bases];
    setBases(next); await AsyncStorage.setItem(BASES_KEY, JSON.stringify(next));
  }, [bases]);

  const appendConflicts = useCallback(async (entries: ConflictRecord[]) => {
    if (!entries.length) return;
    const next = [...entries, ...conflicts];
    setConflicts(next); await AsyncStorage.setItem(CONFLICTS_KEY, JSON.stringify(next));
  }, [conflicts]);

  const value = useMemo(() => ({ isReady, profiles, bases, conflicts, saveProfile, removeProfile, saveBase, appendConflicts }), [appendConflicts, bases, conflicts, isReady, profiles, removeProfile, saveBase, saveProfile]);
  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSync(): SyncContextValue {
  const context = useContext(SyncContext);
  if (!context) throw new Error("useSync 必须在 SyncProvider 中使用。 ");
  return context;
}
