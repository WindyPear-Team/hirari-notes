import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { Card, ModalSheet, PrimaryButton, StatusPill } from "@/components/app-ui";
import { useColors } from "@/hooks/use-colors";
import { createId } from "@/lib/notes/schema";
import { validateHttpFlow } from "@/lib/sync/http-flow";
import type { HttpFlow, HttpFlowNode } from "@/lib/sync/types";

const nodeMeta: Record<HttpFlowNode["kind"], { label: string; color: string }> = {
  start: { label: "开始", color: "#275D54" }, buildRequest: { label: "构造请求", color: "#3867B4" }, sendRequest: { label: "发送请求", color: "#3867B4" }, parseJson: { label: "解析 JSON", color: "#8A5A24" }, mapPayload: { label: "映射同步包", color: "#8F3E62" }, condition: { label: "条件分支", color: "#56636B" }, success: { label: "成功结束", color: "#2D7B58" }, failure: { label: "错误结束", color: "#B5473D" },
};
const addableKinds: HttpFlowNode["kind"][] = ["buildRequest", "sendRequest", "parseJson", "mapPayload", "condition", "failure"];

export function defaultHttpFlow(): HttpFlow {
  return {
    id: createId("flow"), name: "标准 JSON 同步流程", updatedAt: new Date().toISOString(),
    nodes: [
      { id: "start", kind: "start", label: "开始", position: { x: 20, y: 20 } },
      { id: "request", kind: "buildRequest", label: "构造请求", position: { x: 20, y: 112 }, method: "GET", urlTemplate: "https://example.com/notes/sync", headers: { Accept: "application/json" } },
      { id: "send", kind: "sendRequest", label: "发送请求", position: { x: 20, y: 204 } },
      { id: "parse", kind: "parseJson", label: "解析 JSON", position: { x: 20, y: 296 }, source: "$response.body" },
      { id: "map", kind: "mapPayload", label: "映射同步包", position: { x: 20, y: 388 }, source: "$parse", manifestPath: "manifest", recordsPath: "records", cursorPath: "cursor" },
      { id: "success", kind: "success", label: "成功结束", position: { x: 20, y: 480 } },
      { id: "failure", kind: "failure", label: "网络错误", position: { x: 260, y: 204 }, message: "远端服务返回了错误状态。" },
    ],
    edges: [
      { id: "edge_1", source: "start", target: "request" }, { id: "edge_2", source: "request", target: "send" }, { id: "edge_3", source: "send", target: "parse", sourcePort: "success" }, { id: "edge_4", source: "send", target: "failure", sourcePort: "failure" }, { id: "edge_5", source: "parse", target: "map" }, { id: "edge_6", source: "map", target: "success" },
    ],
  };
}

