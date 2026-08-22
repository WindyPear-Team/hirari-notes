import * as FileSystem from "expo-file-system/legacy";

import type { SftpConfig, SyncCredential, SyncPayload, SyncProfile } from "./types";

const BUNDLE_FILE = "tsumugi-sync.json";

type SshClient = {
  connectSFTP: () => Promise<void>;
  sftpDownload: (remotePath: string, localDirectory: string) => Promise<string>;
  sftpUpload: (localPath: string, remoteDirectory: string) => Promise<void>;
  disconnectSFTP: () => Promise<void>;
  disconnect: () => Promise<void>;
};

type SshModule = {
  connectWithPassword: (host: string, port: number, username: string, password: string) => Promise<SshClient>;
  connectWithKey: (host: string, port: number, username: string, privateKey: string, passphrase?: string) => Promise<SshClient>;
};

function remotePath(directory: string): string {
  return `${directory.replace(/\/$/, "")}/${BUNDLE_FILE}`;
}

async function connect(profile: SyncProfile, credential: SyncCredential | null): Promise<SshClient> {
  if (profile.protocol !== "sftp") throw new Error("SFTP 配置不正确。 ");
  if (!credential) throw new Error("请先为该 SFTP 目标保存认证信息。 ");
  const config = profile.config as SftpConfig;
  const module = require("@speedshield/react-native-ssh-sftp").default as SshModule;
  if (config.authentication === "password" && credential.password) {
    return module.connectWithPassword(config.host, config.port, config.username, credential.password);
  }
  if (config.authentication === "privateKey" && credential.privateKey) {
    return module.connectWithKey(config.host, config.port, config.username, credential.privateKey, credential.passphrase);
  }
  throw new Error("SFTP 凭据与所选认证方式不匹配。 ");
}

export async function pullSftpPayload(profile: SyncProfile, credential: SyncCredential | null): Promise<SyncPayload> {
  if (profile.protocol !== "sftp") throw new Error("SFTP 配置不正确。 ");
  const config = profile.config as SftpConfig;
  const client = await connect(profile, credential);
  try {
    await client.connectSFTP();
    const downloaded = await client.sftpDownload(remotePath(config.remoteDirectory), FileSystem.cacheDirectory!);
    const source = await FileSystem.readAsStringAsync(downloaded, { encoding: FileSystem.EncodingType.UTF8 });
    return JSON.parse(source) as SyncPayload;
  } finally {
    await client.disconnectSFTP().catch(() => undefined);
    await client.disconnect().catch(() => undefined);
  }
}

export async function pushSftpPayload(profile: SyncProfile, credential: SyncCredential | null, payload: SyncPayload): Promise<SyncPayload> {
  if (profile.protocol !== "sftp") throw new Error("SFTP 配置不正确。 ");
  const config = profile.config as SftpConfig;
  const localPath = `${FileSystem.cacheDirectory}${BUNDLE_FILE}`;
  await FileSystem.writeAsStringAsync(localPath, JSON.stringify(payload), { encoding: FileSystem.EncodingType.UTF8 });
  const client = await connect(profile, credential);
  try {
    await client.connectSFTP();
    await client.sftpUpload(localPath, config.remoteDirectory);
    return payload;
  } finally {
    await client.disconnectSFTP().catch(() => undefined);
    await client.disconnect().catch(() => undefined);
  }
}
