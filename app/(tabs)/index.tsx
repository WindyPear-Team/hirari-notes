import { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { Card, EmptyState, StatusPill } from "@/components/app-ui";
import { NoteEditorSheet } from "@/components/notes/note-editor-sheet";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useNotes } from "@/lib/notes/notes-provider";
import type { NoteRecord, NoteSchema } from "@/lib/notes/types";
import { useSync } from "@/lib/sync/sync-provider";

export default function LibraryScreen() {
  const colors = useColors();
  const { schemas, records, isReady } = useNotes();
  const { profiles } = useSync();
  const [query, setQuery] = useState("");
  const [schemaFilter, setSchemaFilter] = useState<string | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<NoteRecord | undefined>();
  const [newSchema, setNewSchema] = useState<NoteSchema | undefined>();
  const visibleRecords = useMemo(() => records.filter((record) => !record.deletedAt && (!schemaFilter || record.schemaId === schemaFilter) && `${record.title} ${Object.values(record.data).join(" ")}`.toLowerCase().includes(query.toLowerCase())), [query, records, schemaFilter]);
  const activeProfiles = profiles.filter((profile) => profile.enabled).length;

  return <ScreenContainer className="px-5"><FlatList data={visibleRecords} keyExtractor={(record) => record.id} contentContainerStyle={styles.list} ListHeaderComponent={<>
    <View style={styles.header}><View><Text style={[styles.eyebrow, { color: colors.primary }]}>本地优先 · 可控同步</Text><Text style={[styles.title, { color: colors.text }]}>便签库</Text><Text style={[styles.subtitle, { color: colors.muted }]}>{isReady ? `${visibleRecords.length} 条记录 · ${activeProfiles} 个同步目标` : "正在读取本地数据…"}</Text></View><Pressable onPress={() => setNewSchema(schemas[0])} style={({ pressed }) => [styles.fab, { backgroundColor: colors.primary, opacity: pressed ? 0.75 : 1 }]}><IconSymbol name={"plus" as never} color="#FFFFFF" size={23} weight="bold" /></Pressable></View>
    <View style={[styles.search, { borderColor: colors.border, backgroundColor: colors.surface }]}><IconSymbol name={"magnifyingglass" as never} size={18} color={colors.muted} /><TextInput value={query} onChangeText={setQuery} placeholder="搜索标题、字段或标签" placeholderTextColor={colors.muted} style={[styles.searchInput, { color: colors.text }]} /></View>
    <FlatList horizontal data={[{ id: "all", name: "全部", color: colors.primary }, ...schemas]} keyExtractor={(schema) => schema.id} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters} renderItem={({ item }) => { const active = schemaFilter === (item.id === "all" ? null : item.id); return <Pressable onPress={() => setSchemaFilter(item.id === "all" ? null : item.id)} style={[styles.filter, { borderColor: active ? colors.primary : colors.border, backgroundColor: active ? `${colors.primary}15` : colors.surface }]}><View style={[styles.dot, { backgroundColor: item.color }]} /><Text style={{ color: active ? colors.primary : colors.text, fontWeight: "700" }}>{item.name}</Text></Pressable>; }} />
  </>} renderItem={({ item }) => <NoteCard record={item} schema={schemas.find((schema) => schema.id === item.schemaId)} onPress={() => setSelectedRecord(item)} />} ListEmptyComponent={<EmptyState title="尚未找到便签" description={query ? "换一个关键词，或切换到其他格式。" : "点击右上角新增一条结构化便签。"} />} />
  <NoteEditorSheet visible={Boolean(selectedRecord || newSchema)} record={selectedRecord} initialSchema={newSchema} onClose={() => { setSelectedRecord(undefined); setNewSchema(undefined); }} />
  </ScreenContainer>;
}

function NoteCard({ record, schema, onPress }: { record: NoteRecord; schema?: NoteSchema; onPress: () => void }) {
  const colors = useColors();
  const preview = schema?.fields.filter((field) => field.kind !== "secret").slice(0, 2).map((field) => `${field.label}：${Array.isArray(record.data[field.id]) ? (record.data[field.id] as string[]).join("、") : record.data[field.id] ?? "未填写"}`).join(" · ");
  return <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}><Card style={styles.noteCard}><View style={styles.noteHead}><View style={[styles.schemaIcon, { backgroundColor: `${schema?.color ?? colors.primary}18` }]}><IconSymbol name={(schema?.icon ?? "note.text") as never} color={schema?.color ?? colors.primary} size={20} /></View><View style={{ flex: 1 }}><Text numberOfLines={1} style={[styles.noteTitle, { color: colors.text }]}>{record.title}</Text><Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>{schema?.name ?? "未知格式"} · {new Date(record.updatedAt).toLocaleDateString("zh-CN")}</Text></View><IconSymbol name={"chevron.right" as never} color={colors.muted} size={19} /></View>{preview ? <Text numberOfLines={2} style={[styles.preview, { color: colors.muted }]}>{preview}</Text> : null}<View style={styles.tagRow}>{record.tags.slice(0, 3).map((tag) => <StatusPill key={tag} label={tag} />)}</View></Card></Pressable>;
}

const styles = StyleSheet.create({ list: { gap: 11, paddingBottom: 36 }, header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", paddingTop: 7 }, eyebrow: { fontSize: 12, fontWeight: "800", letterSpacing: 0.65 }, title: { fontSize: 34, fontWeight: "800", letterSpacing: -1, marginTop: 4 }, subtitle: { fontSize: 14, marginTop: 4 }, fab: { alignItems: "center", borderRadius: 18, height: 50, justifyContent: "center", width: 50 }, search: { alignItems: "center", borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, flexDirection: "row", gap: 8, marginTop: 20, minHeight: 46, paddingHorizontal: 13 }, searchInput: { flex: 1, fontSize: 16 }, filters: { gap: 8, paddingVertical: 12 }, filter: { alignItems: "center", borderRadius: 99, borderWidth: 1, flexDirection: "row", gap: 6, paddingHorizontal: 11, paddingVertical: 8 }, dot: { borderRadius: 4, height: 8, width: 8 }, noteCard: { gap: 10 }, noteHead: { alignItems: "center", flexDirection: "row", gap: 10 }, schemaIcon: { alignItems: "center", borderRadius: 12, height: 38, justifyContent: "center", width: 38 }, noteTitle: { fontSize: 17, fontWeight: "800" }, preview: { fontSize: 13, lineHeight: 19 }, tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 } });
