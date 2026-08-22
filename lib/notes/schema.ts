import type { FieldKind, FieldValue, NoteField, NoteRecord, NoteSchema } from "./types";

const allowedKinds: FieldKind[] = [
  "text",
  "multiline",
  "number",
  "secret",
  "url",
  "date",
  "boolean",
  "select",
  "multiSelect",
];

export function createId(prefix: string): string {
  const random = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now().toString(36)}${random}`;
}

export function isFieldValueCompatible(kind: FieldKind, value: unknown): value is FieldValue {
  if (value === null) return true;
  if (["text", "multiline", "secret", "url", "date", "select"].includes(kind)) {
    return typeof value === "string";
  }
  if (kind === "number") return typeof value === "number" && Number.isFinite(value);
  if (kind === "boolean") return typeof value === "boolean";
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}

export function validateField(field: NoteField): string[] {
  const errors: string[] = [];
  if (!field.id.trim()) errors.push("字段 ID 不能为空。");
  if (!field.label.trim()) errors.push("字段名称不能为空。");
  if (!allowedKinds.includes(field.kind)) errors.push("字段类型不受支持。");
  if (["select", "multiSelect"].includes(field.kind) && !field.options?.length) {
    errors.push("单选和多选字段至少需要一个选项。");
  }
  if (field.defaultValue !== undefined && !isFieldValueCompatible(field.kind, field.defaultValue)) {
    errors.push("默认值与字段类型不匹配。");
  }
  return errors;
}

export function validateSchema(schema: NoteSchema): string[] {
  const errors: string[] = [];
  if (!schema.id.trim()) errors.push("格式 ID 不能为空。");
  if (!schema.name.trim()) errors.push("格式名称不能为空。");
  if (!Number.isInteger(schema.version) || schema.version < 1) errors.push("格式版本必须是正整数。");
  const ids = new Set<string>();
  schema.fields.forEach((field) => {
    validateField(field).forEach((error) => errors.push(`字段“${field.label || field.id}”：${error}`));
    if (ids.has(field.id)) errors.push(`字段 ID “${field.id}”重复。`);
    ids.add(field.id);
  });
  return errors;
}

export function validateRecord(record: NoteRecord, schema: NoteSchema): string[] {
  const errors: string[] = [];
  if (record.schemaId !== schema.id) errors.push("条目与格式不匹配。");
  if (!record.title.trim()) errors.push("条目标题不能为空。");
  schema.fields.forEach((field) => {
    const value = record.data[field.id];
    if (field.required && (value === undefined || value === null || value === "")) {
      errors.push(`请填写“${field.label}”。`);
      return;
    }
    if (value !== undefined && !isFieldValueCompatible(field.kind, value)) {
      errors.push(`“${field.label}”的数据类型不正确。`);
    }
  });
  return errors;
}

export function defaultsForSchema(schema: NoteSchema): Record<string, FieldValue> {
  return schema.fields.reduce<Record<string, FieldValue>>((values, field) => {
    if (field.defaultValue !== undefined) values[field.id] = field.defaultValue;
    return values;
  }, {});
}
