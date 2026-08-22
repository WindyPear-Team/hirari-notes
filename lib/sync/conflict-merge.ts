import { createId } from "../notes/schema";
import type { NoteRecord } from "../notes/types";
import type { ConflictRecord, ConflictStrategy, FieldConflict, MergeResult, SyncBase } from "./types";

type RecordsById = Record<string, NoteRecord>;

function toMap(records: NoteRecord[]): RecordsById {
  return Object.fromEntries(records.map((record) => [record.id, record]));
}

function sameValue(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function chooseByStrategy(local: NoteRecord, remote: NoteRecord, strategy: Exclude<ConflictStrategy, "duplicate">): NoteRecord {
  if (strategy === "local") return local;
  if (strategy === "remote") return remote;
  return Date.parse(local.updatedAt) >= Date.parse(remote.updatedAt) ? local : remote;
}

function resolveRecord(
  profileId: string,
  base: NoteRecord | undefined,
  local: NoteRecord,
  remote: NoteRecord,
  strategy: ConflictStrategy,
): { record: NoteRecord; conflict?: ConflictRecord; duplicate?: NoteRecord } {
  if (!base) {
    if (sameValue(local, remote)) return { record: local };
    const preferred = chooseByStrategy(local, remote, strategy === "duplicate" ? "newer" : strategy);
    if (strategy !== "duplicate") return { record: preferred };
    const duplicate = { ...remote, id: createId("conflict"), title: `${remote.title}（远端冲突副本）`, revision: 1, updatedAt: new Date().toISOString() };
    return {
      record: local,
      duplicate,
      conflict: {
        id: createId("conflictlog"), profileId, recordId: local.id, recordTitle: local.title,
        resolvedAt: new Date().toISOString(), strategy, duplicateRecordId: duplicate.id,
        fields: [{ fieldId: "__record__", localValue: local.title, remoteValue: remote.title, resolution: "duplicated" }],
      },
    };
  }

  const resolvedData: NoteRecord["data"] = { ...base.data };
  const conflicts: FieldConflict[] = [];
  const keys = new Set([...Object.keys(base.data), ...Object.keys(local.data), ...Object.keys(remote.data)]);
  keys.forEach((fieldId) => {
    const baseValue = base.data[fieldId];
    const localValue = local.data[fieldId];
    const remoteValue = remote.data[fieldId];
    const localChanged = !sameValue(baseValue, localValue);
    const remoteChanged = !sameValue(baseValue, remoteValue);
    if (localChanged && !remoteChanged) resolvedData[fieldId] = localValue;
    else if (!localChanged && remoteChanged) resolvedData[fieldId] = remoteValue;
    else if (localChanged && remoteChanged && sameValue(localValue, remoteValue)) resolvedData[fieldId] = localValue;
    else if (localChanged && remoteChanged) {
      const preferred = chooseByStrategy(local, remote, strategy === "duplicate" ? "newer" : strategy);
      resolvedData[fieldId] = preferred.data[fieldId];
      conflicts.push({ fieldId, localValue, remoteValue, resolution: strategy === "duplicate" ? "duplicated" : preferred === local ? "local" : "remote" });
    }
  });

  const localTitleChanged = base.title !== local.title;
  const remoteTitleChanged = base.title !== remote.title;
  const concurrentTitleChange = localTitleChanged && remoteTitleChanged && local.title !== remote.title;
  const preferred = chooseByStrategy(local, remote, strategy === "duplicate" ? "newer" : strategy);
  const resolved: NoteRecord = {
    ...base,
    ...preferred,
    title: concurrentTitleChange ? preferred.title : localTitleChanged ? local.title : remoteTitleChanged ? remote.title : base.title,
    data: resolvedData,
    tags: Array.from(new Set([...local.tags, ...remote.tags])),
    revision: Math.max(local.revision, remote.revision) + 1,
    updatedAt: new Date().toISOString(),
  };
  if (!conflicts.length && !concurrentTitleChange) return { record: resolved };

  if (concurrentTitleChange) {
    conflicts.push({ fieldId: "__title__", localValue: local.title, remoteValue: remote.title, resolution: strategy === "duplicate" ? "duplicated" : preferred === local ? "local" : "remote" });
  }
  const duplicate = strategy === "duplicate"
    ? { ...remote, id: createId("conflict"), title: `${remote.title}（远端冲突副本）`, revision: 1, updatedAt: new Date().toISOString() }
    : undefined;
  return {
    record: resolved,
    duplicate,
    conflict: {
      id: createId("conflictlog"), profileId, recordId: local.id, recordTitle: local.title,
      resolvedAt: new Date().toISOString(), strategy, duplicateRecordId: duplicate?.id, fields: conflicts,
    },
  };
}

export function mergeSnapshots(
  profileId: string,
  base: SyncBase | undefined,
  localRecords: NoteRecord[],
  remoteRecords: NoteRecord[],
  strategy: ConflictStrategy,
): MergeResult {
  const local = toMap(localRecords);
  const remote = toMap(remoteRecords);
  const baseRecords = base?.records ?? {};
  const ids = new Set([...Object.keys(local), ...Object.keys(remote)]);
  const records: NoteRecord[] = [];
  const conflicts: ConflictRecord[] = [];

  ids.forEach((id) => {
    const localRecord = local[id];
    const remoteRecord = remote[id];
    if (!localRecord) { records.push(remoteRecord); return; }
    if (!remoteRecord) { records.push(localRecord); return; }
    const result = resolveRecord(profileId, baseRecords[id], localRecord, remoteRecord, strategy);
    records.push(result.record);
    if (result.duplicate) records.push(result.duplicate);
    if (result.conflict) conflicts.push(result.conflict);
  });
  return { records, conflicts };
}
