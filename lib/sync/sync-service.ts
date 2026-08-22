import { createManifest } from "./manifest";
import { mergeSnapshots } from "./conflict-merge";
import { pullRemotePayload, pushRemotePayload } from "./remote-gateway";
import type { NoteRecord } from "@/lib/notes/types";
import type { ConflictRecord, SyncBase, SyncProfile } from "./types";

export interface SyncExecutionResult {
  records: NoteRecord[];
  base: SyncBase;
  conflicts: ConflictRecord[];
  pushed: boolean;
  pulled: boolean;
}

export async function executeSync(profile: SyncProfile, localRecords: NoteRecord[], deviceId: string, previousBase?: SyncBase): Promise<SyncExecutionResult> {
  let records = localRecords;
  let conflicts: ConflictRecord[] = [];
  let pulled = false;
  let pushed = false;

  if (profile.direction !== "push") {
    const remote = await pullRemotePayload(profile);
    const result = mergeSnapshots(profile.id, previousBase, localRecords, remote.records, profile.conflictStrategy);
    records = result.records;
    conflicts = result.conflicts;
    pulled = true;
  }
  if (profile.direction !== "pull") {
    const payload = { manifest: createManifest(records, deviceId), records };
    await pushRemotePayload(profile, payload);
    pushed = true;
  }

  return {
    records,
    conflicts,
    pulled,
    pushed,
    base: { profileId: profile.id, records: Object.fromEntries(records.map((record) => [record.id, record])), updatedAt: new Date().toISOString() },
  };
}
