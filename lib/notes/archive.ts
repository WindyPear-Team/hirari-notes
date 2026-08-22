import {
  FORMAT_ARCHIVE_VERSION,
  NOTE_ARCHIVE_VERSION,
  type FormatArchive,
  type ImportDisposition,
  type ImportSummary,
  type NoteRecord,
  type NoteSchema,
  type NotesArchive,
} from "./types";
import { validateRecord, validateSchema } from "./schema";

type ImportableArchive = FormatArchive | NotesArchive;

function summary(): ImportSummary {
  return {
    formats: { added: 0, updated: 0, skipped: 0 },
    records: { added: 0, updated: 0, skipped: 0 },
  };
}

export function exportFormats(formats: NoteSchema[]): string {
  const archive: FormatArchive = {
    archiveType: "tsumugi-note-formats",
    schemaVersion: FORMAT_ARCHIVE_VERSION,
    exportedAt: new Date().toISOString(),
    formats,
  };
  return JSON.stringify(archive, null, 2);
}

export function exportNotes(formats: NoteSchema[], records: NoteRecord[]): string {
  const archive: NotesArchive = {
    archiveType: "tsumugi-notes",
    schemaVersion: NOTE_ARCHIVE_VERSION,
    exportedAt: new Date().toISOString(),
    formats,
    records,
  };
  return JSON.stringify(archive, null, 2);
}

export function parseArchive(source: string): ImportableArchive {
  let decoded: unknown;
  try {
    decoded = JSON.parse(source);
  } catch {
    throw new Error("无法读取此文件：它不是有效的 JSON。 ");
  }
  if (!decoded || typeof decoded !== "object") throw new Error("导入文件缺少有效内容。");
  const archive = decoded as Partial<ImportableArchive>;
  if (archive.archiveType !== "tsumugi-note-formats" && archive.archiveType !== "tsumugi-notes") {
    throw new Error("该文件不是 Tsumugi Notes 格式归档。 ");
  }
  if (archive.schemaVersion !== FORMAT_ARCHIVE_VERSION && archive.schemaVersion !== NOTE_ARCHIVE_VERSION) {
    throw new Error("该归档版本暂不受支持。 ");
  }
  if (!Array.isArray(archive.formats)) throw new Error("归档中未找到格式定义。 ");
  archive.formats.forEach((format) => {
    const errors = validateSchema(format);
    if (errors.length) throw new Error(`格式“${format.name || "未命名"}”无效：${errors[0]}`);
  });
  if (archive.archiveType === "tsumugi-notes") {
    if (!Array.isArray(archive.records)) throw new Error("归档中未找到便签数据。 ");
    archive.records.forEach((record) => {
      const format = archive.formats!.find((entry) => entry.id === record.schemaId);
      if (!format) throw new Error(`条目“${record.title}”引用了不存在的格式。`);
      const errors = validateRecord(record, format);
      if (errors.length) throw new Error(`条目“${record.title}”无效：${errors[0]}`);
    });
  }
  return archive as ImportableArchive;
}

function dispositionFor<T extends { id: string; updatedAt: string }>(incoming: T, current?: T): ImportDisposition {
  if (!current) return "added";
  if (Date.parse(incoming.updatedAt) > Date.parse(current.updatedAt)) return "updated";
  return "skipped";
}

export function mergeArchive(
  existingFormats: NoteSchema[],
  existingRecords: NoteRecord[],
  archive: ImportableArchive,
): { formats: NoteSchema[]; records: NoteRecord[]; summary: ImportSummary } {
  const outcome = summary();
  const formats = [...existingFormats];
  const records = [...existingRecords];

  archive.formats.forEach((incoming) => {
    const index = formats.findIndex((format) => format.id === incoming.id);
    const disposition = dispositionFor(incoming, formats[index]);
    outcome.formats[disposition] += 1;
    if (disposition === "added") formats.push(incoming);
    if (disposition === "updated") formats[index] = incoming;
  });

  if (archive.archiveType === "tsumugi-notes") {
    archive.records.forEach((incoming) => {
      const index = records.findIndex((record) => record.id === incoming.id);
      const disposition = dispositionFor(incoming, records[index]);
      outcome.records[disposition] += 1;
      if (disposition === "added") records.push(incoming);
      if (disposition === "updated") records[index] = incoming;
    });
  }
  return { formats, records, summary: outcome };
}
