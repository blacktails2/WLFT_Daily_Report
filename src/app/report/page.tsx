"use client";

import { useState, useEffect, useMemo, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PageTitle } from "@/components/page-title";

const BarChart = dynamic(() => import("recharts").then((mod) => mod.BarChart), { ssr: false });
const Bar = dynamic(() => import("recharts").then((mod) => mod.Bar), { ssr: false });
const XAxis = dynamic(() => import("recharts").then((mod) => mod.XAxis), { ssr: false });
const YAxis = dynamic(() => import("recharts").then((mod) => mod.YAxis), { ssr: false });
const Tooltip = dynamic(() => import("recharts").then((mod) => mod.Tooltip), { ssr: false });
const ResponsiveContainer = dynamic(() => import("recharts").then((mod) => mod.ResponsiveContainer), { ssr: false });
const PieChart = dynamic(() => import("recharts").then((mod) => mod.PieChart), { ssr: false });
const Pie = dynamic(() => import("recharts").then((mod) => mod.Pie), { ssr: false });

type Period = "week" | "month" | "year";

interface TaskTotal {
  taskId: string;
  taskName: string;
  taskColor: string;
  totalHours: number;
}

interface StatsData {
  totals: TaskTotal[];
  daily: Record<string, unknown>[];
}

interface TooltipEntry {
  name: string;
  value: number;
  fill?: string;
  payload?: { fill?: string; taskColor?: string };
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: TooltipEntry[] }) {
  if (!active || !payload?.length) return null;
  const entries = payload.filter((e) => e.value > 0);
  if (!entries.length) return null;
  return (
    <div
      style={{
        background: "white",
        border: "1px solid rgba(0,0,0,0.08)",
        borderRadius: "8px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        padding: "8px 12px",
        fontSize: "14px",
        lineHeight: "1.5",
      }}>
      {entries.map((entry, i) => {
        const color = entry.fill || entry.payload?.fill || entry.payload?.taskColor;
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor: color,
                flexShrink: 0,
              }}
            />
            <span>
              {entry.name}: {entry.value}h
            </span>
          </div>
        );
      })}
    </div>
  );
}

const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const FULL_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function getDateRange(period: Period, offset: number) {
  const now = new Date();

  if (period === "week") {
    const d = new Date(now);
    d.setDate(d.getDate() + offset * 7);
    const day = d.getDay();
    const monday = new Date(d);
    monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return {
      from: fmt(monday),
      to: fmt(sunday),
      label: `${SHORT_MONTHS[monday.getMonth()]} ${monday.getDate()}`,
    };
  }

  if (period === "month") {
    const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return {
      from: fmt(d),
      to: fmt(last),
      label: `${FULL_MONTHS[d.getMonth()]} ${d.getFullYear()}`,
    };
  }

  const y = now.getFullYear() + offset;
  return { from: `${y}-01-01`, to: `${y}-12-31`, label: `${y}` };
}

function fmt(d: Date) {
  return d.toISOString().split("T")[0];
}

function useIsMobile() {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia("(max-width: 767px)");
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia("(max-width: 767px)").matches,
    () => false,
  );
}

export default function ReportPage() {
  const [period, setPeriod] = useState<Period>("month");
  const [offset, setOffset] = useState(0);
  const [data, setData] = useState<StatsData | null>(null);
  const isMobile = useIsMobile();

  const range = useMemo(() => getDateRange(period, offset), [period, offset]);

  useEffect(() => {
    fetch(`/api/stats?from=${range.from}&to=${range.to}`)
      .then((r) => r.json())
      .then(setData);
  }, [range]);

  function changePeriod(p: Period) {
    setPeriod(p);
    setOffset(0);
  }

  const taskNames = data?.totals.map((t) => t.taskName) || [];
  const taskColors: Record<string, string> = {};
  data?.totals.forEach((t) => {
    taskColors[t.taskName] = t.taskColor;
  });

  const grandTotal = data?.totals.reduce((s, t) => s + t.totalHours, 0) || 0;

  // Pass fill directly in data to avoid Cell dynamic import color issue
  const donutData = data?.totals.map((t) => ({ ...t, fill: t.taskColor })) || [];

  return (
    <div className="max-w-5xl px-4 pt-6 pb-24 md:px-6 md:pt-18 md:pb-6 relative z-10">
      <PageTitle title="Analytics" />

      {/* Period Navigation */}
      <div className="flex flex-col gap-4 mb-8 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="font-light text-[28px] md:text-[48px]" style={{ lineHeight: 1 }}>
            {range.label}
          </div>
          {data && grandTotal > 0 && (
            <div className="font-semibold text-[28px] md:text-[48px]" style={{ lineHeight: 1 }}>
              {grandTotal}h
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          {/* Period Toggle */}
          <div className="flex items-center gap-1 mr-2">
            {(["week", "month", "year"] as Period[]).map((p) => (
              <button key={p} onClick={() => changePeriod(p)} className={`px-3 py-1.5 text-sm rounded-full transition-all ease-in duration-100 capitalize ${period === p ? "bg-[var(--color-accent)] text-white" : "hover:bg-gray-100"}`}>
                {p}
              </button>
            ))}
          </div>
          <button onClick={() => setOffset(offset - 1)} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[var(--color-accent)] hover:text-white transition-all ease-in duration-100">
            <ChevronLeft size={20} />
          </button>
          <button onClick={() => setOffset(offset + 1)} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[var(--color-accent)] hover:text-white transition-all ease-in duration-100">
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {!data || data.totals.length === 0 ? (
        <p className="text-[var(--color-main-hover)] py-12">No data for this period.</p>
      ) : (
        <>
          {/* Stacked Bar Chart */}
          <div className="mt-16 mb-12">
            <h2 className="text-[var(--color-accent)] mb-4 heading-expanded text-[20px] md:text-[24px]">Daily Breakdown</h2>
            <div className="h-48 md:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.daily} barCategoryGap="30%">
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v: string) => v.slice(5).replace("-", "/")} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip cursor={{ fill: "rgba(0,0,0,0.04)" }} content={<ChartTooltip />} isAnimationActive={false} wrapperStyle={{ transition: "opacity 150ms ease-out" }} />
                  {taskNames.map((name) => (
                    <Bar key={name} dataKey={name} stackId="stack" fill={taskColors[name]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Donut Chart */}
          <div className="mt-16 mb-8">
            <h2 className="text-[var(--color-accent)] mb-4 heading-expanded text-[20px] md:text-[24px]">Task Distribution</h2>
            <div className="h-[280px] md:h-[432px] relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={donutData} dataKey="totalHours" nameKey="taskName" cx="50%" cy="45%" innerRadius={isMobile ? 70 : 115} outerRadius={isMobile ? 87 : 132} cornerRadius={9} paddingAngle={3} />
                  <Tooltip content={<ChartTooltip />} isAnimationActive={false} wrapperStyle={{ transition: "opacity 150ms ease-out" }} />
                </PieChart>
              </ResponsiveContainer>
              {/* Center total */}
              <div className="absolute left-1/2 pointer-events-none" style={{ top: "45%", transform: "translate(-50%, -50%)" }}>
                <div className="text-center font-semibold text-[24px] md:text-[32px]" style={{ lineHeight: 1 }}>
                  {grandTotal}h
                </div>
              </div>
            </div>
            {/* Custom Legend */}
            <div className="flex flex-wrap gap-x-6 gap-y-2 justify-center -mt-8">
              {data.totals.map((t) => (
                <div key={t.taskId} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: t.taskColor }} />
                  <span className="text-sm">
                    {t.taskName} ({t.totalHours}h)
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
