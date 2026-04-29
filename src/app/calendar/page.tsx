"use client";

import { useState, useEffect, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { PageTitle } from "@/components/page-title";

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
  isOverflow: boolean;
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getMonthDays(year: number, month: number): CalendarDay[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  let startOffset = firstDay.getDay() - 1;
  if (startOffset < 0) startOffset = 6;

  const days: CalendarDay[] = [];

  // Previous month overflow days
  if (startOffset > 0) {
    const prevLastDay = new Date(year, month, 0);
    const prevMonth = prevLastDay.getMonth();
    const prevYear = prevLastDay.getFullYear();
    const prevLastDate = prevLastDay.getDate();
    for (let i = startOffset - 1; i >= 0; i--) {
      days.push({ day: prevLastDate - i, month: prevMonth, year: prevYear, isOverflow: true });
    }
  }

  // Current month days
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push({ day: d, month, year, isOverflow: false });
  }

  // Next month overflow days to complete the last week
  const remainder = days.length % 7;
  if (remainder > 0) {
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;
    const fill = 7 - remainder;
    for (let d = 1; d <= fill; d++) {
      days.push({ day: d, month: nextMonth, year: nextYear, isOverflow: true });
    }
  }

  return days;
}

function formatDateStr(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

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

export default function CalendarPage() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [reports, setReports] = useState<Record<string, ReportSummary>>({});
  const router = useRouter();

  const days = useMemo(() => getMonthDays(year, month), [year, month]);

  useEffect(() => {
    // Use the actual grid range (including overflow days) for the API fetch
    const first = days[0];
    const last = days[days.length - 1];
    const from = formatDateStr(first.year, first.month, first.day);
    const to = formatDateStr(last.year, last.month, last.day);

    fetch(`/api/daily-reports?from=${from}&to=${to}`)
      .then((r) => r.json())
      .then((data: ReportSummary[]) => {
        const map: Record<string, ReportSummary> = {};
        for (const r of data) map[r.date] = r;
        setReports(map);
      });
  }, [days]);

  function navigate(offset: number) {
    let m = month + offset;
    let y = year;
    if (m < 0) { m = 11; y--; }
    else if (m > 11) { m = 0; y++; }
    setYear(y);
    setMonth(m);
  }

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  const monthTasks = useMemo(() => {
    const taskMap: Record<string, { taskName: string; taskColor: string }> = {};
    Object.values(reports).forEach((r) => {
      r.entries.forEach((e) => {
        if (!taskMap[e.taskId]) {
          taskMap[e.taskId] = { taskName: e.taskName, taskColor: e.taskColor };
        }
      });
    });
    return Object.values(taskMap);
  }, [reports]);

  return (
    <div className="max-w-4xl px-3 pt-6 pb-24 md:px-6 md:pt-18 md:pb-6 relative z-10">
      <PageTitle title="Calendar" />

      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-light text-[32px] md:text-[48px]" style={{ lineHeight: 1 }}>
          {monthNames[month]} {year}
        </h1>
        <div className="flex items-center gap-1">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[var(--color-accent)] hover:text-white transition-all ease-in duration-100"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={() => navigate(1)}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[var(--color-accent)] hover:text-white transition-all ease-in duration-100"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAYS.map((day, wi) => (
          <div
            key={day}
            className={`text-left text-xs font-medium py-2 pl-1.5 ${wi >= 5 ? "text-[var(--color-main-hover)] opacity-50" : "text-[var(--color-main-hover)]"}`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((cd, i) => {
          const dateStr = formatDateStr(cd.year, cd.month, cd.day);
          const report = reports[dateStr];
          const isToday = dateStr === todayStr;
          const hasReport = !!report;

          const totalHours = report?.entries?.reduce((s, e) => s + e.hours, 0) || 0;
          const hasContent = hasReport && (totalHours > 0 || !!report.overview);

          const dow = new Date(cd.year, cd.month, cd.day).getDay();
          const isWeekend = dow === 0 || dow === 6;
          const isDimmed = cd.isOverflow || isWeekend;

          return (
            <button
              key={i}
              onClick={() => router.push(`/calendar/${dateStr}`)}
              className="p-1 pb-2 md:p-1.5 md:pb-3 text-left transition-all ease-in duration-100 rounded-[8px] flex flex-col hover:bg-gray-100"
            >
              <span
                className={`block leading-none mb-2 text-[16px] md:text-[24px] ${
                  isToday
                    ? "font-bold text-[var(--color-accent)]"
                    : isDimmed
                      ? "text-[var(--color-main-hover)] opacity-50"
                      : ""
                }`}
              >
                {cd.day}
              </span>
              {/* Always render for consistent row height; hidden when no content */}
              <div className={hasContent ? "" : "invisible"}>
                {hasContent && totalHours > 0 ? (
                  <HourDots entries={report.entries} />
                ) : (
                  <div
                    className="w-1/2 h-1.5 rounded-full"
                    style={{ backgroundColor: "var(--color-main-hover)", opacity: 0.25 }}
                  />
                )}
                <span
                  className="leading-none block"
                  style={{ fontSize: "10px", marginTop: "3px", color: "var(--color-main-hover)", opacity: 0.4 }}
                >
                  Worked
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Month Task Breakdown */}
      {monthTasks.length > 0 && (
        <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2">
          {monthTasks.map((task) => (
            <div key={task.taskName} className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: task.taskColor }}
              />
              <span>{task.taskName}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