export function FlowEditorSheet({ visible, flow, onClose, onSave }: { visible: boolean; flow: HttpFlow; onClose: () => void; onSave: (flow: HttpFlow) => void }) {
  const colors = useColors();
  const [draft, setDraft] = useState<HttpFlow>(flow);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  useEffect(() => { if (visible) { setDraft(flow); setSelectedId(null); } }, [flow, visible]);
  const selected = useMemo(() => draft.nodes.find((node) => node.id === selectedId), [draft.nodes, selectedId]);
  const updateNode = (id: string, patch: Partial<HttpFlowNode>) => setDraft((current) => ({ ...current, updatedAt: new Date().toISOString(), nodes: current.nodes.map((node) => node.id === id ? { ...node, ...patch } as HttpFlowNode : node) }));
  const addNode = (kind: HttpFlowNode["kind"]) => {
    const beforeSuccess = draft.nodes.find((node) => node.kind === "success");
    if (!beforeSuccess) return;
    const id = createId("node");
    const lastEdge = draft.edges.find((edge) => edge.target === beforeSuccess.id);
    const node: HttpFlowNode = kind === "buildRequest" ? { id, kind, label: nodeMeta[kind].label, position: { x: 20, y: beforeSuccess.position.y - 26 }, method: "GET", urlTemplate: "", headers: {} } : kind === "parseJson" ? { id, kind, label: nodeMeta[kind].label, position: { x: 20, y: beforeSuccess.position.y - 26 }, source: "$response.body" } : kind === "mapPayload" ? { id, kind, label: nodeMeta[kind].label, position: { x: 20, y: beforeSuccess.position.y - 26 }, source: "$parse", manifestPath: "manifest", recordsPath: "records" } : kind === "condition" ? { id, kind, label: nodeMeta[kind].label, position: { x: 20, y: beforeSuccess.position.y - 26 }, source: "$response.status", operator: "status2xx" } : kind === "failure" ? { id, kind, label: nodeMeta[kind].label, position: { x: 260, y: beforeSuccess.position.y - 26 }, message: "流程中止。" } : { id, kind: "sendRequest", label: nodeMeta.sendRequest.label, position: { x: 20, y: beforeSuccess.position.y - 26 } };
    setDraft((current) => ({ ...current, nodes: [...current.nodes.map((item) => item.id === beforeSuccess.id ? { ...item, position: { ...item.position, y: item.position.y + 92 } } : item), node], edges: [...current.edges.filter((edge) => edge !== lastEdge), ...(lastEdge ? [{ ...lastEdge, target: id }, { id: createId("edge"), source: id, target: beforeSuccess.id }] : [])] }));
    setSelectedId(id);
  };
  const save = () => { const errors = validateHttpFlow(draft); if (errors.length) { Alert.alert("流程尚未完成", errors.join("\n")); return; } onSave(draft); onClose(); };
  return <ModalSheet visible={visible} title="HTTP 同步流程" onClose={onClose}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <Text style={[styles.hint, { color: colors.muted }]}>通过节点和连线定义同步请求。敏感凭据仅以引用方式传入，流程不执行任意脚本。</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.canvas, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={{ height: Math.max(600, ...draft.nodes.map((node) => node.position.y + 90)), width: 470 }}>{draft.nodes.map((node) => {
        const active = node.id === selectedId; const meta = nodeMeta[node.kind];
        const outgoing = draft.edges.filter((edge) => edge.source === node.id);
        return <View key={node.id} style={[styles.nodeWrap, { left: node.position.x, top: node.position.y }]}><Pressable onPress={() => setSelectedId(node.id)} style={({ pressed }) => [styles.node, { borderColor: active ? colors.primary : `${meta.color}75`, backgroundColor: active ? `${colors.primary}13` : colors.background, opacity: pressed ? 0.76 : 1 }]}><View style={[styles.nodeStripe, { backgroundColor: meta.color }]} /><View style={{ flex: 1 }}><Text style={[styles.nodeKind, { color: meta.color }]}>{meta.label}</Text><Text numberOfLines={1} style={[styles.nodeTitle, { color: colors.text }]}>{node.label}</Text></View></Pressable>{outgoing.length ? <View style={[styles.connector, { backgroundColor: colors.border }]}>{outgoing.map((edge) => <Text key={edge.id} style={[styles.connectorLabel, { color: colors.muted }]}>{edge.sourcePort === "failure" ? "失败" : edge.sourcePort === "true" ? "是" : edge.sourcePort === "false" ? "否" : "↓"}</Text>)}</View> : null}</View>;
      })}</View>
    </ScrollView>
    <Text style={[styles.sectionLabel, { color: colors.muted }]}>添加节点</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.addRow}>{addableKinds.map((kind) => <Pressable key={kind} onPress={() => addNode(kind)} style={[styles.addNode, { borderColor: colors.border, backgroundColor: colors.surface }]}><Text style={{ color: nodeMeta[kind].color, fontWeight: "800" }}>+ {nodeMeta[kind].label}</Text></Pressable>)}</ScrollView>
    {selected ? <NodeInspector node={selected} colors={colors} onChange={(patch) => updateNode(selected.id, patch)} /> : <Card><Text style={{ color: colors.muted, lineHeight: 20 }}>点选画布中的节点可编辑它的名称和属性。请求和映射只接受受限模板与路径，不会运行未知代码。</Text></Card>}
    <PrimaryButton label="保存流程" onPress={save} icon="checkmark" />
  </ScrollView></ModalSheet>;
}

