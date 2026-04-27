"use client";

interface TaskSegment {
  color: string;
  hours: number;
}

interface CalendarDayBarProps {
  segments: TaskSegment[];
}

export function CalendarDayBar({ segments }: CalendarDayBarProps) {
  const total = segments.reduce((sum, s) => sum + s.hours, 0);
  if (total === 0) return null;

  return (
    <div className="w-full h-1.5 rounded-full overflow-hidden flex">
      {segments.map((seg, i) => (
        <div
          key={i}
          className="h-full"
          style={{
            backgroundColor: seg.color,
            width: `${(seg.hours / total) * 100}%`,
          }}
        />
      ))}
    </div>
  );
}
