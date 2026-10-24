// 上传：拍照、从相册选、选 PDF，写一句说明，交给系统识别评估。

import type { UploadFile } from "@ps/core";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, Image, Pressable, TextInput, View } from "react-native";
import { useAction, useConn } from "../../src/conn.tsx";
import { usePalette } from "../../src/theme.ts";
import { Btn, Card, H2, Row, s, Screen, T } from "../../src/ui.tsx";

export default function Capture() {
  const p = usePalette();
  const { api, today, aiEnabled, config } = useConn();
  const { run, busy } = useAction();
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [source, setSource] = useState("");
  const [text, setText] = useState("");

  const addImages = (assets: ImagePicker.ImagePickerAsset[]) =>
    setFiles((cur) => [
      ...cur,
      ...assets.map((a, i) => ({ uri: a.uri, name: a.fileName ?? `photo-${Date.now()}-${i}.jpg`, type: a.mimeType ?? "image/jpeg", size: a.fileSize, dataUrl: undefined })),
    ]);

  const camera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return Alert.alert("需要相机权限", "请在系统设置里允许使用相机");
    const res = await ImagePicker.launchCameraAsync({ quality: 0.7, mediaTypes: ["images"] });
    if (!res.canceled) addImages(res.assets);
  };
  const library = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.7, mediaTypes: ["images"], allowsMultipleSelection: true, selectionLimit: 20 });
    if (!res.canceled) addImages(res.assets);
  };
  const pdf = async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: ["application/pdf", "text/plain"], multiple: true, copyToCacheDirectory: true });
    if (!res.canceled) setFiles((cur) => [...cur, ...res.assets.map((a) => ({ uri: a.uri, name: a.name, type: a.mimeType ?? "application/pdf", size: a.size }))]);
  };

  const submit = async () => {
    // 本机模式下只保存图片地址用于预览
    const upload = config.mode === "local" ? files.map((f) => ({ ...f, dataUrl: f.type.startsWith("image/") ? f.uri : undefined })) : files;
    const entry = await run(() => api.createEntry({ date: today, source: source.trim() || undefined, text: text.trim() || undefined }, upload));
    if (entry) {
      setFiles([]);
      setText("");
      router.push(`/entry/${entry.id}`);
    }
  };

  return (
    <Screen>
      <T tone="ink2" size={13}>拍下今天做题的过程（最好连答案页一起），或者选 PDF。系统会识别每道题、判定对错和错因、归到题型、生成记忆卡。</T>
      {!aiEnabled ? (
        <View style={{ backgroundColor: p.warnBg, borderRadius: 10, padding: 12 }}>
          <T size={13}>
            {config.mode === "local" ? "现在是本机模式，不能 AI 分析。上传的内容会保存下来；在「诊断 → 设置」里连接自己的服务器后就能自动分析。" : "服务器没有配置 AI，内容会先保存，配置后点「重新分析」。"}
          </T>
        </View>
      ) : null}
      <Row gap={8}>
        <View style={{ flex: 1 }}><Btn title="拍照" kind="primary" onPress={camera} /></View>
        <View style={{ flex: 1 }}><Btn title="相册" onPress={library} /></View>
        <View style={{ flex: 1 }}><Btn title="PDF" onPress={pdf} /></View>
      </Row>
      {files.length ? (
        <Card>
          <H2>{files.length} 个文件</H2>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {files.map((f, i) => (
              <Pressable key={f.uri ?? i} onLongPress={() => setFiles((cur) => cur.filter((_, j) => j !== i))} style={{ width: 96 }}>
                {f.type.startsWith("image/") && f.uri ? (
                  <Image source={{ uri: f.uri }} style={{ width: 96, height: 96, borderRadius: 8 }} />
                ) : (
                  <View style={{ width: 96, height: 96, borderRadius: 8, backgroundColor: p.surface3, alignItems: "center", justifyContent: "center" }}>
                    <T tone="muted">PDF</T>
                  </View>
                )}
                <T size={11} tone="muted" lines={1}>{f.name}</T>
              </Pressable>
            ))}
          </View>
          <T tone="muted" size={12}>长按可以移除</T>
        </Card>
      ) : null}
      <Card>
        <T tone="ink2" size={13}>资料来源（可不填）</T>
        <TextInput style={[s.input, { borderColor: p.ruleStrong, color: p.ink }]} placeholder="如：2023 数二真题、张宇强化 第 5 讲" placeholderTextColor={p.muted} value={source} onChangeText={setSource} />
        <T tone="ink2" size={13}>补充说明</T>
        <TextInput style={[s.input, { borderColor: p.ruleStrong, color: p.ink, minHeight: 80, textAlignVertical: "top" }]} multiline placeholder="例如：做了例题 1-12，第 7、9 题不会" placeholderTextColor={p.muted} value={text} onChangeText={setText} />
        <Btn title={aiEnabled ? "上传并分析" : "上传保存"} kind="primary" disabled={busy || (!files.length && !text.trim())} onPress={submit} />
      </Card>
    </Screen>
  );
}
