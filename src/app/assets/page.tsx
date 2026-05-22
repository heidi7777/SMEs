"use client";

import { useMemo, useState } from "react";
import { appActions, useAppStore } from "@/lib/appStore";

function uuid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export default function AssetsPage() {
  const store = useAppStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const editing = useMemo(() => store.assets.find((a) => a.id === editingId) ?? null, [store.assets, editingId]);

  const [folder, setFolder] = useState("");
  const [name, setName] = useState("");
  const [content, setContent] = useState("");

  function startCreate() {
    setEditingId(null);
    setFolder("默认");
    setName("");
    setContent("");
  }

  function startEdit(id: string) {
    const a = store.assets.find((x) => x.id === id);
    if (!a) return;
    setEditingId(id);
    setFolder(a.folder ?? "");
    setName(a.name);
    setContent(a.content);
  }

  function save() {
    const id = editingId ?? uuid();
    appActions.upsertAsset({ id, folder: folder.trim() || undefined, name: name.trim() || "未命名模板", content });
    setEditingId(id);
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 12, alignItems: "start" }}>
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div className="cardTitle">全局资产库</div>
          <button className="button buttonPrimary" onClick={startCreate}>
            新建模板
          </button>
        </div>
        <div className="muted" style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 12 }}>
          支持在模板中写入 <code>[变量占位符]</code>。在任意房间输入框敲 <code>/</code> 可唤起模板列表，选择后会弹出
          配方配置 Modal，填写变量并直接发起模型请求。
        </div>

        {store.assets.length === 0 ? (
          <div className="muted">暂无模板。点右上角「新建模板」开始。</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {store.assets.map((a) => (
              <div key={a.id} style={{ display: "flex", gap: 8 }}>
                <button
                  className="button"
                  style={{ flex: 1, justifyContent: "space-between", minWidth: 0 }}
                  onClick={() => startEdit(a.id)}
                >
                  <span style={{ display: "flex", gap: 10, minWidth: 0 }}>
                    <span style={{ color: "var(--muted)", whiteSpace: "nowrap" }}>{a.folder ?? "未分类"}</span>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.name}</span>
                  </span>
                  <span className="muted" style={{ fontSize: 12 }}>
                    {new Date(a.updatedAt).toLocaleString()}
                  </span>
                </button>
                <button className="button buttonDanger" onClick={() => appActions.deleteAsset(a.id)}>
                  删除
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <div className="cardTitle" style={{ marginBottom: 10 }}>
          {editing ? `编辑：${editing.name}` : "新建/编辑模板"}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span className="muted" style={{ fontSize: 12 }}>
              文件夹（可选）
            </span>
            <input
              value={folder}
              onChange={(e) => setFolder(e.target.value)}
              placeholder="例如：默认 / 海报 / 沟通话术"
              style={{
                width: "100%",
                borderRadius: 12,
                border: "1px solid var(--border)",
                padding: "10px 12px",
                background: "var(--panel-2)",
                color: "var(--text)",
                outline: "none",
              }}
            />
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span className="muted" style={{ fontSize: 12 }}>
              模板名称
            </span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：客户拒绝加价话术（NVC+BATNA）"
              style={{
                width: "100%",
                borderRadius: 12,
                border: "1px solid var(--border)",
                padding: "10px 12px",
                background: "var(--panel-2)",
                color: "var(--text)",
                outline: "none",
              }}
            />
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span className="muted" style={{ fontSize: 12 }}>
              模板内容（支持 [变量]）
            </span>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="写模板内容，例如：\n客户诉求：[诉求]\n我的底线：[底线]\n请生成 NVC+BATNA 话术..."
              style={{
                width: "100%",
                resize: "vertical",
                minHeight: 260,
                borderRadius: 12,
                border: "1px solid var(--border)",
                padding: "10px 12px",
                background: "var(--panel-2)",
                color: "var(--text)",
                outline: "none",
                lineHeight: 1.5,
                whiteSpace: "pre-wrap",
              }}
            />
          </label>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button className="button" onClick={startCreate}>
              清空
            </button>
            <button className="button buttonPrimary" onClick={save}>
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
