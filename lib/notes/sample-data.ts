import { createId } from "./schema";
import type { NoteRecord, NoteSchema } from "./types";

const now = new Date().toISOString();

export const sshSchema: NoteSchema = {
  id: "format_ssh_server",
  name: "SSH 服务器",
  description: "保存常用服务器的连接信息。",
  icon: "terminal",
  color: "#275D54",
  version: 1,
  createdAt: now,
  updatedAt: now,
  fields: [
    { id: "host", label: "IP 地址 / 主机名", kind: "text", required: true, placeholder: "例如 192.0.2.10" },
    { id: "port", label: "端口", kind: "number", required: true, defaultValue: 22 },
    { id: "username", label: "用户名", kind: "text", required: true, placeholder: "例如 deploy" },
    { id: "password", label: "密码", kind: "secret", required: false, placeholder: "仅本机显示为掩码" },
    { id: "environment", label: "环境", kind: "select", required: false, options: [
      { id: "production", label: "生产" },
      { id: "staging", label: "预发" },
      { id: "development", label: "开发" },
    ] },
    { id: "notes", label: "备注", kind: "multiline", required: false },
  ],
};

export function createWelcomeRecord(deviceId: string): NoteRecord {
  return {
    id: createId("note"),
    schemaId: sshSchema.id,
    schemaVersion: sshSchema.version,
    title: "示例 · 生产跳板机",
    data: { host: "203.0.113.10", port: 22, username: "ops", environment: "production", notes: "请替换为自己的服务器信息。" },
    tags: ["示例"],
    revision: 1,
    deviceId,
    createdAt: now,
    updatedAt: now,
  };
}
