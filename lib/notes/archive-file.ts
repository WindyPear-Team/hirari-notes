import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";

const MIME_TYPE = "application/json";

function timestampName(prefix: string): string {
  return `${prefix}-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
}

export async function shareArchive(prefix: string, content: string): Promise<void> {
  if (Platform.OS === "web") {
    const blob = new Blob([content], { type: MIME_TYPE });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = timestampName(prefix);
    anchor.click();
    URL.revokeObjectURL(url);
    return;
  }

  const uri = `${FileSystem.cacheDirectory}${timestampName(prefix)}`;
  await FileSystem.writeAsStringAsync(uri, content, { encoding: FileSystem.EncodingType.UTF8 });
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("当前设备无法打开系统分享面板。 ");
  }
  await Sharing.shareAsync(uri, { dialogTitle: "导出 Tsumugi Notes 归档", mimeType: MIME_TYPE, UTI: "public.json" });
}

export async function pickArchive(): Promise<string | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: [MIME_TYPE, "text/json", "text/plain"],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (!asset) return null;
  return FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.UTF8 });
}
