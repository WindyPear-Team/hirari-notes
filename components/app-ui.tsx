import { PropsWithChildren } from "react";
import { Modal, Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native";

import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";

export function Card({ children, style }: PropsWithChildren<{ style?: ViewStyle }>) {
  const colors = useColors();
  return <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, style]}>{children}</View>;
}

export function SectionTitle({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  const colors = useColors();
  return <View style={styles.sectionHeader}>
    <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
    {action ? <Pressable onPress={onAction} hitSlop={8}><Text style={[styles.actionText, { color: colors.primary }]}>{action}</Text></Pressable> : null}
  </View>;
}

export function StatusPill({ label, tone = "neutral" }: { label: string; tone?: "neutral" | "success" | "warning" | "error" }) {
  const colors = useColors();
  const color = tone === "success" ? colors.success : tone === "warning" ? colors.warning : tone === "error" ? colors.error : colors.muted;
  return <View style={[styles.pill, { backgroundColor: `${color}20` }]}><Text style={[styles.pillText, { color }]}>{label}</Text></View>;
}

export function PrimaryButton({ label, onPress, icon = "plus", disabled = false, tone = "primary" }: { label: string; onPress: () => void; icon?: string; disabled?: boolean; tone?: "primary" | "danger" }) {
  const colors = useColors();
  const backgroundColor = tone === "danger" ? colors.error : colors.primary;
  return <Pressable disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.primaryButton, { backgroundColor, opacity: disabled ? 0.45 : pressed ? 0.78 : 1 }]}>
    <IconSymbol name={icon as never} size={18} color="#FFFFFF" weight="semibold" />
    <Text style={styles.primaryButtonLabel}>{label}</Text>
  </Pressable>;
}

export function ModalSheet({ visible, title, onClose, children }: PropsWithChildren<{ visible: boolean; title: string; onClose: () => void }>) {
  const colors = useColors();
  return <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
    <View style={[styles.sheet, { backgroundColor: colors.background }]}>
      <View style={[styles.sheetHeader, { borderColor: colors.border }]}>
        <Pressable onPress={onClose} hitSlop={8}><Text style={[styles.cancelText, { color: colors.muted }]}>关闭</Text></Pressable>
        <Text numberOfLines={1} style={[styles.sheetTitle, { color: colors.text }]}>{title}</Text>
        <View style={{ width: 34 }} />
      </View>
      {children}
    </View>
  </Modal>;
}

export function EmptyState({ title, description, icon = "note.text" }: { title: string; description: string; icon?: string }) {
  const colors = useColors();
  return <View style={styles.empty}>
    <View style={[styles.emptyIcon, { backgroundColor: `${colors.primary}18` }]}><IconSymbol name={icon as never} color={colors.primary} size={28} /></View>
    <Text style={[styles.emptyTitle, { color: colors.text }]}>{title}</Text>
    <Text style={[styles.emptyDescription, { color: colors.muted }]}>{description}</Text>
  </View>;
}

const styles = StyleSheet.create({
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 18, padding: 15, gap: 10 },
  sectionHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: 9, marginTop: 22 },
  sectionTitle: { fontSize: 20, fontWeight: "700", letterSpacing: -0.25 },
  actionText: { fontSize: 15, fontWeight: "600" },
  pill: { alignSelf: "flex-start", borderRadius: 99, paddingHorizontal: 9, paddingVertical: 4 },
  pillText: { fontSize: 12, fontWeight: "700" },
  primaryButton: { alignItems: "center", borderRadius: 14, flexDirection: "row", gap: 8, justifyContent: "center", minHeight: 48, paddingHorizontal: 16 },
  primaryButtonLabel: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  sheet: { flex: 1 },
  sheetHeader: { alignItems: "center", borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: "row", height: 55, justifyContent: "space-between", paddingHorizontal: 18 },
  cancelText: { fontSize: 16, fontWeight: "600" },
  sheetTitle: { fontSize: 17, fontWeight: "700", maxWidth: "66%" },
  empty: { alignItems: "center", gap: 9, paddingHorizontal: 36, paddingTop: 50 },
  emptyIcon: { alignItems: "center", borderRadius: 20, height: 56, justifyContent: "center", marginBottom: 6, width: 56 },
  emptyTitle: { fontSize: 19, fontWeight: "700" },
  emptyDescription: { fontSize: 14, lineHeight: 20, textAlign: "center" },
});
