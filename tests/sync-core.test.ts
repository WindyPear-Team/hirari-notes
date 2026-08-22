import { describe, expect, it } from "vitest";

import { mergeSnapshots } from "../lib/sync/conflict-merge";
import { runHttpFlow, validateHttpFlow } from "../lib/sync/http-flow";
import type { HttpFlow } from "../lib/sync/types";

const baseRecord = {
  id: "note_1",
  schemaId: "format_ssh_server",
  schemaVersion: 1,
  title: "跳板机",
  data: { host: "192.0.2.1", port: 22, username: "ops" },
  tags: ["生产"],
  revision: 1,
  deviceId: "device_a",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("字段级冲突合并", () => {
  it("自动合并两端修改的不同字段", () => {
    const local = { ...baseRecord, data: { ...baseRecord.data, port: 2202 }, updatedAt: "2026-01-02T00:00:00.000Z", revision: 2 };
    const remote = { ...baseRecord, data: { ...baseRecord.data, host: "198.51.100.7" }, updatedAt: "2026-01-03T00:00:00.000Z", revision: 2 };
    const result = mergeSnapshots("profile_1", { profileId: "profile_1", records: { [baseRecord.id]: baseRecord }, updatedAt: baseRecord.updatedAt }, [local], [remote], "newer");

    expect(result.records[0]?.data).toMatchObject({ host: "198.51.100.7", port: 2202 });
    expect(result.conflicts).toHaveLength(0);
  });

  it("按副本策略保留同字段并发修改的两种版本", () => {
    const local = { ...baseRecord, data: { ...baseRecord.data, port: 2202 }, updatedAt: "2026-01-02T00:00:00.000Z", revision: 2 };
    const remote = { ...baseRecord, data: { ...baseRecord.data, port: 2222 }, updatedAt: "2026-01-03T00:00:00.000Z", revision: 2 };
    const result = mergeSnapshots("profile_1", { profileId: "profile_1", records: { [baseRecord.id]: baseRecord }, updatedAt: baseRecord.updatedAt }, [local], [remote], "duplicate");

    expect(result.records).toHaveLength(2);
    expect(result.conflicts[0]?.fields[0]?.fieldId).toBe("port");
    expect(result.conflicts[0]?.duplicateRecordId).toBeTruthy();
  });
});

describe("可视化 HTTP 流程", () => {
  const flow: HttpFlow = {
    id: "flow_1", name: "拉取标准同步包", updatedAt: "2026-01-01T00:00:00.000Z",
    nodes: [
      { id: "start", kind: "start", label: "开始", position: { x: 0, y: 0 } },
      { id: "request", kind: "buildRequest", label: "构造请求", position: { x: 0, y: 100 }, method: "GET", urlTemplate: "https://sync.example/payload", headers: {} },
      { id: "send", kind: "sendRequest", label: "发送请求", position: { x: 0, y: 200 } },
      { id: "parse", kind: "parseJson", label: "解析 JSON", position: { x: 0, y: 300 }, source: "$response.body" },
      { id: "map", kind: "mapPayload", label: "映射同步包", position: { x: 0, y: 400 }, source: "$parse", manifestPath: "manifest", recordsPath: "records" },
      { id: "success", kind: "success", label: "成功结束", position: { x: 0, y: 500 } },
    ],
    edges: [
      { id: "1", source: "start", target: "request" }, { id: "2", source: "request", target: "send" },
      { id: "3", source: "send", target: "parse", sourcePort: "success" }, { id: "4", source: "parse", target: "map" },
      { id: "5", source: "map", target: "success" },
    ],
  };

  it("验证一个完整且连通的流程", () => {
    expect(validateHttpFlow(flow)).toEqual([]);
  });

  it("通过受限节点执行请求并映射标准同步包", async () => {
    const result = await runHttpFlow(flow, {
      inputs: {},
      fetcher: async () => new Response(JSON.stringify({
        manifest: { manifestVersion: 1, generatedAt: "2026-01-01T00:00:00.000Z", deviceId: "remote", records: [] }, records: [],
      }), { status: 200 }),
    });

    expect(result.payload.manifest.deviceId).toBe("remote");
    expect(result.trace.map((step) => step.label)).toContain("映射同步包");
  });
});
