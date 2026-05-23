"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { appActions, useAppStore } from "@/lib/appStore";
import type { AssetTemplate, Chip, Message, ModuleKey } from "@/lib/types";

const EMPTY_GUIDE = {
  answer:
    "我没有收到具体内容。你可以：\n1) 直接粘贴客户/竞品/需求的原文\n2) 说清楚“目标人群/场景/限制/交付物”\n3) 给 1 个参考样例（你觉得像的风格/品牌/竞品）\n\n你也可以点下面的选项继续。",
  chips: ["我先贴客户反馈", "我要做竞品拆解", "我要生成生图 Prompt"],
};

function toChips(items: string[] | undefined): Chip[] | undefined {
  if (!items) return undefined;
  return items.slice(0, 6).map((t) => ({ id: `${Date.now()}_${Math.random().toString(16).slice(2)}`, text: t }));
}

function parsePlaceholders(template: string) {
  const matches = template.match(/\[[^\[\]]+\]/g) ?? [];
  const names = Array.from(new Set(matches.map((m) => m.slice(1, -1).trim()).filter(Boolean)));
  return names;
}

function fillPlaceholders(template: string, values: Record<string, string>) {
  return template.replace(/\[([^\[\]]+)\]/g, (_, k: string) => values[k.trim()] ?? "");
}

