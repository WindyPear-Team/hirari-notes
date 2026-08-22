import { Platform } from "react-native";

import { runHttpFlow } from "./http-flow";
import { loadCredential } from "./secure-credentials";
import { pullSftpPayload, pushSftpPayload } from "./sftp";
import type { HttpFlowConfig, SyncCredential, SyncPayload, SyncProfile, WebDavConfig } from "./types";

function isWebDav(profile: SyncProfile): profile is SyncProfile & { config: WebDavConfig } {
  return profile.protocol === "webdav";
}

function isHttpFlow(profile: SyncProfile): profile is SyncProfile & { config: HttpFlowConfig } {
  return profile.protocol === "http-flow";
}

function joinUrl(baseUrl: string, resourcePath: string): string {
  return `${baseUrl.replace(/\/+$/, "")}/${resourcePath.replace(/^\/+/, "")}`;
}

function headersFor(credential: SyncCredential | null): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (!credential || credential.authentication === "none") return headers;
  if (credential.authentication === "bearer" && credential.token) headers.Authorization = `Bearer ${credential.token}`;
  if (credential.authentication === "basic" && credential.username && credential.password) {
    headers.Authorization = `Basic ${btoa(`${credential.username}:${credential.password}`)}`;
  }
  return headers;
}

function validatePayload(payload: unknown): SyncPayload {
  const candidate = payload as Partial<SyncPayload>;
  if (!candidate?.manifest || !Array.isArray(candidate.records) || candidate.manifest.manifestVersion !== 1) {
    throw new Error("远端返回的同步归档不符合 Tsumugi Notes 标准。 ");
  }
  return candidate as SyncPayload;
}

async function credentialFor(profile: SyncProfile): Promise<SyncCredential | null> {
  return profile.credentialRef ? loadCredential(profile.credentialRef) : null;
}

export async function pullRemotePayload(profile: SyncProfile): Promise<SyncPayload> {
  const credential = await credentialFor(profile);
  if (profile.protocol === "webdav" && isWebDav(profile)) {
    const response = await fetch(joinUrl(profile.config.baseUrl, profile.config.manifestPath), { method: "GET", headers: headersFor(credential) });
    if (response.status === 404) {
      return { manifest: { manifestVersion: 1, generatedAt: new Date().toISOString(), deviceId: "remote-empty", records: [] }, records: [] };
    }
    if (!response.ok) throw new Error(`WebDAV 下载失败（HTTP ${response.status}）。`);
    return validatePayload(await response.json());
  }
  if (profile.protocol === "sftp") return pullSftpPayload(profile, credential);
  if (isHttpFlow(profile)) {
    const flow = profile.config.flow;
    return (await runHttpFlow(flow, { inputs: { direction: "pull", profile: { id: profile.id, name: profile.name } } })).payload;
  }
  throw new Error("未支持的同步协议。 ");
}

export async function pushRemotePayload(profile: SyncProfile, payload: SyncPayload): Promise<SyncPayload> {
  const credential = await credentialFor(profile);
  if (profile.protocol === "webdav" && isWebDav(profile)) {
    const response = await fetch(joinUrl(profile.config.baseUrl, profile.config.manifestPath), {
      method: "PUT", headers: headersFor(credential), body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error(`WebDAV 上传失败（HTTP ${response.status}）。`);
    return payload;
  }
  if (profile.protocol === "sftp") return pushSftpPayload(profile, credential, payload);
  if (isHttpFlow(profile)) {
    const flow = profile.config.flow;
    return (await runHttpFlow(flow, { inputs: { direction: "push", payload, profile: { id: profile.id, name: profile.name } } })).payload;
  }
  if (Platform.OS === "web") throw new Error("当前浏览器预览未支持该同步协议。 ");
  throw new Error("未支持的同步协议。 ");
}
