import type { NoteRecord } from "@/lib/notes/types";

export type SyncProtocol = "webdav" | "sftp" | "http-flow";
export type ConflictStrategy = "newer" | "local" | "remote" | "duplicate";
export type SyncDirection = "push" | "pull" | "bidirectional";
export type AuthenticationKind = "basic" | "bearer" | "ssh-password" | "ssh-key" | "none";

export interface WebDavConfig {
  baseUrl: string;
  manifestPath: string;
}

export interface SftpConfig {
  host: string;
  port: number;
  username: string;
  remoteDirectory: string;
  authentication: "password" | "privateKey";
}

export interface FlowPosition {
  x: number;
  y: number;
}

export interface HttpFlowEdge {
  id: string;
  source: string;
  target: string;
  sourcePort?: "success" | "failure" | "true" | "false";
}

export type HttpFlowNode =
  | { id: string; kind: "start"; label: string; position: FlowPosition }
  | { id: string; kind: "buildRequest"; label: string; position: FlowPosition; method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"; urlTemplate: string; headers: Record<string, string>; bodyTemplate?: string }
  | { id: string; kind: "sendRequest"; label: string; position: FlowPosition }
  | { id: string; kind: "parseJson"; label: string; position: FlowPosition; source: string }
  | { id: string; kind: "mapPayload"; label: string; position: FlowPosition; source: string; manifestPath: string; recordsPath: string; cursorPath?: string }
  | { id: string; kind: "condition"; label: string; position: FlowPosition; source: string; operator: "exists" | "equals" | "status2xx"; value?: string }
  | { id: string; kind: "success"; label: string; position: FlowPosition }
  | { id: string; kind: "failure"; label: string; position: FlowPosition; message: string };

export interface HttpFlow {
  id: string;
  name: string;
  nodes: HttpFlowNode[];
  edges: HttpFlowEdge[];
  updatedAt: string;
}

export interface HttpFlowConfig {
  flow: HttpFlow;
}

export interface SyncProfile {
  id: string;
  name: string;
  protocol: SyncProtocol;
  direction: SyncDirection;
  enabled: boolean;
  conflictStrategy: ConflictStrategy;
  credentialRef?: string;
  config: WebDavConfig | SftpConfig | HttpFlowConfig;
  createdAt: string;
  updatedAt: string;
  lastSyncedAt?: string;
  lastError?: string;
}

export interface SyncManifestEntry {
  id: string;
  revision: number;
  updatedAt: string;
  deletedAt?: string;
  contentHash: string;
}

export interface SyncManifest {
  manifestVersion: 1;
  generatedAt: string;
  deviceId: string;
  records: SyncManifestEntry[];
}

export interface SyncPayload {
  manifest: SyncManifest;
  records: NoteRecord[];
  cursor?: string;
}

export interface SyncBase {
  profileId: string;
  records: Record<string, NoteRecord>;
  updatedAt: string;
}

export interface FieldConflict {
  fieldId: string;
  localValue: unknown;
  remoteValue: unknown;
  resolution: "local" | "remote" | "duplicated";
}

export interface ConflictRecord {
  id: string;
  profileId: string;
  recordId: string;
  recordTitle: string;
  resolvedAt: string;
  strategy: ConflictStrategy;
  fields: FieldConflict[];
  duplicateRecordId?: string;
}

export interface MergeResult {
  records: NoteRecord[];
  conflicts: ConflictRecord[];
}

export interface FlowRunResult {
  payload: SyncPayload;
  trace: Array<{ nodeId: string; label: string; detail: string }>;
}

export interface SyncCredential {
  authentication: AuthenticationKind;
  username?: string;
  password?: string;
  token?: string;
  privateKey?: string;
  passphrase?: string;
}
