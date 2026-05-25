"use client";

import { useSyncExternalStore, useEffect } from "react";
import type { AppState, AssetTemplate, Conversation, Message, ModuleKey } from "./types";

const STORAGE_KEY = "trea_mvp_state_v1";

function now() {
  return Date.now();
}

function uuid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${now()}_${Math.random().toString(16).slice(2)}`;
}

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

// 修改点 1：初始状态必须是静态确定的。移除 uuid() 和 now()，改用硬编码字符串和固定时间戳，确保 SSR 和客户端的水合内容完全一致。
function getInitialState(): AppState {
  return {
    version: 1,
    conversations: [],
    assets: [
      {
        id: "default-asset-01",
        folder: "默认",
        name: "海报生图 Prompt（电商搭棚）",
        content:
          "[产品主体] + [陈列台面] + [环境氛围] + [虚化前景] + [光影]。补充：构图 [三分法/负空间]，镜头 [焦段/景深]，材质 [PBR 参数]。",
        createdAt: 1716500000000,
        updatedAt: 1716500000000,
      },
    ],
  };
}

let state: AppState = getInitialState();
const listeners = new Set<() => void>();
let hydrated = false;

function persist(next: AppState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

// 修改点 2：将确保状态水合的逻辑解耦，使其仅在客户端被主动调用时读取 localStorage 并触发一次状态更新。
function ensureHydrated() {
  if (typeof window === "undefined") return;
  if (hydrated) return;
  hydrated = true;
  const fromStorage = safeParse<AppState>(window.localStorage.getItem(STORAGE_KEY));
  if (fromStorage && fromStorage.version === 1) {
    state = fromStorage;
    emit(); // 读取本地数据后，触发重渲染
  } else {
    persist(state);
  }
}

function emit() {
  for (const l of listeners) l();
}

function setState(updater: (prev: AppState) => AppState, options?: { persist?: boolean }) {
  state = updater(state);
  if (options?.persist !== false) {
    persist(state);
  }
  emit();
}

// 修改点 3：利用 useEffect 在组件挂载后执行副作用（读取本地数据），并使 getSnapshot 成为绝对的纯函数。
export function useAppStore() {
  useEffect(() => {
    ensureHydrated();
  }, []);

  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state, // 客户端快照（纯函数）
    () => state  // 服务端快照（纯函数，确保与初始状态一致）
  );
}

export const appActions = {
  createConversation(moduleKey: ModuleKey, firstUserMessage?: string) {
    const id = uuid();
    const createdAt = now();
    const conv: Conversation = {
      id,
      moduleKey,
      title: "新会话",
      createdAt,
      updatedAt: createdAt,
      messages: [],
    };

    setState((prev) => ({ ...prev, conversations: [conv, ...prev.conversations] }));

    if (firstUserMessage !== undefined) {
      this.addUserMessage(id, firstUserMessage);
    }

    return id;
  },

  deleteConversation(conversationId: string) {
    setState((prev) => ({
      ...prev,
      conversations: prev.conversations.filter((c) => c.id !== conversationId),
    }));
  },

  addUserMessage(conversationId: string, content: string) {
    const message: Message = {
      id: uuid(),
      role: "user",
      content,
      createdAt: now(),
    };
    setState((prev) => {
      const nextConvs = prev.conversations.map((c) => {
        if (c.id !== conversationId) return c;
        const nextMessages = [...c.messages, message];
        const title =
          c.messages.length === 0 ? (content.slice(0, 15) + (content.length > 15 ? "…" : "")) : c.title;
        return { ...c, title, messages: nextMessages, updatedAt: now() };
      });
      return { ...prev, conversations: nextConvs };
    });
    return message.id;
  },

  addAssistantMessage(
    conversationId: string,
    payload: Pick<Message, "content" | "chips" | "isError"> & { isFavorite?: boolean }
  ) {
    const message: Message = {
      id: uuid(),
      role: "assistant",
      content: payload.content,
      chips: payload.chips,
      isError: payload.isError,
      isFavorite: payload.isFavorite,
      createdAt: now(),
    };
    
    setState((prev) => {
      const nextConvs = prev.conversations.map((c) => {
        if (c.id !== conversationId) return c;
        return { ...c, messages: [...c.messages, message], updatedAt: now() };
      });
      return { ...prev, conversations: nextConvs };
    });
    
    return message.id;
  },

  updateAssistantMessage(messageId: string, payload: Partial<Message>, persistData = true) {
    setState(
      (prev) => {
        const nextConvs = prev.conversations.map((c) => {
          if (!c.messages.some((m) => m.id === messageId)) return c;
          const nextMessages = c.messages.map((m) =>
            m.id === messageId ? { ...m, ...payload } : m
          );
          return { ...c, messages: nextMessages, updatedAt: Date.now() };
        });
        return { ...prev, conversations: nextConvs };
      },
      { persist: persistData }
    );
  },

  toggleFavorite(conversationId: string, messageId: string) {
    setState((prev) => {
      const nextConvs = prev.conversations.map((c) => {
        if (c.id !== conversationId) return c;
        const nextMessages = c.messages.map((m) => (m.id === messageId ? { ...m, isFavorite: !m.isFavorite } : m));
        return { ...c, messages: nextMessages, updatedAt: now() };
      });
      return { ...prev, conversations: nextConvs };
    });
  },

  upsertAsset(next: Pick<AssetTemplate, "id" | "name" | "content" | "folder">) {
    setState((prev) => {
      const existing = prev.assets.find((a) => a.id === next.id);
      if (!existing) {
        const createdAt = now();
        return {
          ...prev,
          assets: [
            {
              id: next.id,
              name: next.name,
              content: next.content,
              folder: next.folder,
              createdAt,
              updatedAt: createdAt,
            },
            ...prev.assets,
          ],
        };
      }
      return {
        ...prev,
        assets: prev.assets.map((a) =>
          a.id === next.id ? { ...a, name: next.name, content: next.content, folder: next.folder, updatedAt: now() } : a
        ),
      };
    });
  },

  deleteAsset(assetId: string) {
    setState((prev) => ({ ...prev, assets: prev.assets.filter((a) => a.id !== assetId) }));
  },
};