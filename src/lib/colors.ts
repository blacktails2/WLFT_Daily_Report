export const TASK_COLORS = [
  "#4F46E5", // indigo
  "#0891B2", // cyan
  "#16A34A", // green
  "#EAB308", // yellow
  "#F97316", // orange
  "#EF4444", // red
  "#A855F7", // purple
  "#EC4899", // pink
  "#6366F1", // violet
  "#14B8A6", // teal
  "#84CC16", // lime
  "#F59E0B", // amber
];

export function getNextColor(usedColors: string[]): string {
  const available = TASK_COLORS.find((c) => !usedColors.includes(c));
  return available ?? TASK_COLORS[usedColors.length % TASK_COLORS.length];
}
