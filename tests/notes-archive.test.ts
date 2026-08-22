import { describe, expect, it } from "vitest";

import { exportFormats, exportNotes, mergeArchive, parseArchive } from "../lib/notes/archive";
import type { NoteSchema } from "../lib/notes/types";

const contactSchema: NoteSchema = {
  id: "format_contact", name: "联系人", description: "", icon: "note.text", color: "#275D54", version: 1,
  createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z",
  fields: [{ id: "name", label: "姓名", kind: "text", required: true }],
};

describe("格式归档", () => {
  it("可以导出并重新解析一份格式定义", () => {
    const source = exportFormats([contactSchema]);
    const archive = parseArchive(source);

    expect(archive.archiveType).toBe("tsumugi-note-formats");
    expect(archive.formats[0]?.name).toBe("联系人");
  });

  it("仅在导入版本更新时替换已有格式", () => {
    const outdated = { ...contactSchema, name: "旧格式", updatedAt: "2026-01-01T00:00:00.000Z" };
    const newer = { ...contactSchema, name: "联系人（新版）", updatedAt: "2026-02-01T00:00:00.000Z" };
    const archive = parseArchive(exportFormats([newer]));
    const result = mergeArchive([outdated], [], archive);

    expect(result.formats).toHaveLength(1);
    expect(result.formats[0]?.name).toBe("联系人（新版）");
    expect(result.summary.formats.updated).toBe(1);
  });

  it("可以校验并解析包含格式和条目的完整归档", () => {
    const record = {
      id: "note_1",
      schemaId: contactSchema.id,
      schemaVersion: 1,
      title: "一条记录",
      data: { name: "测试用户" },
      tags: [],
      revision: 1,
      deviceId: "device_1",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };

    const archive = parseArchive(exportNotes([contactSchema], [record]));
    expect(archive.archiveType).toBe("tsumugi-notes");
    expect(archive.archiveType === "tsumugi-notes" ? archive.records : []).toHaveLength(1);
  });
});
