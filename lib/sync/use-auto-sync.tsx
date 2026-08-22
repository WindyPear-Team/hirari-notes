import { useCallback, useEffect, useRef } from "react";
import { AppState } from "react-native";

import { useNotes } from "@/lib/notes/notes-provider";
import { executeSync } from "./sync-service";
import { useSync } from "./sync-provider";

export function useAutoSync() {
  const { isReady: notesReady, records, deviceId, applySyncedRecords, lastLocalChangeAt } = useNotes();
  const { isReady: syncReady, profiles, bases, saveBase, saveProfile, appendConflicts } = useSync();
  const running = useRef(false);
  const startupHandled = useRef(false);
  const handledLocalChange = useRef(0);

  const syncEnabledProfiles = useCallback(async () => {
    if (!notesReady || !syncReady || running.current) return;
    const enabled = profiles.filter((profile) => profile.enabled);
    if (!enabled.length) return;
    running.current = true;
    try {
      let currentRecords = records;
      for (const profile of enabled) {
        try {
          const result = await executeSync(profile, currentRecords, deviceId, bases.find((base) => base.profileId === profile.id));
          currentRecords = result.records;
          await saveBase(result.base);
          await appendConflicts(result.conflicts);
          await saveProfile({ ...profile, lastSyncedAt: new Date().toISOString(), lastError: undefined });
        } catch (error) {
          await saveProfile({ ...profile, lastError: error instanceof Error ? error.message : "自动同步失败。" });
        }
      }
      if (currentRecords !== records) await applySyncedRecords(currentRecords);
    } finally {
      running.current = false;
    }
  }, [appendConflicts, applySyncedRecords, bases, deviceId, notesReady, profiles, records, saveBase, saveProfile, syncReady]);

  useEffect(() => {
    if (!notesReady || !syncReady || startupHandled.current) return;
    startupHandled.current = true;
    void syncEnabledProfiles();
  }, [notesReady, syncEnabledProfiles, syncReady]);

  useEffect(() => {
    if (!lastLocalChangeAt || handledLocalChange.current === lastLocalChangeAt) return;
    handledLocalChange.current = lastLocalChangeAt;
    void syncEnabledProfiles();
  }, [lastLocalChangeAt, syncEnabledProfiles]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (status) => {
      if (status === "active") void syncEnabledProfiles();
    });
    return () => subscription.remove();
  }, [syncEnabledProfiles]);
}
