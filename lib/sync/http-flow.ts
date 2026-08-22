import type { SyncManifest, SyncPayload } from "./types";
import type { FlowRunResult, HttpFlow, HttpFlowEdge, HttpFlowNode } from "./types";

interface RunContext {
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
  request?: RequestInit & { url: string };
  response?: { status: number; headers: Record<string, string>; body: string };
  payload?: SyncPayload;
}

export interface FlowRuntimeOptions {
  inputs: Record<string, unknown>;
  fetcher?: typeof fetch;
}

function lookup(source: string, context: RunContext): unknown {
  const normalized = source.replace(/^\$\.?/, "");
  const [scope, ...path] = normalized.split(".").filter(Boolean);
  const root = scope === "inputs" ? context.inputs : scope === "response" ? context.response : context.outputs[scope] ?? context.outputs;
  return path.reduce<unknown>((value, key) => value && typeof value === "object" ? (value as Record<string, unknown>)[key] : undefined, root);
}

function interpolate(template: string, context: RunContext): string {
  return template.replace(/{{\s*([^{}]+)\s*}}/g, (_match, expression) => {
    const value = lookup(expression, context);
    return value === undefined || value === null ? "" : typeof value === "string" ? value : JSON.stringify(value);
  });
}

function edgeFor(edges: HttpFlowEdge[], nodeId: string, port?: HttpFlowEdge["sourcePort"]): HttpFlowEdge | undefined {
  return edges.find((edge) => edge.source === nodeId && (port ? edge.sourcePort === port : !edge.sourcePort || edge.sourcePort === "success"));
}

function validatePayload(value: unknown): SyncPayload {
  const source = value as Partial<SyncPayload>;
  if (!source || !source.manifest || !Array.isArray(source.records)) throw new Error("流程输出不符合标准同步包。 ");
  const manifest = source.manifest as SyncManifest;
  if (manifest.manifestVersion !== 1 || !Array.isArray(manifest.records) || typeof manifest.deviceId !== "string") {
    throw new Error("流程输出的同步清单无效。 ");
  }
  return source as SyncPayload;
}

export function validateHttpFlow(flow: HttpFlow): string[] {
  const errors: string[] = [];
  const starts = flow.nodes.filter((node) => node.kind === "start");
  if (starts.length !== 1) errors.push("流程必须且只能有一个开始节点。 ");
  if (!flow.nodes.some((node) => node.kind === "success")) errors.push("流程必须有一个成功结束节点。 ");
  const nodeIds = new Set(flow.nodes.map((node) => node.id));
  flow.edges.forEach((edge) => {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) errors.push("存在连接到不存在节点的连线。 ");
  });
  flow.nodes.forEach((node) => {
    if (!["success", "failure"].includes(node.kind) && !flow.edges.some((edge) => edge.source === node.id)) {
      errors.push(`节点“${node.label}”尚未连接到下一步。`);
    }
  });
  return errors;
}

export async function runHttpFlow(flow: HttpFlow, options: FlowRuntimeOptions): Promise<FlowRunResult> {
  const validation = validateHttpFlow(flow);
  if (validation.length) throw new Error(validation[0]);
  const context: RunContext = { inputs: options.inputs, outputs: {} };
  const trace: FlowRunResult["trace"] = [];
  let node = flow.nodes.find((entry) => entry.kind === "start") as HttpFlowNode;
  let safety = 0;

  while (node && safety < 40) {
    safety += 1;
    let port: HttpFlowEdge["sourcePort"] | undefined;
    if (node.kind === "buildRequest") {
      context.request = {
        url: interpolate(node.urlTemplate, context), method: node.method,
        headers: Object.fromEntries(Object.entries(node.headers).map(([key, value]) => [key, interpolate(value, context)])),
        body: node.bodyTemplate ? interpolate(node.bodyTemplate, context) : undefined,
      };
      context.outputs[node.id] = context.request;
      trace.push({ nodeId: node.id, label: node.label, detail: `${node.method} 请求已构造` });
    } else if (node.kind === "sendRequest") {
      if (!context.request) throw new Error("发送请求节点之前需要构造请求节点。 ");
      const fetcher = options.fetcher ?? fetch;
      const response = await fetcher(context.request.url, context.request);
      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => { headers[key] = value; });
      context.response = { status: response.status, headers, body: await response.text() };
      context.outputs[node.id] = context.response;
      port = response.ok ? "success" : "failure";
      trace.push({ nodeId: node.id, label: node.label, detail: `收到 HTTP ${response.status}` });
    } else if (node.kind === "parseJson") {
      const raw = lookup(node.source, context);
      if (typeof raw !== "string") throw new Error("解析 JSON 节点未获取到文本响应。 ");
      try { context.outputs[node.id] = JSON.parse(raw); } catch { throw new Error("远端响应不是有效 JSON。 "); }
      trace.push({ nodeId: node.id, label: node.label, detail: "JSON 响应已解析" });
    } else if (node.kind === "mapPayload") {
      const source = lookup(node.source, context);
      const resolve = (path: string) => path ? path.split(".").filter(Boolean).reduce<unknown>((value, key) => value && typeof value === "object" ? (value as Record<string, unknown>)[key] : undefined, source) : source;
      context.payload = validatePayload({ manifest: resolve(node.manifestPath), records: resolve(node.recordsPath), cursor: node.cursorPath ? resolve(node.cursorPath) : undefined });
      context.outputs[node.id] = context.payload;
      trace.push({ nodeId: node.id, label: node.label, detail: `已映射 ${context.payload.records.length} 条远端记录` });
    } else if (node.kind === "condition") {
      const value = lookup(node.source, context);
      const matched = node.operator === "exists" ? value !== undefined && value !== null : node.operator === "status2xx" ? typeof value === "number" && value >= 200 && value < 300 : String(value) === String(node.value ?? "");
      port = matched ? "true" : "false";
      trace.push({ nodeId: node.id, label: node.label, detail: matched ? "条件成立" : "条件不成立" });
    } else if (node.kind === "failure") {
      throw new Error(node.message || "HTTP 同步流程已终止。 ");
    } else if (node.kind === "success") {
      if (!context.payload) throw new Error("成功结束前必须映射标准同步包。 ");
      trace.push({ nodeId: node.id, label: node.label, detail: "流程完成" });
      return { payload: context.payload, trace };
    } else {
      trace.push({ nodeId: node.id, label: node.label, detail: "流程开始" });
    }
    const edge = edgeFor(flow.edges, node.id, port);
    if (!edge) throw new Error(`节点“${node.label}”缺少可用的后续连线。`);
    const next = flow.nodes.find((entry) => entry.id === edge.target);
    if (!next) throw new Error("流程连线目标不存在。 ");
    node = next;
  }
  throw new Error("流程超过最大执行步数，可能存在循环连线。 ");
}
