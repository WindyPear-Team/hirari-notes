import type { NoteRecord } from "@/lib/notes/types";
import type { SyncManifest, SyncManifestEntry } from "./types";

export function recordHash(record: NoteRecord): string {
  const source = JSON.stringify({
    id: record.id,
    schemaId: record.schemaId,
    schemaVersion: record.schemaVersion,
    title: record.title,
    data: record.data,
    tags: record.tags,
    revision: record.revision,
    deletedAt: record.deletedAt,
  });
  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}

export function createManifest(records: NoteRecord[], deviceId: string): SyncManifest {
  const entries: SyncManifestEntry[] = records.map((record) => ({
    id: record.id,
    revision: record.revision,
    updatedAt: record.updatedAt,
    deletedAt: record.deletedAt,
    contentHash: recordHash(record),
  }));
  return { manifestVersion: 1, generatedAt: new Date().toISOString(), deviceId, records: entries };
}
