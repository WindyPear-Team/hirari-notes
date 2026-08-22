import { useEffect, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { Card, ModalSheet, PrimaryButton, StatusPill } from "@/components/app-ui";
import { FlowEditorSheet, defaultHttpFlow } from "@/components/sync/flow-editor-sheet";
import { useColors } from "@/hooks/use-colors";
import { createId } from "@/lib/notes/schema";
import { saveCredential } from "@/lib/sync/secure-credentials";
import type { AuthenticationKind, ConflictStrategy, HttpFlow, SftpConfig, SyncCredential, SyncProfile, SyncProtocol, WebDavConfig } from "@/lib/sync/types";
import { useSync } from "@/lib/sync/sync-provider";

const protocolOptions: Array<{ value: SyncProtocol; label: string; description: string }> = [
  { value: "webdav", label: "WebDAV", description: "标准目录与 JSON 清单" }, { value: "sftp", label: "SFTP", description: "SSH 安全文件传输" }, { value: "http-flow", label: "HTTP 流程", description: "可视化节点与映射" },
];
const strategyOptions: Array<{ value: ConflictStrategy; label: string }> = [{ value: "newer", label: "较新版本" }, { value: "local", label: "保留本机" }, { value: "remote", label: "保留远端" }, { value: "duplicate", label: "创建副本" }];

export function SyncProfileSheet({ visible, profile, onClose }: { visible: boolean; profile?: SyncProfile; onClose: () => void }) {
  const colors = useColors();
  const { saveProfile } = useSync();
  const [name, setName] = useState(""); const [protocol, setProtocol] = useState<SyncProtocol>("webdav"); const [strategy, setStrategy] = useState<ConflictStrategy>("duplicate");
  const [baseUrl, setBaseUrl] = useState(""); const [manifestPath, setManifestPath] = useState("tsumugi/sync.json");
  const [host, setHost] = useState(""); const [port, setPort] = useState("22"); const [username, setUsername] = useState(""); const [remoteDirectory, setRemoteDirectory] = useState("/tsumugi"); const [sftpAuth, setSftpAuth] = useState<"password" | "privateKey">("password");
  const [auth, setAuth] = useState<AuthenticationKind>("basic"); const [password, setPassword] = useState(""); const [token, setToken] = useState(""); const [privateKey, setPrivateKey] = useState(""); const [passphrase, setPassphrase] = useState("");
  const [flow, setFlow] = useState<HttpFlow>(defaultHttpFlow); const [flowVisible, setFlowVisible] = useState(false); const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setName(profile?.name ?? ""); setProtocol(profile?.protocol ?? "webdav"); setStrategy(profile?.conflictStrategy ?? "duplicate");
    if (profile?.protocol === "webdav") { const config = profile.config as WebDavConfig; setBaseUrl(config.baseUrl); setManifestPath(config.manifestPath); setAuth("basic"); }
    if (profile?.protocol === "sftp") { const config = profile.config as SftpConfig; setHost(config.host); setPort(String(config.port)); setUsername(config.username); setRemoteDirectory(config.remoteDirectory); setSftpAuth(config.authentication); setAuth(config.authentication === "password" ? "ssh-password" : "ssh-key"); }
    if (profile?.protocol === "http-flow") { const config = profile.config as { flow: HttpFlow }; setFlow(config.flow); setAuth("bearer"); }
  }, [profile, visible]);
  const input = [styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }];
  const save = async () => {
    setSaving(true);
    try {
      const credentialRef = profile?.credentialRef ?? createId("credential");
      const credential: SyncCredential = { authentication: protocol === "sftp" ? sftpAuth === "password" ? "ssh-password" : "ssh-key" : protocol === "http-flow" ? auth : auth, username, password, token, privateKey, passphrase };
      if (auth !== "none" || protocol === "sftp") await saveCredential(credentialRef, credential);
      const config = protocol === "webdav" ? { baseUrl, manifestPath } satisfies WebDavConfig : protocol === "sftp" ? { host, port: Number(port) || 22, username, remoteDirectory, authentication: sftpAuth } satisfies SftpConfig : { flow };
      await saveProfile({ id: profile?.id, name: name.trim() || protocolOptions.find((option) => option.value === protocol)!.label, protocol, direction: "bidirectional", enabled: true, conflictStrategy: strategy, credentialRef: auth === "none" ? undefined : credentialRef, config });
      onClose();
    } catch (error) { Alert.alert("无法保存同步目标", error instanceof Error ? error.message : "请检查配置信息。"); }
    finally { setSaving(false); }
  };
  const authOptions = protocol === "sftp" ? [{ value: "password", label: "密码" }, { value: "privateKey", label: "SSH 私钥" }] : [{ value: "basic", label: "Basic" }, { value: "bearer", label: "Bearer Token" }, { value: "none", label: "不认证" }];
  return <ModalSheet visible={visible} title={profile ? "编辑同步目标" : "添加同步目标"} onClose={onClose}><KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <Text style={[styles.sectionLabel, { color: colors.muted }]}>同步方式</Text><View style={styles.protocols}>{protocolOptions.map((option) => <Pressable key={option.value} onPress={() => setProtocol(option.value)} style={[styles.protocol, { borderColor: protocol === option.value ? colors.primary : colors.border, backgroundColor: protocol === option.value ? `${colors.primary}15` : colors.surface }]}><Text style={{ color: protocol === option.value ? colors.primary : colors.text, fontSize: 15, fontWeight: "800" }}>{option.label}</Text><Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>{option.description}</Text></Pressable>)}</View>
    <Text style={[styles.sectionLabel, { color: colors.muted }]}>基本信息</Text><TextInput value={name} onChangeText={setName} placeholder="同步目标名称，例如 家庭 NAS" placeholderTextColor={colors.muted} style={input} />
    {protocol === "webdav" ? <><Text style={[styles.sectionLabel, { color: colors.muted }]}>WebDAV 位置</Text><TextInput value={baseUrl} onChangeText={setBaseUrl} placeholder="https://dav.example.com/remote.php/dav/files/name" placeholderTextColor={colors.muted} autoCapitalize="none" keyboardType="url" style={input} /><TextInput value={manifestPath} onChangeText={setManifestPath} placeholder="tsumugi/sync.json" placeholderTextColor={colors.muted} autoCapitalize="none" style={input} /></> : null}
    {protocol === "sftp" ? <><Text style={[styles.sectionLabel, { color: colors.muted }]}>SFTP 服务器</Text><View style={styles.twoColumns}><TextInput value={host} onChangeText={setHost} placeholder="主机" placeholderTextColor={colors.muted} autoCapitalize="none" style={[input, { flex: 1 }]} /><TextInput value={port} onChangeText={setPort} placeholder="端口" placeholderTextColor={colors.muted} keyboardType="numeric" style={[input, { width: 82 }]} /></View><TextInput value={username} onChangeText={setUsername} placeholder="用户名" placeholderTextColor={colors.muted} autoCapitalize="none" style={input} /><TextInput value={remoteDirectory} onChangeText={setRemoteDirectory} placeholder="远端目录，例如 /tsumugi" placeholderTextColor={colors.muted} autoCapitalize="none" style={input} /><Card><StatusPill label="原生客户端" tone="warning" /><Text style={{ color: colors.muted, lineHeight: 19 }}>SFTP 在 iOS 和 Android 原生构建中可用；网页预览仅展示配置与流程，不会发起 SSH 连接。</Text></Card></> : null}
    {protocol === "http-flow" ? <><Text style={[styles.sectionLabel, { color: colors.muted }]}>流程定义</Text><Card><View style={styles.flowSummary}><View><Text style={{ color: colors.text, fontSize: 16, fontWeight: "800" }}>{flow.name}</Text><Text style={{ color: colors.muted, fontSize: 13, marginTop: 4 }}>{flow.nodes.length} 个节点 · {flow.edges.length} 条连线</Text></View><Pressable onPress={() => setFlowVisible(true)}><Text style={{ color: colors.primary, fontWeight: "800" }}>编辑流程</Text></Pressable></View></Card></> : null}
    <Text style={[styles.sectionLabel, { color: colors.muted }]}>认证</Text><View style={styles.authRow}>{authOptions.map((option) => { const active = protocol === "sftp" ? sftpAuth === option.value : auth === option.value; return <Pressable key={option.value} onPress={() => protocol === "sftp" ? setSftpAuth(option.value as "password" | "privateKey") : setAuth(option.value as AuthenticationKind)} style={[styles.authChip, { backgroundColor: active ? `${colors.primary}15` : colors.surface, borderColor: active ? colors.primary : colors.border }]}><Text style={{ color: active ? colors.primary : colors.text, fontWeight: "700", fontSize: 13 }}>{option.label}</Text></Pressable>; })}</View>
    {(auth === "basic" || protocol === "sftp") ? <TextInput value={username} onChangeText={setUsername} placeholder="认证用户名" placeholderTextColor={colors.muted} autoCapitalize="none" style={input} /> : null}
    {(auth === "basic" || auth === "ssh-password" || (protocol === "sftp" && sftpAuth === "password")) ? <TextInput value={password} onChangeText={setPassword} placeholder="密码" placeholderTextColor={colors.muted} secureTextEntry style={input} /> : null}
    {auth === "bearer" ? <TextInput value={token} onChangeText={setToken} placeholder="访问令牌" placeholderTextColor={colors.muted} secureTextEntry autoCapitalize="none" style={input} /> : null}
    {(auth === "ssh-key" || (protocol === "sftp" && sftpAuth === "privateKey")) ? <><TextInput value={privateKey} onChangeText={setPrivateKey} placeholder="-----BEGIN OPENSSH PRIVATE KEY-----" placeholderTextColor={colors.muted} multiline secureTextEntry style={[input, styles.keyInput]} /><TextInput value={passphrase} onChangeText={setPassphrase} placeholder="私钥口令（可选）" placeholderTextColor={colors.muted} secureTextEntry style={input} /></> : null}
    <Text style={[styles.sectionLabel, { color: colors.muted }]}>冲突处理</Text><View style={styles.strategyRow}>{strategyOptions.map((option) => <Pressable key={option.value} onPress={() => setStrategy(option.value)} style={[styles.strategy, { borderColor: strategy === option.value ? colors.primary : colors.border, backgroundColor: strategy === option.value ? `${colors.primary}15` : colors.surface }]}><Text style={{ color: strategy === option.value ? colors.primary : colors.text, fontSize: 13, fontWeight: "700" }}>{option.label}</Text></Pressable>)}</View>
    <PrimaryButton label={saving ? "正在保存…" : "保存同步目标"} onPress={save} icon="checkmark" disabled={saving} />
  </ScrollView></KeyboardAvoidingView><FlowEditorSheet visible={flowVisible} flow={flow} onClose={() => setFlowVisible(false)} onSave={setFlow} /></ModalSheet>;
}

const styles = StyleSheet.create({ content: { gap: 11, padding: 18, paddingBottom: 42 }, sectionLabel: { fontSize: 13, fontWeight: "800", letterSpacing: 0.5, marginTop: 4, textTransform: "uppercase" }, protocols: { gap: 8 }, protocol: { borderRadius: 13, borderWidth: 1, padding: 12 }, input: { borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, fontSize: 15, minHeight: 47, paddingHorizontal: 12, paddingVertical: 9 }, twoColumns: { flexDirection: "row", gap: 9 }, flowSummary: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" }, authRow: { flexDirection: "row", flexWrap: "wrap", gap: 7 }, authChip: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 8 }, keyInput: { minHeight: 100, textAlignVertical: "top" }, strategyRow: { flexDirection: "row", flexWrap: "wrap", gap: 7 }, strategy: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 8 } });