export default function Room(props: { moduleKey: ModuleKey; title: string; emptyHint: string }) {
  const { moduleKey, title, emptyHint } = props;
  const store = useAppStore();
  const router = useRouter();
  const searchParams = useSearchParams();

  const cid = searchParams.get("cid");
  const autoSend = searchParams.get("autoSend");

  const convs = useMemo(
    () => store.conversations.filter((c) => c.moduleKey === moduleKey).sort((a, b) => b.updatedAt - a.updatedAt),
    [store.conversations, moduleKey]
  );
  const active = useMemo(() => store.conversations.find((c) => c.id === cid) ?? null, [store.conversations, cid]);

  // 第一次进入：无历史 => 自动创建新会话；有历史 => 展示列表
  useEffect(() => {
    if (cid) return;
    if (convs.length === 0) {
      const nextId = appActions.createConversation(moduleKey);
      router.replace(`/${moduleKey}?cid=${encodeURIComponent(nextId)}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cid, convs.length, moduleKey]);

  // 处理 Dashboard 破冰卡：自动发一条
  const didAutoSendRef = useRef(false);
  useEffect(() => {
    if (!cid || !autoSend) return;
    if (didAutoSendRef.current) return;
    didAutoSendRef.current = true;
    // 移除 autoSend 参数，避免刷新重复发送
    router.replace(`/${moduleKey}?cid=${encodeURIComponent(cid)}`);
    // 延迟一下确保页面组件已就绪
    setTimeout(() => {
      void send(autoSend);
    }, 50);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cid, autoSend, moduleKey]);

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [assetPickerOpen, setAssetPickerOpen] = useState(false);
  const [assetModal, setAssetModal] = useState<null | { asset: AssetTemplate; keys: string[]; values: Record<string, string> }>(
    null
  );

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const autoScrollRef = useRef(true);

  const messages: Message[] = active?.messages ?? [];

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (!autoScrollRef.current) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages.length, isLoading]);

  function onScroll() {
    const el = scrollRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    autoScrollRef.current = distance < 80;
  }


async function send(text: string) {
    if (!active) return;
    if (isLoading) return;

    if (text.length > 1500) {
      appActions.addAssistantMessage(active.id, { content: "输入超过 1500 字上限，请精简后再试。", isError: true });
      return;
    }

    const trimmed = text.trim();
    if (!trimmed) {
      appActions.addAssistantMessage(active.id, { content: EMPTY_GUIDE.answer, chips: toChips(EMPTY_GUIDE.chips) });
      return;
    }

    appActions.addUserMessage(active.id, text);
    setInput("");
    setIsLoading(true);

    // 提前创建一条空的 Assistant 消息用于流式追加
    const assistantMsgId = appActions.addAssistantMessage(active.id, { content: "正在思考..." });

    const windowMessages = [...messages, { id: "tmp", role: "user" as const, content: text, createdAt: Date.now() }]
      .slice(-10)
      .map((m) => ({ role: m.role, content: m.content }));

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moduleKey, messages: windowMessages }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "服务响应异常");
      }
      
      if (!res.body) throw new Error("未接收到数据流");

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let fullText = "";
      let hasParsedChips = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        fullText += decoder.decode(value, { stream: true });
        
        // 实时探测 Chips 标记
        const chipsMarkerIndex = fullText.indexOf("---CHIPS---");
        
        if (chipsMarkerIndex !== -1) {
          hasParsedChips = true;
          const mainContent = fullText.substring(0, chipsMarkerIndex).trim();
          const chipsRawStr = fullText.substring(chipsMarkerIndex + 11).trim();
          
          const parsedChips = chipsRawStr
            .split("|")
            .map(c => c.trim())
            .filter(Boolean)
            .map(t => ({ id: `${Date.now()}_${Math.random().toString(16).slice(2)}`, text: t }));

          appActions.updateAssistantMessage(assistantMsgId, { content: mainContent, chips: parsedChips });
        } else {
          appActions.updateAssistantMessage(assistantMsgId, { content: fullText });
        }
      }

      // 【风险兜底】如果模型没有输出标记，挂载默认 Chips
      if (!hasParsedChips) {
        const defaultChipsMap: Record<string, string[]> = {
          creative: ["再来 5 个创意方向", "做 JTBD 竞品拆解", "把方案写成一句话卖点"],
          visual: ["再给 2 套 Prompt", "加留白/构图参数", "把“高级感”转成 PBR 参数"],
          comms: ["提炼成事实清单", "生成 A/B 选项确认", "输出 NVC 话术并含底线"],
          marketing: ["按黄金圈出 PPT 大纲", "按 STP 写卖点清单", "生成小红书种草文案"],
        };
        const fallbackChips = (defaultChipsMap[moduleKey as string] || []).map(t => ({ 
          id: `${Date.now()}_${Math.random().toString(16).slice(2)}`, text: t 
        }));
        
        appActions.updateAssistantMessage(assistantMsgId, { content: fullText.trim(), chips: fallbackChips });
      }

    } catch (e) {
      const msg = e instanceof Error ? e.message : "网络超时，请重试";
      appActions.updateAssistantMessage(assistantMsgId, { content: msg, isError: true });
    } finally {
      setIsLoading(false);
    }
  }

  function openAssetPicker() {
    setAssetPickerOpen(true);
  }

  function closeAssetPicker() {
    setAssetPickerOpen(false);
  }

  function pickAsset(asset: AssetTemplate) {
    closeAssetPicker();
    const keys = parsePlaceholders(asset.content);
    if (keys.length > 0) {
      const init: Record<string, string> = {};
      for (const k of keys) init[k] = "";
      setAssetModal({ asset, keys, values: init });
      return;
    }
    void send(asset.content);
  }

  function renderHistoryList() {
    return (
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div className="cardTitle">{title} · 历史会话</div>
          <button
            className="button buttonPrimary"
            onClick={() => {
              const nextId = appActions.createConversation(moduleKey);
              router.push(`/${moduleKey}?cid=${encodeURIComponent(nextId)}`);
            }}
          >
            新建会话
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {convs.map((c) => (
            <div key={c.id} style={{ display: "flex", gap: 8 }}>
              <button
                className="button"
                style={{ flex: 1, justifyContent: "space-between", minWidth: 0 }}
                onClick={() => router.push(`/${moduleKey}?cid=${encodeURIComponent(c.id)}`)}
              >
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.title}</span>
                <span style={{ color: "var(--muted)", fontSize: 12 }}>{new Date(c.updatedAt).toLocaleString()}</span>
              </button>
              <button
                className="button buttonDanger"
                onClick={() => {
                  appActions.deleteConversation(c.id);
                }}
                title="删除"
              >
                删除
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  function renderChat() {
    if (!active) return null;
    const showHint = messages.length === 0 && input.length === 0;

    return (
      <div className="room">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div>
            <div className="pageTitle">{title}</div>
            <div className="muted">会话：{active.title}</div>
          </div>
          {convs.length > 0 && (
            <button className="button" onClick={() => router.push(`/${moduleKey}`)}>
              查看历史
            </button>
          )}
        </div>

        <div className="card" style={{ display: "flex", flexDirection: "column", height: "70vh", minHeight: 520 }}>
          <div
            ref={scrollRef}
            onScroll={onScroll}
            style={{
              flex: 1,
              overflow: "auto",
              padding: 12,
              borderBottom: "1px solid var(--border)",
              position: "relative",
            }}
          >
            {showHint && (
              <div
                style={{
                  position: "absolute",
                  top: "40%",
                  left: "50%",
                  transform: "translate(-50%,-50%)",
                  color: "var(--muted)",
                  background: "rgba(0,0,0,0.25)",
                  border: "1px solid var(--border)",
                  padding: "10px 12px",
                  borderRadius: 12,
                  maxWidth: 520,
                  textAlign: "center",
                }}
              >
                {emptyHint}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {messages.map((m) => (
                <div
                  key={m.id}
                  style={{
                    alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                    maxWidth: "78%",
                  }}
                >
                  <div
                    style={{
                      background: m.role === "user" ? "rgba(124, 92, 255, 0.14)" : "rgba(255,255,255,0.06)",
                      border: `1px solid ${m.isError ? "rgba(255,77,79,0.55)" : "var(--border)"}`,
                      borderRadius: 14,
                      padding: "10px 12px",
                      whiteSpace: "pre-wrap",
                      lineHeight: 1.55,
                      color: m.isError ? "#ffd1d1" : "var(--text)",
                    }}
                  >
                    {m.content}
                  </div>

                  {m.role === "assistant" && (
                    <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                      <button
                        className="button"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(m.content);
                            setCopiedId(m.id);
                            setTimeout(() => setCopiedId((cur) => (cur === m.id ? null : cur)), 2000);
                          } catch {
                            // ignore
                          }
                        }}
                      >
                        {copiedId === m.id ? "已复制" : "📋 复制"}
                      </button>
                      <button className="button" onClick={() => appActions.toggleFavorite(active.id, m.id)}>
                        {m.isFavorite ? "✅ 已收藏" : "📌 收藏"}
                      </button>
                    </div>
                  )}

                  {m.role === "assistant" && m.chips && m.chips.length > 0 && (
                    <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                      {m.chips.map((c) => (
                        <button key={c.id} className="button" onClick={() => void send(c.text)}>
                          {c.text}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {isLoading && (
                <div style={{ alignSelf: "flex-start", maxWidth: "78%" }}>
                  <div
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid var(--border)",
                      borderRadius: 14,
                      padding: "10px 12px",
                      opacity: 0.9,
                      animation: "treaPulse 1.6s ease-in-out infinite",
                    }}
                  >
                    正在生成…
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 输入区 */}
          <div style={{ padding: 12, position: "relative" }}>
            {assetPickerOpen && (
              <div
                style={{
                  position: "absolute",
                  left: 12,
                  right: 12,
                  bottom: 88,
                  background: "var(--panel)",
                  border: "1px solid var(--border)",
                  borderRadius: 14,
                  padding: 10,
                  zIndex: 10,
                }}
              >
                <div className="muted" style={{ fontSize: 12, marginBottom: 8 }}>
                  资产库（点击即用）
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 260, overflow: "auto" }}>
                  {store.assets.map((a) => (
                    <button
                      key={a.id}
                      className="button"
                      style={{ justifyContent: "space-between" }}
                      onClick={() => pickAsset(a)}
                    >
                      <span style={{ display: "flex", gap: 10, minWidth: 0 }}>
                        <span style={{ color: "var(--muted)", whiteSpace: "nowrap" }}>{a.folder ?? "未分类"}</span>
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.name}</span>
                      </span>
                      <span style={{ color: "var(--muted)", fontSize: 12 }}>使用</span>
                    </button>
                  ))}
                  {store.assets.length === 0 && <div className="muted">暂无资产。去「资产库」页新建一些模板吧。</div>}
                </div>
                <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end" }}>
                  <button className="button" onClick={closeAssetPicker}>
                    关闭
                  </button>
                </div>
              </div>
            )}

            <textarea
              value={input}
              disabled={isLoading}
              placeholder="输入内容（Enter 发送，Shift+Enter 换行）。输入 / 唤起资产库。"
              onChange={(e) => {
                const v = e.target.value;
                if (v.endsWith("/")) {
                  setInput(v.slice(0, -1));
                  openAssetPicker();
                  return;
                }
                setInput(v);
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setAssetPickerOpen(false);
                  setAssetModal(null);
                  return;
                }
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send(input);
                }
              }}
              style={{
                width: "100%",
                resize: "none",
                borderRadius: 14,
                border: "1px solid var(--border)",
                padding: "10px 12px",
                minHeight: 64,
                background: "var(--panel-2)",
                color: "var(--text)",
                outline: "none",
              }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, alignItems: "center" }}>
              <div className="muted" style={{ fontSize: 12 }}>
                {input.length > 1500 ? (
                  <span style={{ color: "var(--danger)" }}>已超出 1500 字上限</span>
                ) : (
                  <span>{input.length}/1500</span>
                )}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="button" onClick={openAssetPicker} disabled={isLoading}>
                  /
                </button>
                <button className="button buttonPrimary" onClick={() => void send(input)} disabled={isLoading}>
                  发送
                </button>
              </div>
            </div>
          </div>
        </div>

        {assetModal && (
          <div
            role="dialog"
            aria-modal="true"
            onClick={() => setAssetModal(null)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.55)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 16,
              zIndex: 50,
            }}
          >
            <div
              className="card"
              onClick={(e) => e.stopPropagation()}
              style={{ width: "min(720px, 100%)", background: "var(--panel)" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div className="cardTitle">配方配置：{assetModal.asset.name}</div>
                <button className="button" onClick={() => setAssetModal(null)}>
                  X
                </button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {assetModal.keys.map((k) => (
                  <label key={k} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <span className="muted" style={{ fontSize: 12 }}>
                      {k}
                    </span>
                    <input
                      value={assetModal.values[k] ?? ""}
                      onChange={(e) =>
                        setAssetModal((cur) => {
                          if (!cur) return cur;
                          return { ...cur, values: { ...cur.values, [k]: e.target.value } };
                        })
                      }
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
                ))}
              </div>
              <div style={{ marginTop: 14, display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button className="button" onClick={() => setAssetModal(null)}>
                  取消
                </button>
                <button
                  className="button buttonPrimary"
                  onClick={() => {
                    const filled = fillPlaceholders(assetModal.asset.content, assetModal.values);
                    setAssetModal(null);
                    void send(filled);
                  }}
                >
                  确认并发起
                </button>
              </div>
            </div>
          </div>
        )}

        <style jsx global>{`
          @keyframes treaPulse {
            0% {
              opacity: 0.45;
            }
            50% {
              opacity: 0.95;
            }
            100% {
              opacity: 0.45;
            }
          }
        `}</style>
      </div>
    );
  }

  // 有历史但未选中 cid：展示历史列表
  if (!cid && convs.length > 0) return renderHistoryList();

  return renderChat();
}

