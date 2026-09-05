"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLang } from "@/lib/i18n/context";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Eye,
  EyeOff,
  ExternalLink,
  FileUp,
  FolderOpen,
  Gift,
  Link2,
  Loader2,
  Paperclip,
  Pencil,
  Plus,
  Power,
  Send,
  Trash2,
  Users,
  X,
} from "lucide-react";
import type { FolderAccessType, FolderContentType, PromptFolderRecord } from "@/lib/types";

interface BotSettings {
  token: string;
  username: string;
  welcome: string;
  webhookUrl: string;
  hasSecret: boolean;
}

interface TelegramPayload {
  settings: BotSettings;
  bot: { username?: string; first_name?: string; id?: number; error?: string } | null;
  webhook: { url?: string; pending_update_count?: number; last_error_message?: string; error?: string } | null;
  stats: { subscribers: number; deliveries: number; folders: number; inviters: number };
}

interface FolderDraft {
  _id?: string;
  title: string;
  icon: string;
  description: string;
  content: string;
  content_type: FolderContentType;
  external_url: string;
  access_type: FolderAccessType;
  required_referrals: number;
  order_position: number;
  active: "yes" | "no";
  /** Newly uploaded Totalum file-name id, `null` clears the current file. */
  file?: string | null;
  fileLabel?: string;
}

const EMPTY_DRAFT: FolderDraft = {
  title: "",
  icon: "📁",
  description: "",
  content: "",
  content_type: "prompts",
  external_url: "",
  access_type: "free",
  required_referrals: 0,
  order_position: 99,
  active: "yes",
};

