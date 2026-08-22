import { useState } from "react";
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { Card, EmptyState, SectionTitle } from "@/components/app-ui";
import { FormatDesignerSheet } from "@/components/notes/format-designer-sheet";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { exportFormats } from "@/lib/notes/archive";
import { shareArchive } from "@/lib/notes/archive-file";
import { useNotes } from "@/lib/notes/notes-provider";
import type { NoteSchema } from "@/lib/notes/types";

export default function FormatsScreen() {
  const colors = useColors(); const { schemas, records } = useNotes(); const [editing, setEditing] = useState<NoteSchema | undefined>(); const [creating, setCreating] = useState(false);
  const exportOne = async (schema: NoteSchema) => { try { await shareArchive(`tsumugi-format-${schema.name}`, exportFormats([schema])); } catch (error) { Alert.alert("无法导出", error instanceof Error ? error.message : "请稍后重试。"); } };
  return <ScreenContainer className="px-5"><FlatList data={schemas} keyExtractor={(schema) => schema.id} contentContainerStyle={styles.list} ListHeaderComponent={<><Text style={[styles.eyebrow, { color: colors.primary }]}>可迁移的数据模型</Text><Text style={[styles.title, { color: colors.text }]}>格式库</Text><Text style={[styles.subtitle, { color: colors.muted }]}>把便签变成你需要的结构化数据。格式定义可单独导入或导出。</Text><SectionTitle title="已定义格式" action="新建" onAction={() => setCreating(true)} /></>} renderItem={({ item }) => <FormatCard schema={item} count={records.filter((record) => record.schemaId === item.id && !record.deletedAt).length} onEdit={() => setEditing(item)} onExport={() => exportOne(item)} />} ListEmptyComponent={<EmptyState title="还没有格式" description="创建一个格式，定义你希望记录的字段和选项。" icon="square.stack.3d.up.fill" />} />
    <Pressable onPress={() => setCreating(true)} style={({ pressed }) => [styles.fab, { backgroundColor: colors.primary, opacity: pressed ? 0.75 : 1 }]}><IconSymbol name={"plus" as never} color="#FFF" size={23} weight="bold" /></Pressable>
    <FormatDesignerSheet visible={creating || Boolean(editing)} schema={editing} onClose={() => { setCreating(false); setEditing(undefined); }} />
  </ScreenContainer>;
}

function FormatCard({ schema, count, onEdit, onExport }: { schema: NoteSchema; count: number; onEdit: () => void; onExport: () => void }) {
  const colors = useColors();
  return <Card style={styles.card}><Pressable onPress={onEdit} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}><View style={styles.cardTop}><View style={[styles.icon, { backgroundColor: `${schema.color}18` }]}><IconSymbol name={schema.icon as never} color={schema.color} size={23} /></View><View style={{ flex: 1 }}><Text style={[styles.cardTitle, { color: colors.text }]}>{schema.name}</Text><Text style={{ color: colors.muted, fontSize: 13, marginTop: 3 }}>{schema.description || "未添加说明"}</Text></View><IconSymbol name={"chevron.right" as never} color={colors.muted} size={19} /></View></Pressable><View style={[styles.divider, { backgroundColor: colors.border }]} /><View style={styles.footer}><Text style={{ color: colors.muted, fontSize: 13 }}>{schema.fields.length} 个字段 · {count} 条记录 · v{schema.version}</Text><Pressable onPress={onExport} hitSlop={8}><Text style={{ color: colors.primary, fontSize: 14, fontWeight: "800" }}>导出定义</Text></Pressable></View></Card>;
}

const styles = StyleSheet.create({ list: { gap: 11, paddingBottom: 36 }, eyebrow: { fontSize: 12, fontWeight: "800", letterSpacing: 0.7, marginTop: 7 }, title: { fontSize: 34, fontWeight: "800", letterSpacing: -1, marginTop: 4 }, subtitle: { fontSize: 14, lineHeight: 20, marginTop: 7, maxWidth: 335 }, card: { gap: 12 }, cardTop: { alignItems: "center", flexDirection: "row", gap: 11 }, icon: { alignItems: "center", borderRadius: 13, height: 44, justifyContent: "center", width: 44 }, cardTitle: { fontSize: 17, fontWeight: "800" }, divider: { height: StyleSheet.hairlineWidth }, footer: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" }, fab: { alignItems: "center", borderRadius: 18, bottom: 17, elevation: 5, height: 52, justifyContent: "center", position: "absolute", right: 20, shadowColor: "#000", shadowOpacity: 0.16, shadowRadius: 10, width: 52 } });
