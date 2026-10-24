// 设置：本机模式 / 连接服务器、考试日期、每天时间。

import type { Settings, SettingsView } from "@ps/core";
import { createHttpApi } from "@ps/core";
import { useEffect, useState } from "react";
import { Alert, TextInput, View } from "react-native";
import { useAction, useConn, useQuery } from "../src/conn.tsx";
import { usePalette } from "../src/theme.ts";
import { Btn, Card, H2, Loading, s, Screen, Seg, T } from "../src/ui.tsx";

export default function SettingsScreen() {
  const p = usePalette();
  const { config, saveConfig, resetLocal, api } = useConn();
  const { run, busy } = useAction();
  const [mode, setMode] = useState(config.mode);
  const [url, setUrl] = useState(config.url);
  const [token, setToken] = useState(config.token);
  const { data, error } = useQuery<SettingsView>("settings", (a) => a.settings());
  const [f, setF] = useState<Settings | null>(null);
  useEffect(() => {
    if (data) setF(data.settings);
  }, [data]);

  const input = [s.input, { borderColor: p.ruleStrong, color: p.ink }];

  const test = async () => {
    try {
      const res = await createHttpApi({ baseUrl: url.trim(), token: token.trim() || undefined }).settings();
      Alert.alert("连接成功", res.server.aiEnabled ? `AI 已开启（${res.server.model}）` : "服务器可用，但还没有配置 AI");
    } catch (e) {
      Alert.alert("连接失败", e instanceof Error ? e.message : String(e));
    }
  };

  if (!f) return <Loading error={error} />;
  return (
    <Screen>
      <Card>
        <H2>数据存在哪里</H2>
        <Seg value={mode} onChange={setMode} options={[["local", "本机"], ["server", "我的服务器"]]} />
        {mode === "local" ? (
          <T tone="ink2" size={13}>数据只存在这台手机里，打开就能用，但不能 AI 分析上传的照片。</T>
        ) : (
          <View style={{ gap: 8 }}>
            <T tone="ink2" size={13}>填电脑上启动服务器时显示的地址（手机和电脑在同一个 Wi-Fi），或者部署到云上的地址。</T>
            <TextInput style={input} placeholder="http://192.168.1.10:8787" placeholderTextColor={p.muted} autoCapitalize="none" autoCorrect={false} keyboardType="url" value={url} onChangeText={setUrl} />
            <TextInput style={input} placeholder="访问口令（没有设置就留空）" placeholderTextColor={p.muted} autoCapitalize="none" secureTextEntry value={token} onChangeText={setToken} />
            <Btn title="测试连接" onPress={test} disabled={!url.trim()} />
          </View>
        )}
        <Btn
          title="保存"
          kind="primary"
          disabled={mode === "server" && !url.trim()}
          onPress={() => saveConfig({ mode, url: url.trim().replace(/\/+$/, ""), token: token.trim() })}
        />
      </Card>

      <Card>
        <H2>备考</H2>
        <T tone="ink2" size={13}>考试日期（YYYY-MM-DD，以官方公布为准）</T>
        <TextInput style={input} value={f.examDate} onChangeText={(v) => setF({ ...f, examDate: v })} />
        <T tone="ink2" size={13}>每天给数学的分钟数</T>
        <TextInput style={input} keyboardType="number-pad" value={String(f.dailyMinutes)} onChangeText={(v) => setF({ ...f, dailyMinutes: Number(v) || 0 })} />
        <T tone="ink2" size={13}>每天新卡上限 / 复习上限</T>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TextInput style={[...input, { flex: 1 }]} keyboardType="number-pad" value={String(f.newCardsPerDay)} onChangeText={(v) => setF({ ...f, newCardsPerDay: Number(v) || 0 })} />
          <TextInput style={[...input, { flex: 1 }]} keyboardType="number-pad" value={String(f.maxReviewsPerDay)} onChangeText={(v) => setF({ ...f, maxReviewsPerDay: Number(v) || 0 })} />
        </View>
        <Btn title="保存设置" kind="primary" disabled={busy} onPress={() => run(() => api.updateSettings(f))} />
      </Card>

      {config.mode === "local" ? (
        <Card>
          <H2>本机数据</H2>
          <Btn
            title="重置为初始数据"
            kind="danger"
            onPress={() =>
              Alert.alert("重置本机数据？", "会清掉手机里的所有记录，恢复到 2021、2022 真题的初始数据。", [
                { text: "取消", style: "cancel" },
                { text: "重置", style: "destructive", onPress: () => void resetLocal() },
              ])
            }
          />
        </Card>
      ) : null}
    </Screen>
  );
}