export default function AdminTelegramPage() {
  const { t } = useLang();
  const b = t.admin.bot;

  const [data, setData] = useState<TelegramPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [welcome, setWelcome] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [busy, setBusy] = useState("");

  const [folders, setFolders] = useState<PromptFolderRecord[]>([]);
  const [draft, setDraft] = useState<FolderDraft | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const loadBot = useCallback(async () => {
    const response = await api.get<TelegramPayload>("/api/admin/telegram");
    setLoading(false);
    if (!response.ok || !response.data) {
      console.error("[admin/telegram] failed to load bot state:", response.error);
      toast.error(String(response.error || t.common.error));
      return;
    }
    setData(response.data);
    setToken(response.data.settings.token || "");
    setWelcome(response.data.settings.welcome || "");
    setWebhookUrl(response.data.settings.webhookUrl || "");
  }, [t.common.error]);

  const loadFolders = useCallback(async () => {
    const response = await api.get<PromptFolderRecord[]>("/api/admin/folders");
    if (!response.ok) {
      console.error("[admin/telegram] failed to load folders:", response.error);
      toast.error(String(response.error || t.common.error));
      return;
    }
    setFolders(response.data || []);
  }, [t.common.error]);

  useEffect(() => {
    loadBot();
    loadFolders();
  }, [loadBot, loadFolders]);

  /* ----------------------------- bot settings ---------------------------- */

  const saveToken = async () => {
    setBusy("token");
    const response = await api.put("/api/admin/telegram", { token: token.trim() });
    setBusy("");
    if (!response.ok) {
      console.error("[admin/telegram] save token failed:", response.error);
      toast.error(String(response.error || t.common.error));
      return;
    }
    toast.success(b.tokenSaved);
    loadBot();
  };

  const saveSettings = async () => {
    setBusy("settings");
    const response = await api.put("/api/admin/telegram", { welcome, webhookUrl });
    setBusy("");
    if (!response.ok) {
      console.error("[admin/telegram] save settings failed:", response.error);
      toast.error(String(response.error || t.common.error));
      return;
    }
    toast.success(b.settingsSaved);
    loadBot();
  };

  const toggleWebhook = async (action: "connect" | "disconnect") => {
    setBusy("webhook");
    const response = await api.post("/api/admin/telegram", { action, url: webhookUrl });
    setBusy("");
    if (!response.ok) {
      console.error("[admin/telegram] webhook action failed:", response.error);
      toast.error(String(response.error || t.common.error));
      return;
    }
    toast.success(action === "connect" ? b.connected : b.disconnected);
    loadBot();
  };

  /* ------------------------------- materials ----------------------------- */

  const openEditor = (folder?: PromptFolderRecord) => {
    if (!folder) {
      setDraft({ ...EMPTY_DRAFT, order_position: folders.length + 1 });
      return;
    }
    setDraft({
      _id: folder._id,
      title: folder.title || "",
      icon: folder.icon || "📁",
      description: folder.description || "",
      content: folder.content || "",
      content_type: (folder.content_type || "prompts") as FolderContentType,
      external_url: folder.external_url || "",
      access_type: (folder.access_type || "free") as FolderAccessType,
      required_referrals: Number(folder.required_referrals || 0),
      order_position: Number(folder.order_position || 99),
      active: folder.active === "no" ? "no" : "yes",
      fileLabel: folder.file?.name || "",
    });
  };

  const uploadFile = async (file: File) => {
    setUploading(true);
    const form = new FormData();
    form.append("file", file, file.name);
    try {
      const response = await fetch("/api/admin/folders", { method: "POST", body: form });
      const json = (await response.json()) as { ok: boolean; data?: { fileName: string }; error?: any };
      if (!json.ok || !json.data?.fileName) {
        console.error("[admin/telegram] upload failed:", json.error);
        toast.error(String(json.error || t.common.error));
        return;
      }
      setDraft((current) =>
        current ? { ...current, file: json.data!.fileName, fileLabel: file.name } : current
      );
      toast.success(b.fileAttached);
    } catch (err) {
      console.error("[admin/telegram] upload error:", err);
      toast.error(String(t.common.error));
    } finally {
      setUploading(false);
    }
  };

  const saveFolder = async () => {
    if (!draft?.title.trim()) return;
    setBusy("folder");
    const payload: Record<string, any> = { ...draft };
    delete payload.fileLabel;
    if (typeof payload.file === "undefined") delete payload.file;

    const response = draft._id
      ? await api.put(`/api/admin/folders/${draft._id}`, payload)
      : await api.post("/api/admin/folders", payload);
    setBusy("");
    if (!response.ok) {
      console.error("[admin/telegram] save folder failed:", response.error);
      toast.error(String(response.error || t.common.error));
      return;
    }
    toast.success(b.saved);
    setDraft(null);
    loadFolders();
    loadBot();
  };

  const removeFolder = async (folder: PromptFolderRecord) => {
    if (!window.confirm(b.confirmDelete)) return;
    const response = await api.delete(`/api/admin/folders/${folder._id}`);
    if (!response.ok) {
      console.error("[admin/telegram] delete folder failed:", response.error);
      toast.error(String(response.error || t.common.error));
      return;
    }
    toast.success(b.removed);
    setFolders((current) => current.filter((item) => item._id !== folder._id));
    loadBot();
  };

  const toggleFolderActive = async (folder: PromptFolderRecord) => {
    const next = folder.active === "no" ? "yes" : "no";
    const response = await api.put(`/api/admin/folders/${folder._id}`, { ...folder, file: undefined, active: next });
    if (!response.ok) {
      console.error("[admin/telegram] toggle folder failed:", response.error);
      toast.error(String(response.error || t.common.error));
      return;
    }
    setFolders((current) =>
      current.map((item) => (item._id === folder._id ? { ...item, active: next } : item))
    );
  };

  if (loading) {
    return (
      <div className="glass flex items-center justify-center rounded-2xl py-20">
        <Loader2 className="h-6 w-6 animate-spin text-foreground/40" />
      </div>
    );
  }

  const botUsername = data?.bot?.username || data?.settings.username || "";
  const botOnline = Boolean(data?.bot && !data.bot.error);
  const webhookConnected = Boolean(data?.webhook?.url);

  return (
    <div className="space-y-5">
      {/* ------------------------------ header ------------------------------ */}
      <header className="glass-strong relative overflow-hidden rounded-3xl p-5 sm:p-6">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[#229ED9]/25 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#229ED9] to-[#4c6fff]">
                <Send className="h-5 w-5 text-white" />
              </span>
              <div>
                <h2 className="font-display text-lg font-extrabold text-white sm:text-xl">{b.title}</h2>
                {botUsername ? (
                  <a
                    href={`https://t.me/${botUsername}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-sm font-semibold text-[color:var(--neon-cyan)] hover:underline"
                  >
                    @{botUsername}
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                ) : (
                  <p className="text-sm text-foreground/45">{b.notConfigured}</p>
                )}
              </div>
            </div>
            <p className="mt-3 max-w-2xl text-sm text-foreground/55">{b.subtitle}</p>
          </div>

          <span
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold ${
              webhookConnected
                ? "bg-emerald-400/12 text-emerald-300"
                : "bg-amber-400/12 text-amber-300"
            }`}
          >
            {webhookConnected ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
            {webhookConnected ? b.statusConnected : b.statusDisconnected}
          </span>
        </div>

        <div className="relative mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard icon={Users} label={b.statSubscribers} value={data?.stats.subscribers || 0} tone="from-[#229ED9] to-[#4c6fff]" />
          <StatCard icon={Gift} label={b.statDeliveries} value={data?.stats.deliveries || 0} tone="from-[#22c55e] to-[#14b8a6]" />
          <StatCard icon={FolderOpen} label={b.statFolders} value={data?.stats.folders || 0} tone="from-[#a855f7] to-[#ec4899]" />
          <StatCard icon={Link2} label={b.statInviters} value={data?.stats.inviters || 0} tone="from-[#f59e0b] to-[#ef4444]" />
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* ----------------------------- token ----------------------------- */}
        <section className="glass rounded-2xl p-5">
          <h3 className="font-display flex items-center gap-2 text-base font-bold text-white">
            <Bot className="h-4.5 w-4.5 text-[color:var(--neon-cyan)]" />
            {b.tokenTitle}
          </h3>

          <label className="mt-4 mb-1.5 block text-xs font-semibold uppercase tracking-wide text-foreground/45">
            {b.token}
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type={showToken ? "text" : "password"}
                value={token}
                onChange={(event) => setToken(event.target.value)}
                placeholder={b.tokenPlaceholder}
                autoComplete="off"
                className="w-full rounded-xl bg-white/5 px-3.5 py-2.5 pr-10 font-mono text-xs text-white placeholder:text-foreground/25 focus:outline-none focus:ring-1 focus:ring-[color:var(--neon-blue)]/50"
              />
              <button
                type="button"
                onClick={() => setShowToken((value) => !value)}
                title={showToken ? b.hide : b.show}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/35 hover:text-white"
              >
                {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <Button
              type="button"
              onClick={saveToken}
              disabled={busy === "token"}
              className="shrink-0 rounded-xl bg-gradient-to-r from-[#229ED9] to-[#4c6fff] text-white"
            >
              {busy === "token" ? <Loader2 className="h-4 w-4 animate-spin" /> : b.saveToken}
            </Button>
          </div>
          <p className="mt-2 text-xs text-foreground/40">{b.tokenHint}</p>

          {data?.bot?.error && (
            <p className="mt-3 rounded-xl bg-rose-400/10 px-3.5 py-2.5 text-xs text-rose-300">{data.bot.error}</p>
          )}
          {botOnline && (
            <p className="mt-3 flex items-center gap-1.5 rounded-xl bg-emerald-400/10 px-3.5 py-2.5 text-xs text-emerald-300">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {data?.bot?.first_name} · @{botUsername}
            </p>
          )}

          <label className="mt-5 mb-1.5 block text-xs font-semibold uppercase tracking-wide text-foreground/45">
            {b.welcome}
          </label>
          <textarea
            value={welcome}
            onChange={(event) => setWelcome(event.target.value)}
            rows={5}
            className="w-full resize-y rounded-xl bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder:text-foreground/25 focus:outline-none focus:ring-1 focus:ring-[color:var(--neon-blue)]/50"
          />
          <p className="mt-2 text-xs text-foreground/40">{b.welcomeHint}</p>
        </section>

        {/* ---------------------------- webhook ---------------------------- */}
        <section className="glass rounded-2xl p-5">
          <h3 className="font-display flex items-center gap-2 text-base font-bold text-white">
            <Link2 className="h-4.5 w-4.5 text-[color:var(--neon-violet)]" />
            {b.webhookTitle}
          </h3>

          <label className="mt-4 mb-1.5 block text-xs font-semibold uppercase tracking-wide text-foreground/45">
            {b.webhookUrl}
          </label>
          <input
            value={webhookUrl}
            onChange={(event) => setWebhookUrl(event.target.value)}
            placeholder="https://…/api/telegram/webhook"
            className="w-full rounded-xl bg-white/5 px-3.5 py-2.5 font-mono text-xs text-white placeholder:text-foreground/25 focus:outline-none focus:ring-1 focus:ring-[color:var(--neon-blue)]/50"
          />
          <p className="mt-2 text-xs text-foreground/40">{b.webhookHint}</p>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={() => toggleWebhook("connect")}
              disabled={busy === "webhook" || !botOnline}
              className="rounded-xl bg-gradient-to-r from-[#4c6fff] to-[#a855f7] text-white"
            >
              {busy === "webhook" ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Link2 className="mr-1.5 h-4 w-4" />}
              {b.connect}
            </Button>
            {webhookConnected && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => toggleWebhook("disconnect")}
                disabled={busy === "webhook"}
                className="rounded-xl bg-white/6 text-foreground/70 hover:text-white"
              >
                {b.disconnect}
              </Button>
            )}
            <Button
              type="button"
              onClick={saveSettings}
              disabled={busy === "settings"}
              className="rounded-xl bg-white/8 text-white hover:bg-white/14"
            >
              {busy === "settings" ? <Loader2 className="h-4 w-4 animate-spin" /> : b.saveSettings}
            </Button>
          </div>

          {data?.webhook?.url && (
            <div className="mt-4 space-y-1.5 rounded-xl bg-white/5 p-3.5 text-xs">
              <p className="break-all font-mono text-foreground/55">{data.webhook.url}</p>
              <p className="text-foreground/45">
                {b.pendingUpdates}: <span className="font-bold text-white">{data.webhook.pending_update_count ?? 0}</span>
              </p>
              {data.webhook.last_error_message && (
                <p className="text-rose-300">
                  {b.lastError}: {data.webhook.last_error_message}
                </p>
              )}
            </div>
          )}
          {!botOnline && <p className="mt-4 text-xs text-amber-300/80">{b.notConfiguredSub}</p>}
        </section>
      </div>

      {/* ----------------------------- materials ----------------------------- */}
      <section className="glass rounded-2xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display flex items-center gap-2 text-base font-bold text-white">
              <FolderOpen className="h-4.5 w-4.5 text-[color:var(--neon-blue)]" />
              {b.contentTitle}
            </h3>
            <p className="mt-1 text-sm text-foreground/50">{b.contentSub}</p>
          </div>
          <Button
            type="button"
            onClick={() => openEditor()}
            className="rounded-xl bg-gradient-to-r from-[#4c6fff] to-[#a855f7] text-white"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            {b.newFolder}
          </Button>
        </div>

        {folders.length === 0 ? (
          <div className="mt-5 rounded-2xl bg-white/4 py-12 text-center">
            <p className="font-display text-base font-bold text-white">{b.emptyContent}</p>
            <p className="mt-1 text-sm text-foreground/45">{b.emptyContentSub}</p>
          </div>
        ) : (
          <ul className="mt-4 space-y-2">
            {folders.map((folder) => {
              const referral = folder.access_type === "referral";
              const required = Math.max(Number(folder.required_referrals || 0), referral ? 1 : 0);
              return (
                <li
                  key={folder._id}
                  className={`flex flex-wrap items-center gap-3 rounded-2xl bg-white/5 p-3 ${
                    folder.active === "no" ? "opacity-55" : ""
                  }`}
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/8 text-lg">
                    {folder.icon || "📁"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">{folder.title}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <span className="rounded-lg bg-white/6 px-2 py-0.5 text-[10px] font-semibold text-foreground/55">
                        {b.types[(folder.content_type || "prompts") as FolderContentType]}
                      </span>
                      <span
                        className={`rounded-lg px-2 py-0.5 text-[10px] font-bold ${
                          referral ? "bg-amber-400/15 text-amber-300" : "bg-emerald-400/15 text-emerald-300"
                        }`}
                      >
                        {referral ? `🔒 ${required} 👥` : b.accessFree}
                      </span>
                      {folder.file?.name && (
                        <span className="flex items-center gap-1 rounded-lg bg-white/6 px-2 py-0.5 text-[10px] text-foreground/50">
                          <Paperclip className="h-2.5 w-2.5" />
                          PDF
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleFolderActive(folder)}
                      title={b.active}
                      className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${
                        folder.active === "no"
                          ? "bg-white/6 text-foreground/45 hover:bg-white/12"
                          : "bg-emerald-400/12 text-emerald-300 hover:bg-emerald-400/20"
                      }`}
                    >
                      <Power className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditor(folder)}
                      className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/6 text-foreground/60 transition-colors hover:text-white"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeFolder(folder)}
                      className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-400/10 text-rose-300 transition-colors hover:bg-rose-400/20"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* ------------------------------ editor ------------------------------ */}
      {draft && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm">
          <div className="glass-strong my-8 w-full max-w-2xl rounded-3xl p-5 sm:p-6">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="font-display text-lg font-bold text-white">
                {draft._id ? b.editFolder : b.newFolder}
              </h3>
              <button
                type="button"
                onClick={() => setDraft(null)}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/6 text-foreground/55 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={b.folderIcon}>
                <input
                  value={draft.icon}
                  onChange={(event) => setDraft({ ...draft, icon: event.target.value })}
                  maxLength={4}
                  className="w-full rounded-xl bg-white/5 px-3.5 py-2.5 text-center text-lg text-white focus:outline-none focus:ring-1 focus:ring-[color:var(--neon-blue)]/50"
                />
              </Field>
              <Field label={b.folderType}>
                <select
                  value={draft.content_type}
                  onChange={(event) =>
                    setDraft({ ...draft, content_type: event.target.value as FolderContentType })
                  }
                  className="w-full rounded-xl bg-white/5 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[color:var(--neon-blue)]/50"
                >
                  <option value="prompts" className="bg-[#161626]">{b.types.prompts}</option>
                  <option value="guide" className="bg-[#161626]">{b.types.guide}</option>
                  <option value="instruction" className="bg-[#161626]">{b.types.instruction}</option>
                </select>
              </Field>

              <Field label={b.folderTitle} full>
                <input
                  value={draft.title}
                  onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                  className="w-full rounded-xl bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder:text-foreground/25 focus:outline-none focus:ring-1 focus:ring-[color:var(--neon-blue)]/50"
                />
              </Field>

              <Field label={b.folderDescription} full>
                <textarea
                  value={draft.description}
                  onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                  rows={2}
                  className="w-full resize-y rounded-xl bg-white/5 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[color:var(--neon-blue)]/50"
                />
              </Field>

              <Field label={b.folderContent} hint={b.folderContentHint} full>
                <textarea
                  value={draft.content}
                  onChange={(event) => setDraft({ ...draft, content: event.target.value })}
                  rows={5}
                  className="w-full resize-y rounded-xl bg-white/5 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[color:var(--neon-blue)]/50"
                />
              </Field>

              <Field label={b.folderUrl} full>
                <input
                  value={draft.external_url}
                  onChange={(event) => setDraft({ ...draft, external_url: event.target.value })}
                  placeholder="https://drive.google.com/…"
                  className="w-full rounded-xl bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder:text-foreground/25 focus:outline-none focus:ring-1 focus:ring-[color:var(--neon-blue)]/50"
                />
              </Field>

              <Field label={b.folderFile} full>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    ref={fileInput}
                    type="file"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) uploadFile(file);
                      event.target.value = "";
                    }}
                  />
                  <Button
                    type="button"
                    onClick={() => fileInput.current?.click()}
                    disabled={uploading}
                    className="rounded-xl bg-white/8 text-white hover:bg-white/14"
                  >
                    {uploading ? (
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    ) : (
                      <FileUp className="mr-1.5 h-4 w-4" />
                    )}
                    {uploading ? b.uploading : b.uploadFile}
                  </Button>
                  {draft.fileLabel && (
                    <span className="flex items-center gap-1.5 rounded-xl bg-emerald-400/10 px-3 py-2 text-xs text-emerald-300">
                      <Paperclip className="h-3.5 w-3.5" />
                      <span className="max-w-[180px] truncate">{draft.fileLabel}</span>
                      <button
                        type="button"
                        onClick={() => setDraft({ ...draft, file: null, fileLabel: "" })}
                        title={b.removeFile}
                        className="text-emerald-300/70 hover:text-white"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  )}
                </div>
              </Field>

              <Field label={b.access}>
                <select
                  value={draft.access_type}
                  onChange={(event) => {
                    const access = event.target.value as FolderAccessType;
                    setDraft({
                      ...draft,
                      access_type: access,
                      required_referrals:
                        access === "referral" ? Math.max(draft.required_referrals, 1) : 0,
                    });
                  }}
                  className="w-full rounded-xl bg-white/5 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[color:var(--neon-blue)]/50"
                >
                  <option value="free" className="bg-[#161626]">{b.accessFree}</option>
                  <option value="referral" className="bg-[#161626]">{b.accessReferral}</option>
                </select>
              </Field>

              <Field label={b.requiredReferrals}>
                <input
                  type="number"
                  min={draft.access_type === "referral" ? 1 : 0}
                  value={draft.required_referrals === 0 && draft.access_type === "free" ? "" : draft.required_referrals}
                  disabled={draft.access_type === "free"}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      required_referrals: event.target.value === "" ? 0 : Number(event.target.value),
                    })
                  }
                  placeholder="0"
                  className="w-full rounded-xl bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder:text-foreground/25 focus:outline-none focus:ring-1 focus:ring-[color:var(--neon-blue)]/50 disabled:opacity-40"
                />
              </Field>

              <Field label={b.order}>
                <input
                  type="number"
                  value={draft.order_position}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      order_position: event.target.value === "" ? 0 : Number(event.target.value),
                    })
                  }
                  className="w-full rounded-xl bg-white/5 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[color:var(--neon-blue)]/50"
                />
              </Field>

              <Field label={b.active}>
                <button
                  type="button"
                  onClick={() => setDraft({ ...draft, active: draft.active === "yes" ? "no" : "yes" })}
                  className={`relative h-7 w-12 rounded-full transition-colors ${
                    draft.active === "yes" ? "bg-emerald-500" : "bg-white/12"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-6 w-6 rounded-full bg-white transition-transform ${
                      draft.active === "yes" ? "translate-x-5.5" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </Field>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setDraft(null)}
                className="rounded-xl bg-white/6 text-foreground/70 hover:text-white"
              >
                {b.cancel}
              </Button>
              <Button
                type="button"
                onClick={saveFolder}
                disabled={busy === "folder" || !draft.title.trim()}
                className="rounded-xl bg-gradient-to-r from-[#4c6fff] to-[#a855f7] text-white"
              >
                {busy === "folder" ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
                {b.save}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  hint,
  full,
  children,
}: {
  label: string;
  hint?: string;
  full?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-foreground/45">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-xs text-foreground/35">{hint}</p>}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div className="glass rounded-2xl p-3.5">
      <span className={`mb-2 flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br ${tone}`}>
        <Icon className="h-4 w-4 text-white" />
      </span>
      <p className="font-display text-xl font-extrabold text-white">{value}</p>
      <p className="mt-0.5 text-[11px] text-foreground/45">{label}</p>
    </div>
  );
}
