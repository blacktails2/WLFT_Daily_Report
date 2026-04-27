"use client";

import { Minus, Plus } from "lucide-react";

interface TimeInputProps {
  value: number;
  onChange: (value: number) => void;
}

export function TimeInput({ value, onChange }: TimeInputProps) {
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => onChange(Math.max(0, value - 1))}
        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--color-accent)] hover:text-white transition-all ease-in duration-100"
      >
        <Minus size={14} />
      </button>
      <span className="w-8 text-center tabular-nums">{value}</span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--color-accent)] hover:text-white transition-all ease-in duration-100"
      >
        <Plus size={14} />
      </button>
    </div>
  );
}
