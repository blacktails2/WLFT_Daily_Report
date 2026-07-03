"use client";

import { useState, useEffect, useLayoutEffect, useRef, useCallback } from "react";
import { Pencil, X } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { displayDate } from "@/lib/utils";
import { PageTitle } from "@/components/page-title";

interface Entry {
  taskId: string;
  taskName: string;
  taskColor: string;
  hours: number;
  memo: string | null;
}

interface Report {
  date: string;
  overview: string;
  entries: Entry[];
}

function HourDots({ entries }: { entries: Entry[] }) {
  const dots: string[] = [];
  for (const e of entries) {
    for (let i = 0; i < Math.round(e.hours); i++) {
      dots.push(e.taskColor);
    }
  }
  if (dots.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-[3px] mb-8">
      {dots.map((color, i) => (
        <div
          key={i}
          className="w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: color }}
        />
      ))}
    </div>
  );
}

function ReportCard({
  report,
  onEdit,
  targetDate,
}: {
  report: Report;
  onEdit: (date: string) => void;
  targetDate: string;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const dateLabel = displayDate(report.date);
  const totalHours = report.entries?.reduce((sum, e) => sum + e.hours, 0) || 0;
  const isTarget = report.date === targetDate;

  useEffect(() => {
    if (isTarget && cardRef.current) {
      cardRef.current.scrollIntoView({ block: "start" });
    }
  }, [isTarget]);

  return (
    <div
      ref={cardRef}
      className={`border-b border-[var(--color-main)] pb-16 mb-6 last:border-b-0 ${
        isTarget ? "scroll-mt-28" : ""
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="font-normal" style={{ fontSize: "24px", lineHeight: 1.1 }}>{dateLabel}</h2>
          {totalHours > 0 && (
            <div className="font-semibold" style={{ fontSize: "24px", lineHeight: 1.1 }}>{totalHours}h</div>
          )}
        </div>
        <button
          onClick={() => onEdit(report.date)}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[var(--color-accent)] hover:text-white transition-all ease-in duration-100"
        >
          <Pencil size={14} />
        </button>
      </div>

      {/* Hour Dots */}
      {totalHours > 0 && <HourDots entries={report.entries} />}

      {/* Overview */}
      <div className="mb-8">
        <p className="whitespace-pre-wrap text-sm">
          {report.overview || "—"}
        </p>
      </div>

      {/* Task Entries */}
      {report.entries.length > 0 && (
        <div className="space-y-5">
          {report.entries.map((entry) => (
            <div key={entry.taskId}>
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: entry.taskColor }}
                />
                <span className="text-base font-medium">
                  {entry.taskName}{entry.hours > 0 ? ` (${entry.hours}h)` : ""}
                </span>
              </div>
              {entry.memo && (
                <p className="text-sm mt-1 ml-4 whitespace-pre-wrap text-[var(--color-main-hover)]">
                  {entry.memo}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CalendarDetailPage() {
  const params = useParams();
  const router = useRouter();
  const targetDate = params.date as string;

  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasOlder, setHasOlder] = useState(true);
  const [hasNewer, setHasNewer] = useState(true);
  const loadingOlderRef = useRef(false);
  const loadingNewerRef = useRef(false);
  const reportsRef = useRef<Report[]>([]);
  reportsRef.current = reports;
  // scrollHeight captured just before prepending, so the viewport can be
  // shifted by the added height after commit
  const scrollAdjustRef = useRef<number | null>(null);

  const topRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setReports([]);
    setHasOlder(true);
    setHasNewer(true);
    fetch(`/api/daily-reports?around=${targetDate}&limit=10`)
      .then((r) => r.json())
      .then((data: Report[]) => {
        if (cancelled) return;
        setReports(data);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [targetDate]);

  const loadOlder = useCallback(async () => {
    if (loadingOlderRef.current || !hasOlder) return;
    const oldestDate = reportsRef.current[0]?.date;
    if (!oldestDate) return;
    loadingOlderRef.current = true;

    try {
      const res = await fetch(`/api/daily-reports?before=${oldestDate}&limit=5`);
      const data: Report[] = await res.json();
      if (data.length < 5) setHasOlder(false);
      if (data.length > 0) {
        scrollAdjustRef.current = document.documentElement.scrollHeight;
        setReports((prev) => {
          const existing = new Set(prev.map((r) => r.date));
          return [...data.filter((r) => !existing.has(r.date)), ...prev];
        });
      }
    } finally {
      loadingOlderRef.current = false;
    }
  }, [hasOlder]);

  const loadNewer = useCallback(async () => {
    if (loadingNewerRef.current || !hasNewer) return;
    const newestDate = reportsRef.current[reportsRef.current.length - 1]?.date;
    if (!newestDate) return;
    loadingNewerRef.current = true;

    try {
      const res = await fetch(`/api/daily-reports?after=${newestDate}&limit=5`);
      const data: Report[] = await res.json();
      if (data.length < 5) setHasNewer(false);
      if (data.length > 0) {
        setReports((prev) => {
          const existing = new Set(prev.map((r) => r.date));
          return [...prev, ...data.filter((r) => !existing.has(r.date))];
        });
      }
    } finally {
      loadingNewerRef.current = false;
    }
  }, [hasNewer]);

  useLayoutEffect(() => {
    if (scrollAdjustRef.current !== null) {
      const diff = document.documentElement.scrollHeight - scrollAdjustRef.current;
      scrollAdjustRef.current = null;
      if (diff > 0) window.scrollBy(0, diff);
    }
  }, [reports]);

  useEffect(() => {
    if (loading) return;
    const topEl = topRef.current;
    const bottomEl = bottomRef.current;
    if (!topEl || !bottomEl) return;

    const topObserver = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting && !loadingOlderRef.current) loadOlder(); },
      { threshold: 0.1 }
    );
    const bottomObserver = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting && !loadingNewerRef.current) loadNewer(); },
      { threshold: 0.1 }
    );

    topObserver.observe(topEl);
    bottomObserver.observe(bottomEl);

    return () => {
      topObserver.disconnect();
      bottomObserver.disconnect();
    };
    // reports is a dep so observers re-attach after each load; observe() fires
    // immediately when a sentinel is still in view, continuing the load chain
  }, [loading, reports, loadOlder, loadNewer]);

  return (
    <div
      className="max-w-3xl px-4 pt-6 pb-24 md:px-6 md:pt-18 md:pb-6 relative z-10"
      style={{ overflowAnchor: "none" }}
    >
      <PageTitle title="Detail" />
      <div className="sticky top-0 bg-[var(--color-bg)] z-20 flex items-center justify-end py-4 -mx-6 px-6 mb-6">
        <button
          onClick={() => router.push(`/calendar?month=${targetDate.slice(0, 7)}`)}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[var(--color-accent)] hover:text-white transition-all ease-in duration-100"
        >
          <X size={18} />
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-[var(--color-main-hover)]">Loading...</div>
      ) : reports.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-[var(--color-main-hover)] mb-4">No reports found.</p>
          <button
            onClick={() => router.push(`/?date=${targetDate}`)}
            className="text-[var(--color-accent)] hover:text-[var(--color-accent-hover)]"
          >
            Create one for this day
          </button>
        </div>
      ) : (
        <>
          <div ref={topRef} className="h-4">
            {!hasOlder && (
              <p className="text-center text-xs text-[var(--color-main-hover)] opacity-50">No older reports</p>
            )}
          </div>

          {reports.map((report) => (
            <ReportCard
              key={report.date}
              report={report}
              targetDate={targetDate}
              onEdit={(date) => router.push(`/?date=${date}`)}
            />
          ))}

          <div ref={bottomRef} className="h-4">
            {!hasNewer && (
              <p className="text-center text-xs text-[var(--color-main-hover)] opacity-50">No newer reports</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
