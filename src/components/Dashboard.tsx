"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { appActions, useAppStore } from "@/lib/appStore";
import type { ModuleKey } from "@/lib/types";

const quickCards: Array<{ title: string; desc: string; moduleKey: ModuleKey; seed: string }> = [
  {
    title: "创意破冰",
    desc: "给我 3-5 个跨界创意草案（SCAMPER）。",
    moduleKey: "creative",
    seed: "品类：____\n目标人群：____\n限制/预算：____\n请用 SCAMPER 输出 5 个跨界创意草案，每个包含：洞察→做法→风险/验证。",
  },
  {
    title: "客户反馈提炼",
    desc: "把甲方情绪化反馈提炼为事实清单（FIRE）。",
    moduleKey: "comms",
    seed: "请把下面这段客户反馈用 FIRE 模型提炼成《待改需求事实清单》，并生成 A/B 选择题用于确认：\n\n【客户反馈】\n____",
  },
  {
    title: "海报 Prompt",
    desc: "按电商搭棚公式生成可复制的生图 Prompt。",
    moduleKey: "visual",
    seed: "产品：____\n场景：____\n风格参考：____\n加字信息：____\n请按 [产品主体]+[陈列台面]+[环境氛围]+[虚化前景]+[光影] 输出 2 套海报生图 Prompt，并注入构图/留白参数。",
  },
];

function moduleLabel(k: ModuleKey) {
  return k === "creative" ? "创意工坊" : k === "visual" ? "视觉车间" : k === "comms" ? "沟通台" : "营销工坊";
}

function formatDate(ts: number) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(ts));
}

export default function Dashboard() {
  const router = useRouter();
  const store = useAppStore();

  const recent = useMemo(() => {
    return [...store.conversations].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 8);
  }, [store.conversations]);

  return (
    <div>
      <div className="pageTitle">工作台</div>
      <div className="muted" style={{ marginBottom: 14 }}>
        点击「破冰快捷指令卡」即可进入对应房间并新建会话。
      </div>

      <div className="cardGrid" style={{ marginBottom: 16 }}>
        {quickCards.map((c) => (
          <button
            key={c.title}
            className="card quickCard"
            onClick={() => {
              const cid = appActions.createConversation(c.moduleKey);
              router.push(`/${c.moduleKey}?cid=${encodeURIComponent(cid)}&autoSend=${encodeURIComponent(c.seed)}`);
            }}
          >
            <div className="cardTitle">{c.title}</div>
            <div className="cardDesc">{c.desc}</div>
          </button>
        ))}
      </div>

      <div className="card">
        <div className="cardTitle" style={{ marginBottom: 10 }}>
          最近会话
        </div>
        {recent.length === 0 ? (
          <div className="muted">暂无会话。可以先点上方任意破冰卡开始。</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {recent.map((c) => (
              <button
                key={c.id}
                className="button"
                style={{ justifyContent: "space-between" }}
                onClick={() => router.push(`/${c.moduleKey}?cid=${encodeURIComponent(c.id)}`)}
              >
                <span style={{ display: "flex", gap: 10, minWidth: 0 }}>
                  <span style={{ color: "var(--muted)", whiteSpace: "nowrap" }}>{moduleLabel(c.moduleKey)}</span>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>{c.title}</span>
                </span>
                <span style={{ color: "var(--muted)", fontSize: 12 }}>{formatDate(c.updatedAt)}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
