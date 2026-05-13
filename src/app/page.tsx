"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { TimeInput } from "@/components/time-input";
import { Send, ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { formatDate, addDays } from "@/lib/utils";
import { Toast } from "@/components/toast";
import { PageTitle } from "@/components/page-title";

const WEEKDAYS_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function displayDateParts(dateStr: string): { datePart: string; dayPart: string } {
  const d = new Date(dateStr + "T00:00:00");
  const m = d.getMonth() + 1;
  const dd = d.getDate();
  const day = WEEKDAYS_FULL[d.getDay()];
  return { datePart: `${m}. ${dd}`, dayPart: day };
}

interface Task {
  id: string;
  name: string;
  color: string;
}

interface Entry {
  taskId: string;
  hours: number;
  memo: string;
}

export default function HomePage() {
  return (
    <Suspense>
      <HomeContent />
    </Suspense>
  );
}

function HomeContent() {
  const searchParams = useSearchParams();
  const initialDate = searchParams.get("date") || formatDate(new Date());
  const [date, setDate] = useState(initialDate);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [entries, setEntries] = useState<Record<string, Entry>>({});
  const [overview, setOverview] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const loadReport = useCallback(async (targetDate: string) => {
    const res = await fetch(`/api/daily-reports/${targetDate}`);
    const data = await res.json();

    if (data) {
      setOverview(data.overview || "");
      const entryMap: Record<string, Entry> = {};
      for (const e of data.entries || []) {
        entryMap[e.taskId] = {
          taskId: e.taskId,
          hours: e.hours,
          memo: e.memo || "",
        };
      }
      setEntries(entryMap);
    } else {
      setOverview("");
      setEntries({});
    }
  }, []);

  useEffect(() => {
    // Auto-sync Trello if 24h since last sync
    fetch("/api/settings?key=trello")
      .then((r) => r.json())
      .then((config) => {
        if (config?.boardIds?.length > 0) {
          const lastSync = config.lastSyncAt
            ? new Date(config.lastSyncAt).getTime()
            : 0;
          const hoursSinceSync = (Date.now() - lastSync) / (1000 * 60 * 60);
          if (hoursSinceSync >= 24) {
            fetch("/api/trello/sync", { method: "POST" }).then(() =>
              fetch("/api/tasks?sortByRecent=true").then((r) => r.json()).then(setTasks)
            );
            return;
          }
        }
        fetch("/api/tasks?sortByRecent=true").then((r) => r.json()).then(setTasks);
      });
  }, []);

  useEffect(() => {
    loadReport(date);
  }, [date, loadReport]);

  // Cmd+Enter to send
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && !e.isComposing) {
        e.preventDefault();
        save();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  function getEntry(taskId: string): Entry {
    return entries[taskId] || { taskId, hours: 0, memo: "" };
  }

  function updateEntry(taskId: string, updates: Partial<Entry>) {
    setEntries((prev) => ({
      ...prev,
      [taskId]: { ...getEntry(taskId), ...updates },
    }));
    setSaved(false);
  }

  const totalHours = Object.values(entries).reduce(
    (sum, e) => sum + e.hours,
    0
  );

  async function save() {
    setSaving(true);
    const entryList = tasks
      .map((t) => getEntry(t.id))
      .filter((e) => e.hours > 0 || e.memo);

    await fetch("/api/daily-reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date,
        overview,
        entries: entryList,
      }),
    });
    setSaving(false);
    setSaved(true);
    setToast("Report sent");
    setTimeout(() => setSaved(false), 2000);
  }

  function navigateDate(offset: number) {
    const d = new Date(date + "T00:00:00");
    setDate(formatDate(addDays(d, offset)));
  }

  return (
    <div className="max-w-3xl px-4 pt-6 pb-24 md:px-6 md:pt-18 md:pb-6 relative z-10">
      <PageTitle title="Report" />
      {/* Date Selector */}
      <div className="mb-8">
        <div className="font-extralight text-[48px] md:text-[72px]" style={{ lineHeight: 0.9, letterSpacing: "-0.025em" }}>
          {displayDateParts(date).datePart}
        </div>
        <div className="font-extralight text-[var(--color-main-hover)] text-[48px] md:text-[72px]" style={{ lineHeight: 0.9, letterSpacing: "-0.025em" }}>
          {displayDateParts(date).dayPart}
        </div>
        <div className="flex items-center gap-3 mt-3">
          <button
            onClick={() => setDate(formatDate(new Date()))}
            className="text-xs text-[var(--color-accent)] border border-[var(--color-accent)] rounded-full px-3 py-1 hover:bg-[var(--color-accent)] hover:text-white transition-all ease-in duration-100"
          >
            Today
          </button>
          <label className="relative cursor-pointer w-9 h-9 flex items-center justify-center rounded-full hover:bg-[var(--color-accent)] group transition-all ease-in duration-100">
            <Calendar size={16} className="text-[var(--color-main-hover)] group-hover:text-white transition-all ease-in duration-100" />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </label>
          <button
            onClick={() => navigateDate(-1)}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[var(--color-accent)] hover:text-white transition-all ease-in duration-100"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => navigateDate(1)}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[var(--color-accent)] hover:text-white transition-all ease-in duration-100"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Overview */}
      <div className="mt-16 mb-8">
        <label className="block mb-2 text-[var(--color-accent)] heading-expanded text-[20px] md:text-[24px]">
          Overview
        </label>
        <div className="flex items-end gap-3">
          <textarea
            value={overview}
            onChange={(e) => {
              setOverview(e.target.value);
              setSaved(false);
              e.target.style.height = "auto";
              e.target.style.height = e.target.scrollHeight + "px";
            }}
            ref={(el) => {
              if (el) {
                el.style.height = "auto";
                el.style.height = el.scrollHeight + "px";
              }
            }}
            placeholder="How was your day? General notes, misc tasks..."
            rows={1}
            className="flex-1 py-2 focus:outline-none textarea-auto bg-transparent"
          />
          <button
            onClick={save}
            disabled={saving}
            title={saving ? "Sending..." : saved ? "Sent!" : "Send (⌘+Enter)"}
            className="w-9 h-9 shrink-0 flex items-center justify-center rounded-full bg-[var(--color-accent)] text-white hover:bg-[var(--color-bg)] hover:text-[var(--color-accent)] border border-[var(--color-accent)] disabled:opacity-50 transition-all ease-in duration-100 mb-1"
          >
            <Send size={16} />
          </button>
        </div>
      </div>

      {/* Task Time Allocation */}
      <div className="mt-16 mb-6">
        <div className="flex items-center justify-between mb-3">
          <label className="text-[var(--color-accent)] heading-expanded text-[20px] md:text-[24px]">
            Time Allocation
          </label>
          <span className="text-sm font-semibold">
            Total: {totalHours}h
          </span>
        </div>

        {tasks.length === 0 ? (
          <p className="text-[var(--color-main-hover)] text-center py-4">
            No tasks yet.{" "}
            <a href="/tasks" className="text-[var(--color-accent)] hover:text-[var(--color-accent-hover)]">
              Create some tasks
            </a>{" "}
            first.
          </p>
        ) : (
          <div>
            {tasks.map((task) => {
              const entry = getEntry(task.id);
              return (
                <div
                  key={task.id}
                  className="border-t border-[var(--color-main)] pt-3 pb-10 text-[18px] md:text-[21px]"
                >
                  <div className="flex items-center gap-3">
                    {/* Color Dot */}
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: task.color }}
                    />
                    {/* Task Name */}
                    <span className="flex-1 font-normal">
                      {task.name}
                    </span>
                    {/* Time Input */}
                    <TimeInput
                      value={entry.hours}
                      onChange={(hours) => updateEntry(task.id, { hours })}
                    />
                  </div>

                  {entry.hours > 0 && (
                    <textarea
                      value={entry.memo}
                      onChange={(e) => {
                        updateEntry(task.id, { memo: e.target.value });
                        e.target.style.height = "auto";
                        e.target.style.height = e.target.scrollHeight + "px";
                      }}
                      ref={(el) => {
                        if (el) {
                          el.style.height = "auto";
                          el.style.height = el.scrollHeight + "px";
                        }
                      }}
                      placeholder="Notes for this task..."
                      rows={1}
                      className="w-full mt-2 py-1 text-sm focus:outline-none textarea-auto ml-6 bg-transparent"
                      style={{ width: "calc(100% - 1.5rem)" }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Toast message={toast} onDone={() => setToast(null)} />
    </div>
  );
}
