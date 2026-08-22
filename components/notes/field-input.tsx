import { useState } from "react";
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";

import { useColors } from "@/hooks/use-colors";
import type { FieldValue, NoteField } from "@/lib/notes/types";

interface FieldInputProps {
  field: NoteField;
  value: FieldValue | undefined;
  onChange: (value: FieldValue) => void;
}

export function FieldInput({ field, value, onChange }: FieldInputProps) {
  const colors = useColors();
  const [revealed, setRevealed] = useState(false);
  const inputStyle = [styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }];
  const options = field.options ?? [];

  if (field.kind === "boolean") {
    return <View style={styles.booleanRow}><View style={{ flex: 1 }}><Text style={[styles.label, { color: colors.text }]}>{field.label}{field.required ? " *" : ""}</Text>{field.helpText ? <Text style={[styles.help, { color: colors.muted }]}>{field.helpText}</Text> : null}</View><Switch value={Boolean(value)} onValueChange={onChange} trackColor={{ true: colors.primary }} /></View>;
  }
  if (field.kind === "select" || field.kind === "multiSelect") {
    const selected = field.kind === "multiSelect" && Array.isArray(value) ? value : [];
    return <View style={styles.fieldWrap}><Text style={[styles.label, { color: colors.text }]}>{field.label}{field.required ? " *" : ""}</Text><View style={styles.options}>{options.map((option) => {
      const active = field.kind === "multiSelect" ? selected.includes(option.id) : value === option.id;
      return <Pressable key={option.id} onPress={() => onChange(field.kind === "multiSelect" ? active ? selected.filter((item) => item !== option.id) : [...selected, option.id] : option.id)} style={({ pressed }) => [styles.option, { borderColor: active ? colors.primary : colors.border, backgroundColor: active ? `${colors.primary}16` : colors.background, opacity: pressed ? 0.7 : 1 }]}><Text style={{ color: active ? colors.primary : colors.text, fontWeight: active ? "700" : "500" }}>{option.label}</Text></Pressable>;
    })}</View></View>;
  }
  const isNumber = field.kind === "number";
  const isSecret = field.kind === "secret";
  return <View style={styles.fieldWrap}>
    <Text style={[styles.label, { color: colors.text }]}>{field.label}{field.required ? " *" : ""}</Text>
    {field.helpText ? <Text style={[styles.help, { color: colors.muted }]}>{field.helpText}</Text> : null}
    <View><TextInput value={value === null || value === undefined ? "" : String(value)} onChangeText={(text) => onChange(isNumber ? (text === "" ? null : Number(text)) : text)} placeholder={field.placeholder} placeholderTextColor={colors.muted} secureTextEntry={isSecret && !revealed} keyboardType={isNumber ? "numeric" : field.kind === "url" ? "url" : "default"} autoCapitalize={field.kind === "url" ? "none" : "sentences"} multiline={field.kind === "multiline"} style={[inputStyle, field.kind === "multiline" && styles.multiline, isSecret && { paddingRight: 48 }]} />
      {isSecret ? <Pressable onPress={() => setRevealed((current) => !current)} style={styles.reveal}><Text style={{ color: colors.primary, fontWeight: "700", fontSize: 13 }}>{revealed ? "隐藏" : "显示"}</Text></Pressable> : null}
    </View>
  </View>;
}

const styles = StyleSheet.create({
  fieldWrap: { gap: 6, marginBottom: 17 }, label: { fontSize: 15, fontWeight: "700" }, help: { fontSize: 12, lineHeight: 16 },
  input: { borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, fontSize: 16, minHeight: 46, paddingHorizontal: 13, paddingVertical: 11 }, multiline: { minHeight: 95, textAlignVertical: "top" },
  reveal: { bottom: 0, justifyContent: "center", paddingHorizontal: 12, position: "absolute", right: 0, top: 0 }, options: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, option: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 11, paddingVertical: 8 },
  booleanRow: { alignItems: "center", flexDirection: "row", gap: 12, marginBottom: 17 },
});
