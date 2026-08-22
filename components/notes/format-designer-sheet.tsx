import { useEffect, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { Card, ModalSheet, PrimaryButton } from "@/components/app-ui";
import { useColors } from "@/hooks/use-colors";
import { createId } from "@/lib/notes/schema";
import { FIELD_KINDS, type FieldKind, type NoteField, type NoteSchema } from "@/lib/notes/types";
import { useNotes } from "@/lib/notes/notes-provider";

const formatColors = ["#275D54", "#3867B4", "#8A5A24", "#8F3E62", "#56636B"];

function blankField(): NoteField {
  return { id: createId("field"), label: "新字段", kind: "text", required: false };
}

export function FormatDesignerSheet({ visible, schema, onClose }: { visible: boolean; schema?: NoteSchema; onClose: () => void }) {
  const colors = useColors();
  const { addSchema, updateSchema } = useNotes();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(formatColors[0]);
  const [fields, setFields] = useState<NoteField[]>([]);
  const [expandedField, setExpandedField] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setName(schema?.name ?? ""); setDescription(schema?.description ?? ""); setColor(schema?.color ?? formatColors[0]); setFields(schema?.fields ?? [blankField()]); setExpandedField(null);
  }, [schema, visible]);

  const updateField = (id: string, patch: Partial<NoteField>) => setFields((current) => current.map((field) => field.id === id ? { ...field, ...patch } : field));
  const save = async () => {
    setSaving(true);
    try {
      const normalized = fields.map((field) => ({ ...field, options: ["select", "multiSelect"].includes(field.kind) ? (field.options?.filter((option) => option.label.trim()) ?? []) : undefined }));
      if (schema) await updateSchema({ ...schema, name, description, color, fields: normalized });
      else await addSchema({ name, description, color, icon: "note.text", fields: normalized });
      onClose();
    } catch (error) { Alert.alert("无法保存格式", error instanceof Error ? error.message : "请检查格式内容。"); }
    finally { setSaving(false); }
  };

  return <ModalSheet visible={visible} title={schema ? "编辑格式" : "新建便签格式"} onClose={onClose}>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={[styles.sectionLabel, { color: colors.muted }]}>格式信息</Text>
      <TextInput value={name} onChangeText={setName} placeholder="格式名称，例如 SSH 服务器" placeholderTextColor={colors.muted} style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]} />
      <TextInput value={description} onChangeText={setDescription} placeholder="描述这个格式适合记录什么" placeholderTextColor={colors.muted} style={[styles.input, styles.description, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]} multiline />
      <View style={styles.colorRow}>{formatColors.map((option) => <Pressable key={option} onPress={() => setColor(option)} style={[styles.color, { backgroundColor: option, borderColor: colors.background, borderWidth: color === option ? 3 : 0 }]} />)}</View>
      <Text style={[styles.sectionLabel, { color: colors.muted }]}>字段</Text>
      {fields.map((field, index) => <Card key={field.id} style={styles.fieldCard}>
        <View style={styles.fieldTop}><View style={[styles.index, { backgroundColor: `${color}1A` }]}><Text style={{ color, fontWeight: "800" }}>{index + 1}</Text></View><TextInput value={field.label} onChangeText={(label) => updateField(field.id, { label })} style={[styles.fieldName, { color: colors.text }]} placeholder="字段名称" placeholderTextColor={colors.muted} /><Pressable onPress={() => setFields((current) => current.filter((entry) => entry.id !== field.id))} hitSlop={8}><Text style={{ color: colors.error, fontWeight: "700" }}>删除</Text></Pressable></View>
        <Pressable onPress={() => setExpandedField(expandedField === field.id ? null : field.id)} style={[styles.typeButton, { borderColor: colors.border }]}><Text style={{ color: colors.muted }}>类型</Text><Text style={{ color: colors.text, fontWeight: "700" }}>{FIELD_KINDS.find((kind) => kind.value === field.kind)?.label}</Text></Pressable>
        {expandedField === field.id ? <View style={styles.kindGrid}>{FIELD_KINDS.map((kind) => <Pressable key={kind.value} onPress={() => { updateField(field.id, { kind: kind.value }); setExpandedField(null); }} style={[styles.kind, { borderColor: field.kind === kind.value ? colors.primary : colors.border, backgroundColor: field.kind === kind.value ? `${colors.primary}14` : colors.background }]}><Text style={{ color: field.kind === kind.value ? colors.primary : colors.text, fontSize: 13, fontWeight: "600" }}>{kind.label}</Text></Pressable>)}</View> : null}
        {(field.kind === "select" || field.kind === "multiSelect") ? <View style={styles.optionsBox}><Text style={{ color: colors.muted, fontSize: 13, fontWeight: "600" }}>选项（用逗号分隔）</Text><TextInput value={(field.options ?? []).map((item) => item.label).join("，")} onChangeText={(value) => updateField(field.id, { options: value.split(/[，,]/).map((label) => label.trim()).filter(Boolean).map((label) => ({ id: label.toLowerCase().replace(/\s+/g, "-") || createId("opt"), label })) })} placeholder="生产，预发，开发" placeholderTextColor={colors.muted} style={[styles.optionInput, { borderColor: colors.border, color: colors.text }]} /></View> : null}
        <Pressable onPress={() => updateField(field.id, { required: !field.required })} style={styles.required}><View style={[styles.checkbox, { borderColor: field.required ? colors.primary : colors.border, backgroundColor: field.required ? colors.primary : "transparent" }]}>{field.required ? <Text style={{ color: "#FFF", fontSize: 11 }}>✓</Text> : null}</View><Text style={{ color: colors.text, fontSize: 14 }}>必填字段</Text></Pressable>
      </Card>)}
      <Pressable onPress={() => setFields((current) => [...current, blankField()])} style={[styles.addField, { borderColor: colors.primary }]}><Text style={{ color: colors.primary, fontSize: 16, fontWeight: "700" }}>+ 添加字段</Text></Pressable>
      <PrimaryButton label={saving ? "正在保存…" : "保存格式"} onPress={save} icon="checkmark" disabled={saving} />
    </ScrollView></KeyboardAvoidingView>
  </ModalSheet>;
}

