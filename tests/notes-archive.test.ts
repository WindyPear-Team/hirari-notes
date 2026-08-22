import { describe, expect, it } from "vitest";

import { exportFormats, exportNotes, mergeArchive, parseArchive } from "../lib/notes/archive";
import { sshSchema } from "../lib/notes/sample-data";

describe("格式归档", () => {
  it("可以导出并重新解析一份格式定义", () => {
    const source = exportFormats([sshSchema]);
    const archive = parseArchive(source);

    expect(archive.archiveType).toBe("tsumugi-note-formats");
    expect(archive.formats[0]?.name).toBe("SSH 服务器");
  });

  it("仅在导入版本更新时替换已有格式", () => {
    const outdated = { ...sshSchema, name: "旧格式", updatedAt: "2026-01-01T00:00:00.000Z" };
    const newer = { ...sshSchema, name: "SSH 服务器（新版）", updatedAt: "2026-02-01T00:00:00.000Z" };
    const archive = parseArchive(exportFormats([newer]));
    const result = mergeArchive([outdated], [], archive);

    expect(result.formats).toHaveLength(1);
    expect(result.formats[0]?.name).toBe("SSH 服务器（新版）");
    expect(result.summary.formats.updated).toBe(1);
  });

  it("可以校验并解析包含格式和条目的完整归档", () => {
    const record = {
      id: "note_1",
      schemaId: sshSchema.id,
      schemaVersion: 1,
      title: "跳板机",
      data: { host: "192.0.2.1", port: 22, username: "ops" },
      tags: [],
      revision: 1,
      deviceId: "device_1",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };

    const archive = parseArchive(exportNotes([sshSchema], [record]));
    expect(archive.archiveType).toBe("tsumugi-notes");
    expect(archive.archiveType === "tsumugi-notes" ? archive.records : []).toHaveLength(1);
  });
});
