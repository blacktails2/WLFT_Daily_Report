"use client";

import { useState, useEffect, useMemo, useRef, useCallback, Fragment } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { PageTitle } from "@/components/page-title";

// --- Types ---

interface ReportEntry {
  taskId: string;
  taskName: string;
  taskColor: string;
  hours: number;
  memo: string | null;
}

interface ReportSummary {
  date: string;
  overview: string | null;
  entries: ReportEntry[];
}

interface CalendarDay {
  day: number;
  month: number;
  year: number;
}

interface MonthKey {
  year: number;
  month: number;
}

interface WeekRow {
  days: CalendarDay[];
  firstOfMonth: MonthKey | null;
  weekKey: string;
}

// --- Constants ---

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const INITIAL_RANGE = 3; // months before and after today

// --- Helpers ---

function mkStr(mk: MonthKey): string {
  return `${mk.year}-${String(mk.month + 1).padStart(2, "0")}`;
}

function mkEqual(a: MonthKey, b: MonthKey): boolean {
  return a.year === b.year && a.month === b.month;
}

function mkOffset(mk: MonthKey, offset: number): MonthKey {
  let m = mk.month + offset;
  let y = mk.year;
  while (m < 0) { m += 12; y--; }
  while (m > 11) { m -= 12; y++; }
  return { year: y, month: m };
}

function fmtDate(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function getMonthDays(year: number, month: number): CalendarDay[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  let startOffset = firstDay.getDay() - 1;
  if (startOffset < 0) startOffset = 6;

  const days: CalendarDay[] = [];

  // Previous month overflow
  if (startOffset > 0) {
    const prevLast = new Date(year, month, 0);
    for (let i = startOffset - 1; i >= 0; i--) {
      days.push({ day: prevLast.getDate() - i, month: prevLast.getMonth(), year: prevLast.getFullYear() });
    }
  }

  // Current month
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push({ day: d, month, year });
  }

  // Next month overflow
  const remainder = days.length % 7;
  if (remainder > 0) {
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;
    for (let d = 1; d <= 7 - remainder; d++) {
      days.push({ day: d, month: nextMonth, year: nextYear });
    }
  }

  return days;
}

function buildWeeks(months: MonthKey[]): WeekRow[] {
  const seen = new Map<string, WeekRow>();

  for (const mk of months) {
    const days = getMonthDays(mk.year, mk.month);
    for (let i = 0; i < days.length; i += 7) {
      const weekDays = days.slice(i, i + 7);
      if (weekDays.length < 7) continue;

      const mon = weekDays[0];
      const key = fmtDate(mon.year, mon.month, mon.day);

      if (!seen.has(key)) {
        let firstOfMonth: MonthKey | null = null;
        for (const d of weekDays) {
          if (d.day === 1) {
            firstOfMonth = { year: d.year, month: d.month };
            break;
          }
        }
        seen.set(key, { days: weekDays, firstOfMonth, weekKey: key });
      }
    }
  }

  return [...seen.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, row]) => row);
}

function initMonths(center: MonthKey): MonthKey[] {
  const result: MonthKey[] = [];
  for (let i = -INITIAL_RANGE; i <= INITIAL_RANGE; i++) {
    result.push(mkOffset(center, i));
  }
  return result;
}

// --- Components ---

function HourDots({ entries }: { entries: ReportEntry[] }) {
  const dots: string[] = [];
  for (const e of entries) {
    for (let i = 0; i < Math.round(e.hours); i++) {
      dots.push(e.taskColor);
    }
  }
  if (dots.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-[2px]">
      {dots.map((color, i) => (
        <div
          key={i}
          className="w-1 h-1 md:w-[6px] md:h-[6px] rounded-full shrink-0"
          style={{ backgroundColor: color }}
        />
      ))}
    </div>
  );
}

// --- Main Component ---