function NodeInspector({ node, colors, onChange }: { node: HttpFlowNode; colors: ReturnType<typeof useColors>; onChange: (patch: Partial<HttpFlowNode>) => void }) {
  const textInput = [styles.nodeInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }];
  return <Card><View style={styles.inspectorHead}><Text style={{ color: colors.text, fontSize: 17, fontWeight: "800" }}>节点属性</Text><StatusPill label={nodeMeta[node.kind].label} /></View><Text style={[styles.smallLabel, { color: colors.muted }]}>显示名称</Text><TextInput value={node.label} onChangeText={(label) => onChange({ label })} style={textInput} />
    {node.kind === "buildRequest" ? <><Text style={[styles.smallLabel, { color: colors.muted }]}>请求方法</Text><View style={styles.methodRow}>{["GET", "POST", "PUT", "PATCH", "DELETE"].map((method) => <Pressable key={method} onPress={() => onChange({ method: method as "GET" })} style={[styles.method, { borderColor: node.method === method ? colors.primary : colors.border, backgroundColor: node.method === method ? `${colors.primary}15` : colors.background }]}><Text style={{ color: node.method === method ? colors.primary : colors.text, fontWeight: "700", fontSize: 12 }}>{method}</Text></Pressable>)}</View><Text style={[styles.smallLabel, { color: colors.muted }]}>URL 模板</Text><TextInput value={node.urlTemplate} onChangeText={(urlTemplate) => onChange({ urlTemplate })} autoCapitalize="none" placeholder="https://server.example/sync" placeholderTextColor={colors.muted} style={textInput} /><Text style={[styles.smallLabel, { color: colors.muted }]}>JSON 请求体（可选）</Text><TextInput value={node.bodyTemplate ?? ""} onChangeText={(bodyTemplate) => onChange({ bodyTemplate })} placeholder='例如 {"payload": {{inputs.payload}}}' placeholderTextColor={colors.muted} multiline style={[textInput, styles.tallInput]} /></> : null}
    {node.kind === "parseJson" || node.kind === "condition" ? <><Text style={[styles.smallLabel, { color: colors.muted }]}>读取来源</Text><TextInput value={node.source} onChangeText={(source) => onChange({ source })} autoCapitalize="none" placeholder="$response.body" placeholderTextColor={colors.muted} style={textInput} /></> : null}
    {node.kind === "mapPayload" ? <><Text style={[styles.smallLabel, { color: colors.muted }]}>映射来源</Text><TextInput value={node.source} onChangeText={(source) => onChange({ source })} style={textInput} autoCapitalize="none" /><Text style={[styles.smallLabel, { color: colors.muted }]}>清单路径</Text><TextInput value={node.manifestPath} onChangeText={(manifestPath) => onChange({ manifestPath })} style={textInput} autoCapitalize="none" /><Text style={[styles.smallLabel, { color: colors.muted }]}>记录数组路径</Text><TextInput value={node.recordsPath} onChangeText={(recordsPath) => onChange({ recordsPath })} style={textInput} autoCapitalize="none" /></> : null}
    {node.kind === "failure" ? <><Text style={[styles.smallLabel, { color: colors.muted }]}>失败提示</Text><TextInput value={node.message} onChangeText={(message) => onChange({ message })} style={textInput} /></> : null}
  </Card>;
}

const styles = StyleSheet.create({ content: { gap: 14, padding: 18, paddingBottom: 42 }, hint: { fontSize: 13, lineHeight: 19 }, canvas: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, minHeight: 600, padding: 10 }, nodeWrap: { position: "absolute", width: 205 }, node: { alignItems: "center", borderRadius: 13, borderWidth: 1.5, flexDirection: "row", minHeight: 62, overflow: "hidden" }, nodeStripe: { alignSelf: "stretch", width: 6 }, nodeKind: { fontSize: 11, fontWeight: "800", marginBottom: 2, paddingLeft: 10, paddingTop: 9 }, nodeTitle: { fontSize: 15, fontWeight: "700", paddingBottom: 10, paddingHorizontal: 10 }, connector: { alignItems: "center", height: 30, justifyContent: "center", marginLeft: 100, width: 2 }, connectorLabel: { fontSize: 10, left: 5, position: "absolute", top: 6, width: 30 }, sectionLabel: { fontSize: 13, fontWeight: "800", letterSpacing: 0.4, textTransform: "uppercase" }, addRow: { gap: 8 }, addNode: { borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 11, paddingVertical: 9 }, inspectorHead: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" }, smallLabel: { fontSize: 12, fontWeight: "700", marginTop: 4 }, nodeInput: { borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, fontSize: 15, minHeight: 42, paddingHorizontal: 10, paddingVertical: 8 }, tallInput: { minHeight: 74, textAlignVertical: "top" }, methodRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 }, method: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 7 }, });
