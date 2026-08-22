import { Tabs } from "expo-router";
import { Platform, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";

export default function TabLayout() {
  const colors = useColors(); const insets = useSafeAreaInsets(); const bottomPadding = Platform.OS === "web" ? 12 : Math.max(insets.bottom, 8);
  return <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.primary, tabBarButton: HapticTab, tabBarStyle: { backgroundColor: colors.background, borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth, height: 56 + bottomPadding, paddingBottom: bottomPadding, paddingTop: 7 } }}>
    <Tabs.Screen name="index" options={{ title: "便签", tabBarIcon: ({ color }) => <IconSymbol name={"house.fill" as never} size={25} color={color} /> }} />
    <Tabs.Screen name="formats" options={{ title: "格式", tabBarIcon: ({ color }) => <IconSymbol name={"square.stack.3d.up.fill" as never} size={25} color={color} /> }} />
    <Tabs.Screen name="sync" options={{ title: "同步", tabBarIcon: ({ color }) => <IconSymbol name={"arrow.triangle.2.circlepath" as never} size={25} color={color} /> }} />
    <Tabs.Screen name="settings" options={{ title: "设置", tabBarIcon: ({ color }) => <IconSymbol name={"gearshape.fill" as never} size={25} color={color} /> }} />
  </Tabs>;
}