const styles = StyleSheet.create({
  content: { gap: 12, padding: 18, paddingBottom: 42 }, sectionLabel: { fontSize: 13, fontWeight: "800", letterSpacing: 0.5, marginTop: 3, textTransform: "uppercase" },
  input: { borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, fontSize: 16, minHeight: 48, paddingHorizontal: 13, paddingVertical: 10 }, description: { minHeight: 78, textAlignVertical: "top" },
  colorRow: { flexDirection: "row", gap: 11, marginBottom: 4 }, color: { borderRadius: 16, height: 32, width: 32 }, fieldCard: { gap: 11 }, fieldTop: { alignItems: "center", flexDirection: "row", gap: 10 }, index: { alignItems: "center", borderRadius: 12, height: 24, justifyContent: "center", width: 24 }, fieldName: { flex: 1, fontSize: 16, fontWeight: "700", paddingVertical: 3 },
  typeButton: { alignItems: "center", borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 11, paddingVertical: 10 }, kindGrid: { flexDirection: "row", flexWrap: "wrap", gap: 7 }, kind: { borderRadius: 9, borderWidth: 1, paddingHorizontal: 9, paddingVertical: 7 },
  optionsBox: { gap: 6 }, optionInput: { borderBottomWidth: StyleSheet.hairlineWidth, fontSize: 15, paddingBottom: 5 }, required: { alignItems: "center", flexDirection: "row", gap: 8 }, checkbox: { alignItems: "center", borderRadius: 5, borderWidth: 1, height: 19, justifyContent: "center", width: 19 }, addField: { alignItems: "center", borderRadius: 12, borderStyle: "dashed", borderWidth: 1.4, paddingVertical: 13 },
});
