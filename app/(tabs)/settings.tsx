import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Card, SectionTitle, StatusPill } from "@/components/app-ui";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { exportFormats, exportNotes } from "@/lib/notes/archive";
import { pickArchive, shareArchive } from "@/lib/notes/archive-file";
import { useNotes } from "@/lib/notes/notes-provider";
import { credentialWarning } from "@/lib/sync/secure-credentials";

export default function SettingsScreen() {
  const colors = useColors(); const { schemas, records, deviceId, importArchive } = useNotes(); const [busy, setBusy] = useState(false);
  const action = async (work: () => Promise<void>) => { setBusy(true); try { await work(); } catch (error) { Alert.alert("操作未完成", error instanceof Error ? error.message : "请稍后再试。"); } finally { setBusy(false); } };
  const importFile = () => action(async () => { const source = await pickArchive(); if (!source) return; const summary = await importArchive(source); Alert.alert("导入完成", `格式：新增 ${summary.formats.added}，更新 ${summary.formats.updated}。\n条目：新增 ${summary.records.added}，更新 ${summary.records.updated}。`); });
  return <ScreenContainer className="px-5"><ScrollView contentContainerStyle={styles.content}><Text style={[styles.eyebrow, { color: colors.primary }]}>控制权属于你</Text><Text style={[styles.title, { color: colors.text }]}>设置与备份</Text><Text style={[styles.subtitle, { color: colors.muted }]}>归档文件不包含同步服务密码、Token 或 SSH 私钥。</Text>
    <SectionTitle title="导入与导出" /><Card><SettingRow icon="square.and.arrow.up" title="导出全部归档" description={`${schemas.length} 个格式，${records.filter((record) => !record.deletedAt).length} 条记录`} onPress={() => action(() => shareArchive("tsumugi-notes", exportNotes(schemas, records)))} /><Divider /><SettingRow icon="tray.and.arrow.up" title="仅导出格式定义" description="适合迁移和共享数据模板" onPress={() => action(() => shareArchive("tsumugi-formats", exportFormats(schemas)))} /><Divider /><SettingRow icon="tray.and.arrow.down" title={busy ? "正在处理…" : "导入归档文件"} description="先校验版本和字段类型，再合并数据" onPress={importFile} /></Card>
    <SectionTitle title="数据与安全" /><Card><View style={styles.infoRow}><View style={[styles.infoIcon, { backgroundColor: `${colors.primary}16` }]}><IconSymbol name={"lock.fill" as never} color={colors.primary} size={20} /></View><View style={{ flex: 1 }}><Text style={{ color: colors.text, fontWeight: "800" }}>同步凭据</Text><Text style={{ color: colors.muted, fontSize: 13, lineHeight: 18, marginTop: 3 }}>密码、Token 和 SSH 私钥使用设备安全存储，永远不会写进便签或导出归档。</Text>{credentialWarning() ? <Text style={{ color: colors.warning, fontSize: 12, lineHeight: 17, marginTop: 6 }}>{credentialWarning()}</Text> : null}</View></View><Divider /><View style={styles.infoRow}><View style={[styles.infoIcon, { backgroundColor: `${colors.success}17` }]}><IconSymbol name={"iphone" as never} color={colors.success} size={20} /></View><View style={{ flex: 1 }}><Text style={{ color: colors.text, fontWeight: "800" }}>设备标识</Text><Text selectable style={{ color: colors.muted, fontFamily: "monospace", fontSize: 12, marginTop: 3 }}>{deviceId}</Text></View><StatusPill label="本机" tone="success" /></View></Card>
    <SectionTitle title="冲突规则" /><Card><Text style={{ color: colors.text, fontWeight: "800" }}>字段级三方合并</Text><Text style={{ color: colors.muted, fontSize: 14, lineHeight: 20 }}>不同字段的改动会自动合并；同一字段并发变化会按每个同步目标的策略处理。默认“创建副本”可确保任何一端内容不会静默丢失。</Text></Card>
  </ScrollView></ScreenContainer>;
}

function SettingRow({ icon, title, description, onPress }: { icon: string; title: string; description: string; onPress: () => void }) { const colors = useColors(); return <Pressable onPress={onPress} style={({ pressed }) => [styles.row, { opacity: pressed ? 0.65 : 1 }]}><View style={[styles.infoIcon, { backgroundColor: `${colors.primary}16` }]}><IconSymbol name={icon as never} color={colors.primary} size={19} /></View><View style={{ flex: 1 }}><Text style={{ color: colors.text, fontWeight: "800" }}>{title}</Text><Text style={{ color: colors.muted, fontSize: 13, lineHeight: 18, marginTop: 2 }}>{description}</Text></View><IconSymbol name={"chevron.right" as never} color={colors.muted} size={19} /></Pressable>; }
function Divider() { const colors = useColors(); return <View style={[styles.divider, { backgroundColor: colors.border }]} />; }
const styles = StyleSheet.create({ content: { gap: 4, paddingBottom: 36, paddingTop: 7 }, eyebrow: { fontSize: 12, fontWeight: "800", letterSpacing: 0.7 }, title: { fontSize: 34, fontWeight: "800", letterSpacing: -1, marginTop: 4 }, subtitle: { fontSize: 14, lineHeight: 20, marginTop: 7 }, row: { alignItems: "center", flexDirection: "row", gap: 11, paddingVertical: 10 }, divider: { height: StyleSheet.hairlineWidth }, infoRow: { alignItems: "center", flexDirection: "row", gap: 11, paddingVertical: 4 }, infoIcon: { alignItems: "center", borderRadius: 12, height: 39, justifyContent: "center", width: 39 } });