export default function CalendarPage() {
  const [mounted, setMounted] = useState(false);

  const today = useMemo(() => {
    const t = new Date();
    return { year: t.getFullYear(), month: t.getMonth(), day: t.getDate() };
  }, []);
  const todayStr = fmtDate(today.year, today.month, today.day);
  const todayMonth: MonthKey = { year: today.year, month: today.month };

  const [months, setMonths] = useState<MonthKey[]>(() => initMonths(todayMonth));
  const [activeMonth, setActiveMonth] = useState<MonthKey>(todayMonth);
  const [reports, setReports] = useState<Record<string, ReportSummary>>({});
  const router = useRouter();

  const dataCache = useRef<Map<string, Record<string, ReportSummary>>>(new Map());
  const markerRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const bottomSentinelRef = useRef<HTMLDivElement>(null);
  const initialScrollDone = useRef(false);
  const suppressDetection = useRef(false);

  const weeks = useMemo(() => buildWeeks(months), [months]);

  // --- Data Fetching ---

  const fetchMonth = useCallback(async (mk: MonthKey): Promise<Record<string, ReportSummary>> => {
    const key = mkStr(mk);
    if (dataCache.current.has(key)) return dataCache.current.get(key)!;

    const days = getMonthDays(mk.year, mk.month);
    const first = days[0];
    const last = days[days.length - 1];
    const from = fmtDate(first.year, first.month, first.day);
    const to = fmtDate(last.year, last.month, last.day);

    const res = await fetch(`/api/daily-reports?from=${from}&to=${to}`);
    const data: ReportSummary[] = await res.json();
    const map: Record<string, ReportSummary> = {};
    for (const r of data) map[r.date] = r;

    dataCache.current.set(key, map);
    return map;
  }, []);

  // Fetch all months that aren't cached yet
  useEffect(() => {
    const uncached = months.filter((mk) => !dataCache.current.has(mkStr(mk)));
    if (uncached.length === 0) return;

    Promise.all(uncached.map(fetchMonth)).then(() => {
      // Merge all cached data into reports
      const merged: Record<string, ReportSummary> = {};
      for (const [, data] of dataCache.current) {
        Object.assign(merged, data);
      }
      setReports(merged);
    });
  }, [months, fetchMonth]);

  // --- Correct date on client mount & initial scroll ---

  useEffect(() => {
    const now = new Date();
    const clientMonth: MonthKey = { year: now.getFullYear(), month: now.getMonth() };

    // If SSR date differs from client date, re-initialize
    if (clientMonth.year !== todayMonth.year || clientMonth.month !== todayMonth.month) {
      setActiveMonth(clientMonth);
      setMonths(initMonths(clientMonth));
    }

    // Scroll to today's month after a frame (ensures DOM is ready)
    requestAnimationFrame(() => {
      const key = mkStr(clientMonth);
      const marker = markerRefs.current.get(key);
      if (marker) {
        const top = marker.getBoundingClientRect().top + window.scrollY - 160;
        window.scrollTo(0, top);
      }
      initialScrollDone.current = true;
      setMounted(true);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Infinite scroll: add months at edges (only after initial scroll) ---

  useEffect(() => {
    if (!mounted) return;
    const topEl = topSentinelRef.current;
    const bottomEl = bottomSentinelRef.current;
    if (!topEl || !bottomEl) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;

          if (entry.target === topEl) {
            setMonths((prev) => {
              const first = prev[0];
              const newMonth = mkOffset(first, -1);
              return [newMonth, ...prev];
            });
          } else if (entry.target === bottomEl) {
            setMonths((prev) => {
              const last = prev[prev.length - 1];
              const newMonth = mkOffset(last, 1);
              return [...prev, newMonth];
            });
          }
        }
      },
      { rootMargin: "200px 0px" }
    );

    observer.observe(topEl);
    observer.observe(bottomEl);
    return () => observer.disconnect();
  }, [mounted]);

  // --- Scroll-based active month detection ---
  // Find the month whose "own" days occupy the most visible area in the viewport.

  const detectActiveMonth = useCallback(() => {
    if (suppressDetection.current) return;

    const vpTop = 0;
    const vpBottom = window.innerHeight;

    const sorted = [...markerRefs.current.entries()]
      .map(([key, el]) => ({ key, top: el.getBoundingClientRect().top }))
      .sort((a, b) => a.top - b.top);

    if (sorted.length === 0) return;

    // Use visible percentage — month must have ≥80% visible to qualify.
    // Among qualified, pick highest percentage. If none qualifies, keep current.
    let best: string | null = null;
    let bestPct = 0;

    for (let i = 0; i < sorted.length; i++) {
      const sectionTop = sorted[i].top;
      const sectionBottom = i + 1 < sorted.length ? sorted[i + 1].top : vpBottom + 1000;
      const sectionHeight = sectionBottom - sectionTop;
      if (sectionHeight <= 0) continue;

      const visibleTop = Math.max(sectionTop, vpTop);
      const visibleBottom = Math.min(sectionBottom, vpBottom);
      const visibleHeight = Math.max(0, visibleBottom - visibleTop);
      const pct = visibleHeight / sectionHeight;

      if (pct >= 0.8 && pct > bestPct) {
        bestPct = pct;
        best = sorted[i].key;
      }
    }

    if (best) {
      const [y, m] = best.split("-").map(Number);
      setActiveMonth((prev) => {
        if (prev.year === y && prev.month === m - 1) return prev;
        return { year: y, month: m - 1 };
      });
    }
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", detectActiveMonth, { passive: true });
    return () => window.removeEventListener("scroll", detectActiveMonth);
  }, [detectActiveMonth]);

  useEffect(() => {
    detectActiveMonth();
  }, [weeks, detectActiveMonth]);

  // --- Navigation helpers ---

  function scrollToMonth(target: MonthKey, behavior: ScrollBehavior = "smooth") {
    // Ensure target month is in the months array
    const exists = months.some((m) => mkEqual(m, target));
    if (!exists) {
      // Rebuild months around target
      setMonths(initMonths(target));
      suppressDetection.current = true;
      setActiveMonth(target);
      // Scroll after re-render
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const key = mkStr(target);
          const marker = markerRefs.current.get(key);
          if (marker) {
            const top = marker.getBoundingClientRect().top + window.scrollY - 160;
            window.scrollTo({ top, behavior });
          }
          setTimeout(() => { suppressDetection.current = false; }, 400);
        });
      });
      return;
    }

    const key = mkStr(target);
    const marker = markerRefs.current.get(key);
    if (marker) {
      const top = marker.getBoundingClientRect().top + window.scrollY - 160;
      window.scrollTo({ top, behavior });
    }
  }

  // --- Task legend & total hours for active month ---

  const { activeMonthTasks, activeMonthHours } = useMemo(() => {
    const key = mkStr(activeMonth);
    const monthData = dataCache.current.get(key);
    if (!monthData) return { activeMonthTasks: [], activeMonthHours: 0 };

    const taskMap: Record<string, { taskName: string; taskColor: string }> = {};
    let totalHours = 0;

    Object.entries(monthData).forEach(([dateStr, r]) => {
      // Only count days that belong to the active month
      const [y, m] = dateStr.split("-").map(Number);
      if (y !== activeMonth.year || m !== activeMonth.month + 1) return;

      r.entries.forEach((e) => {
        totalHours += e.hours;
        if (!taskMap[e.taskId]) {
          taskMap[e.taskId] = { taskName: e.taskName, taskColor: e.taskColor };
        }
      });
    });

    return {
      activeMonthTasks: Object.values(taskMap),
      activeMonthHours: Math.round(totalHours * 10) / 10,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMonth.year, activeMonth.month, reports]);

  // --- Marker ref callback ---

  const setMarkerRef = useCallback((key: string) => (el: HTMLDivElement | null) => {
    if (el) markerRefs.current.set(key, el);
    else markerRefs.current.delete(key);
  }, []);

  // --- Render ---

  return (
    <div className="max-w-4xl px-3 pb-24 md:px-6 md:pb-6 relative z-10">
      <PageTitle title="Calendar" />

      {/* Sticky Header */}
      <div className="sticky top-0 z-20 bg-[var(--color-bg)]/95 backdrop-blur-sm pt-6 pb-2 md:pt-18">
        <div className="flex items-center justify-between mb-3">
          <h1 className="flex items-baseline gap-2 font-light text-[32px] md:text-[48px]" style={{ lineHeight: 1 }}>
            <span>{MONTH_NAMES[activeMonth.month]} {activeMonth.year}</span>
            {activeMonthHours > 0 && (
              <span className="font-semibold text-[14px] md:text-[18px] text-[var(--color-main-hover)]">
                ({activeMonthHours}h)
              </span>
            )}
          </h1>
          <div className="flex items-center gap-1">
            <button
              onClick={() => scrollToMonth(todayMonth)}
              className="px-3 h-9 flex items-center justify-center rounded-full text-sm hover:bg-[var(--color-accent)] hover:text-white transition-all ease-in duration-100"
            >
              Today
            </button>
            <button
              onClick={() => scrollToMonth(mkOffset(activeMonth, -1))}
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[var(--color-accent)] hover:text-white transition-all ease-in duration-100"
            >
              <ChevronUp size={20} />
            </button>
            <button
              onClick={() => scrollToMonth(mkOffset(activeMonth, +1))}
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[var(--color-accent)] hover:text-white transition-all ease-in duration-100"
            >
              <ChevronDown size={20} />
            </button>
          </div>
        </div>

        {/* Task Legend */}
        {activeMonthTasks.length > 0 && (
          <div className="flex flex-wrap gap-x-5 gap-y-1.5 mb-2">
            {activeMonthTasks.map((task) => (
              <div key={task.taskName} className="flex items-center gap-1.5">
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: task.taskColor }}
                />
                <span className="text-xs text-[var(--color-main-hover)]">{task.taskName}</span>
              </div>
            ))}
          </div>
        )}

        {/* Weekday Headers */}
        <div className="grid grid-cols-7 gap-1">
          {WEEKDAYS.map((day, wi) => (
            <div
              key={day}
              className={`text-left text-xs font-medium py-2 pl-1.5 ${wi >= 5 ? "text-[var(--color-main-hover)] opacity-50" : "text-[var(--color-main-hover)]"}`}
            >
              {day}
            </div>
          ))}
        </div>
      </div>

      {/* Top sentinel for infinite scroll */}
      <div ref={topSentinelRef} className="h-px" />

      {/* Continuous Calendar Grid */}
      <div>
        {weeks.map((week) => (
          <Fragment key={week.weekKey}>
            {week.firstOfMonth && (
              <div
                ref={setMarkerRef(mkStr(week.firstOfMonth))}
                data-month-key={mkStr(week.firstOfMonth)}
                className="h-0 w-0 overflow-hidden"
              />
            )}
            <div className="grid grid-cols-7 gap-1">
              {week.days.map((cd, di) => {
                const dateStr = fmtDate(cd.year, cd.month, cd.day);
                const report = reports[dateStr];
                const isToday = dateStr === todayStr;

                const totalHours = report?.entries?.reduce((s, e) => s + e.hours, 0) || 0;
                const hasContent = !!report && (totalHours > 0 || !!report.overview);

                const dow = new Date(cd.year, cd.month, cd.day).getDay();
                const isWeekend = dow === 0 || dow === 6;
                const isOtherMonth = cd.month !== activeMonth.month || cd.year !== activeMonth.year;
                const isDimmed = isWeekend || isOtherMonth;

                const overview = report?.overview || "";

                return (
                  <button
                    key={di}
                    onClick={() => router.push(`/calendar/${dateStr}`)}
                    className="aspect-square p-1.5 md:p-2 text-left transition-all ease-in duration-100 rounded-[8px] flex flex-col overflow-hidden hover:bg-gray-100"
                  >
                    <span
                      className={`block leading-none mb-1 md:mb-2 text-[16px] md:text-[24px] shrink-0 ${
                        isToday
                          ? "font-bold text-[var(--color-accent)]"
                          : isDimmed
                            ? "text-[var(--color-main-hover)] opacity-50"
                            : ""
                      }`}
                    >
                      {cd.day}
                    </span>
                    <div className={`shrink-0 ${hasContent ? "" : "invisible"}`}>
                      {hasContent && totalHours > 0 ? (
                        <HourDots entries={report.entries} />
                      ) : (
                        <div
                          className="w-1/2 h-1.5 rounded-full"
                          style={{ backgroundColor: "var(--color-main-hover)", opacity: 0.25 }}
                        />
                      )}
                    </div>
                    {overview && (
                      <div
                        className="mt-1 min-h-0 flex-1 overflow-hidden"
                        style={{ maskImage: "linear-gradient(to bottom, black calc(100% - 20px), transparent)", WebkitMaskImage: "linear-gradient(to bottom, black calc(100% - 20px), transparent)" }}
                      >
                        <p
                          className="text-[var(--color-main-hover)]"
                          style={{ fontSize: "9px", lineHeight: "1.3", opacity: 0.5 }}
                        >
                          {overview}
                        </p>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </Fragment>
        ))}
      </div>

      {/* Bottom sentinel for infinite scroll */}
      <div ref={bottomSentinelRef} className="h-px" />
    </div>
  );
}
