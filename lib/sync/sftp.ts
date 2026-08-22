import type { SyncCredential, SyncPayload, SyncProfile } from "./types";

function unavailable(): never {
  throw new Error("SFTP 需要在 iOS 或 Android 原生客户端中运行。 ");
}

export async function pullSftpPayload(_profile: SyncProfile, _credential: SyncCredential | null): Promise<SyncPayload> {
  return unavailable();
}

export async function pushSftpPayload(_profile: SyncProfile, _credential: SyncCredential | null, _payload: SyncPayload): Promise<SyncPayload> {
  return unavailable();
}
