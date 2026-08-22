import { useEffect, useMemo, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { ModalSheet, PrimaryButton } from "@/components/app-ui";
import { FieldInput } from "@/components/notes/field-input";
import { useColors } from "@/hooks/use-colors";
import { defaultsForSchema } from "@/lib/notes/schema";
import type { FieldValue, NoteRecord, NoteSchema } from "@/lib/notes/types";
import { useNotes } from "@/lib/notes/notes-provider";

export function NoteEditorSheet({ visible, record, initialSchema, onClose }: { visible: boolean; record?: NoteRecord; initialSchema?: NoteSchema; onClose: () => void }) {
  const colors = useColors();
  const { schemas, addRecord, updateRecord } = useNotes();
  const schema = useMemo(() => record ? schemas.find((entry) => entry.id === record.schemaId) : initialSchema ?? schemas[0], [initialSchema, record, schemas]);
  const [title, setTitle] = useState("");
  const [data, setData] = useState<Record<string, FieldValue>>({});
  const [tags, setTags] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible || !schema) return;
    setTitle(record?.title ?? ""); setData(record?.data ?? defaultsForSchema(schema)); setTags(record?.tags.join("、") ?? "");
  }, [record, schema, visible]);

  if (!schema) return null;
  const save = async () => {
    setSaving(true);
    try {
      const tagList = tags.split(/[、,，]/).map((tag) => tag.trim()).filter(Boolean);
      if (record) await updateRecord({ ...record, title, data, tags: tagList });
      else await addRecord({ schemaId: schema.id, title, data, tags: tagList });
      onClose();
    } catch (error) { Alert.alert("无法保存", error instanceof Error ? error.message : "请检查输入内容。"); }
    finally { setSaving(false); }
  };
  return <ModalSheet visible={visible} title={record ? "编辑条目" : `新建 · ${schema.name}`} onClose={onClose}>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.schemaBadge}><View style={[styles.dot, { backgroundColor: schema.color }]} /><Text style={{ color: colors.muted, fontWeight: "600" }}>{schema.name} · v{schema.version}</Text></View>
        <Text style={[styles.label, { color: colors.text }]}>条目标题 *</Text>
        <TextInput value={title} onChangeText={setTitle} placeholder="为这条便签起一个清晰的标题" placeholderTextColor={colors.muted} style={[styles.titleInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]} />
        {schema.fields.map((field) => <FieldInput key={field.id} field={field} value={data[field.id]} onChange={(value) => setData((current) => ({ ...current, [field.id]: value }))} />)}
        <Text style={[styles.label, { color: colors.text }]}>标签</Text>
        <TextInput value={tags} onChangeText={setTags} placeholder="例如：生产、待确认" placeholderTextColor={colors.muted} style={[styles.titleInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]} />
        <PrimaryButton label={saving ? "正在保存…" : "保存条目"} onPress={save} icon="checkmark" disabled={saving} />
      </ScrollView>
    </KeyboardAvoidingView>
  </ModalSheet>;
}

const styles = StyleSheet.create({ content: { gap: 5, padding: 18, paddingBottom: 42 }, schemaBadge: { alignItems: "center", flexDirection: "row", gap: 7, marginBottom: 10 }, dot: { borderRadius: 5, height: 10, width: 10 }, label: { fontSize: 15, fontWeight: "700", marginBottom: 6 }, titleInput: { borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, fontSize: 16, minHeight: 48, paddingHorizontal: 13, paddingVertical: 10, marginBottom: 17 } });
