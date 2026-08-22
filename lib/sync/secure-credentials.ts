import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import type { SyncCredential } from "./types";

const prefix = "tsumugi.sync.credential.";

function storageKey(reference: string): string {
  return `${prefix}${reference}`;
}

export async function saveCredential(reference: string, credential: SyncCredential): Promise<void> {
  const serialized = JSON.stringify(credential);
  if (Platform.OS === "web") {
    localStorage.setItem(storageKey(reference), serialized);
    return;
  }
  await SecureStore.setItemAsync(storageKey(reference), serialized, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
}

export async function loadCredential(reference: string): Promise<SyncCredential | null> {
  const serialized = Platform.OS === "web"
    ? localStorage.getItem(storageKey(reference))
    : await SecureStore.getItemAsync(storageKey(reference));
  return serialized ? JSON.parse(serialized) as SyncCredential : null;
}

export async function removeCredential(reference: string): Promise<void> {
  if (Platform.OS === "web") {
    localStorage.removeItem(storageKey(reference));
    return;
  }
  await SecureStore.deleteItemAsync(storageKey(reference));
}

export function credentialWarning(): string | null {
  return Platform.OS === "web" ? "网页预览中的凭据仅作开发演示，正式使用请在 iOS 或 Android 客户端中保存。" : null;
}
