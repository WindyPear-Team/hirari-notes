export const FORMAT_ARCHIVE_VERSION = 1;
export const NOTE_ARCHIVE_VERSION = 1;

export type FieldKind =
  | "text"
  | "multiline"
  | "number"
  | "secret"
  | "url"
  | "date"
  | "boolean"
  | "select"
  | "multiSelect";

export type FieldValue = string | number | boolean | string[] | null;

export interface FieldOption {
  id: string;
  label: string;
}

export interface NoteField {
  id: string;
  label: string;
  kind: FieldKind;
  required: boolean;
  placeholder?: string;
  helpText?: string;
  defaultValue?: FieldValue;
  options?: FieldOption[];
}

export interface NoteSchema {
  id: string;
  name: string;
  description?: string;
  icon: string;
  color: string;
  version: number;
  fields: NoteField[];
  createdAt: string;
  updatedAt: string;
}

export interface NoteRecord {
  id: string;
  schemaId: string;
  schemaVersion: number;
  title: string;
  data: Record<string, FieldValue>;
  tags: string[];
  revision: number;
  deviceId: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface NoteState {
  schemas: NoteSchema[];
  records: NoteRecord[];
  deviceId: string;
}

export interface FormatArchive {
  archiveType: "tsumugi-note-formats";
  schemaVersion: typeof FORMAT_ARCHIVE_VERSION;
  exportedAt: string;
  formats: NoteSchema[];
}

export interface NotesArchive {
  archiveType: "tsumugi-notes";
  schemaVersion: typeof NOTE_ARCHIVE_VERSION;
  exportedAt: string;
  formats: NoteSchema[];
  records: NoteRecord[];
}

export type ImportDisposition = "added" | "updated" | "skipped";

export interface ImportSummary {
  formats: Record<ImportDisposition, number>;
  records: Record<ImportDisposition, number>;
}

export const FIELD_KINDS: Array<{ value: FieldKind; label: string }> = [
  { value: "text", label: "单行文本" },
  { value: "multiline", label: "多行文本" },
  { value: "number", label: "数字" },
  { value: "secret", label: "密码 / 密钥" },
  { value: "url", label: "网址" },
  { value: "date", label: "日期" },
  { value: "boolean", label: "开关" },
  { value: "select", label: "单选" },
  { value: "multiSelect", label: "多选" },
];
