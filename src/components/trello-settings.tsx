"use client";

import { useState, useEffect } from "react";
import { RefreshCw, Check, ExternalLink } from "lucide-react";

interface TrelloConfig {
  apiKey: string;
  token: string;
  boardIds: string[];
  lastSyncAt?: string;
}

interface Board {
  id: string;
  name: string;
}

export function TrelloSettings({ onSync }: { onSync: () => void }) {
  const [config, setConfig] = useState<TrelloConfig | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [token, setToken] = useState("");
  const [boards, setBoards] = useState<Board[]>([]);
  const [selectedBoards, setSelectedBoards] = useState<string[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState<"credentials" | "boards" | "done">(
    "credentials"
  );

  useEffect(() => {
    loadConfig();
  }, []);

  async function loadConfig() {
    const res = await fetch("/api/settings?key=trello");
    const data = await res.json();
    if (data) {
      setConfig(data);
      setApiKey(data.apiKey || "");
      setToken(data.token || "");
      setSelectedBoards(data.boardIds || []);
      if (data.apiKey && data.token) {
        setStep(data.boardIds?.length > 0 ? "done" : "boards");
      }
    }
  }

  async function saveCredentials() {
    setSaving(true);
    const newConfig = {
      apiKey,
      token,
      boardIds: selectedBoards,
      lastSyncAt: config?.lastSyncAt,
    };

    await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "trello", value: newConfig }),
    });

    setConfig(newConfig);
    setSaving(false);

    // Fetch boards
    const res = await fetch("/api/trello/boards");
    if (res.ok) {
      const data = await res.json();
      setBoards(data);
      setStep("boards");
    }
  }

  async function saveBoards() {
    setSaving(true);
    const newConfig = {
      apiKey,
      token,
      boardIds: selectedBoards,
      lastSyncAt: config?.lastSyncAt,
    };

    await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "trello", value: newConfig }),
    });

    setConfig(newConfig);
    setSaving(false);
    setStep("done");
  }

  async function sync() {
    setSyncing(true);
    setSyncResult(null);
    const res = await fetch("/api/trello/sync", { method: "POST" });
    const data = await res.json();
    setSyncing(false);
    setSyncResult(
      `Added: ${data.added}, Updated: ${data.updated}, Archived: ${data.archived}`
    );
    onSync();
  }

  function toggleBoard(id: string) {
    setSelectedBoards((prev) =>
      prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]
    );
  }

  const lastSync = config?.lastSyncAt
    ? new Date(config.lastSyncAt).toLocaleString()
    : "Never";

  return (
    <div>
      <h2 className="text-[var(--color-accent)] mb-4 heading-expanded text-[20px] md:text-[24px]">
        Trello Integration
      </h2>

      {step === "credentials" && (
        <div className="space-y-3">
          <div className="text-xs text-[var(--color-main-hover)] space-y-1">
            <p>To connect Trello:</p>
            <ol className="list-decimal ml-4 space-y-1">
              <li>
                Go to{" "}
                <a
                  href="https://trello.com/power-ups/admin"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] inline-flex items-center gap-0.5"
                >
                  Trello Power-Ups Admin
                  <ExternalLink size={10} />
                </a>
              </li>
              <li>Create a new Power-Up (or use an existing one)</li>
              <li>Copy your API Key</li>
              <li>
                Click &quot;Generate a Token&quot; on the API key page and authorize
              </li>
            </ol>
          </div>
          <input
            type="text"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="API Key"
            className="w-full px-3 py-1.5 text-sm border border-[var(--color-main)] focus:outline-none focus:border-[var(--color-accent)]"
          />
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Token"
            className="w-full px-3 py-1.5 text-sm border border-[var(--color-main)] focus:outline-none focus:border-[var(--color-accent)]"
          />
          <button
            onClick={saveCredentials}
            disabled={!apiKey || !token || saving}
            className="text-sm px-3 py-1.5 bg-[var(--color-accent)] text-white border border-[var(--color-accent)] hover:bg-[var(--color-bg)] hover:text-[var(--color-accent)] disabled:opacity-50 transition-all ease-in duration-100"
          >
            {saving ? "Connecting..." : "Connect"}
          </button>
        </div>
      )}

      {step === "boards" && (
        <div className="space-y-3">
          <p className="text-xs text-[var(--color-main-hover)]">
            Select boards to sync tasks from:
          </p>
          <div className="space-y-1">
            {boards.map((board) => (
              <label
                key={board.id}
                className="flex items-center gap-2 text-sm text-[var(--color-main)] cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedBoards.includes(board.id)}
                  onChange={() => toggleBoard(board.id)}
                  className="rounded"
                />
                {board.name}
              </label>
            ))}
          </div>
          <button
            onClick={saveBoards}
            disabled={selectedBoards.length === 0 || saving}
            className="text-sm px-3 py-1.5 bg-[var(--color-accent)] text-white border border-[var(--color-accent)] hover:bg-[var(--color-bg)] hover:text-[var(--color-accent)] disabled:opacity-50 transition-all ease-in duration-100"
          >
            {saving ? "Saving..." : "Save & Continue"}
          </button>
        </div>
      )}

      {step === "done" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--color-main-hover)]">
              Last sync: {lastSync}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setStep("credentials")}
                className="text-xs text-[var(--color-main-hover)] hover:text-[var(--color-accent)]"
              >
                Settings
              </button>
              <button
                onClick={sync}
                disabled={syncing}
                className="flex items-center gap-1 text-sm px-4 py-1.5 bg-[var(--color-accent)] text-white rounded-full border border-[var(--color-accent)] hover:bg-[var(--color-bg)] hover:text-[var(--color-accent)] disabled:opacity-50 transition-all ease-in duration-100"
              >
                <RefreshCw
                  size={14}
                  className={syncing ? "animate-spin" : ""}
                />
                {syncing ? "Syncing..." : "Sync Now"}
              </button>
            </div>
          </div>
          {syncResult && (
            <p className="text-xs text-green-600 flex items-center gap-1">
              <Check size={12} />
              {syncResult}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
