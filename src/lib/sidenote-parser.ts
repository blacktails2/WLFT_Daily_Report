interface ParsedEntry {
  date: string; // YYYY-MM-DD
  content: string;
}

interface ParseResult {
  entries: ParsedEntry[];
  errors: string[];
}

export function parseSidenoteMarkdown(text: string): ParseResult {
  const lines = text.split("\n");
  const entries: ParsedEntry[] = [];
  const errors: string[] = [];
  const seenDates = new Set<string>();

  let currentDate: string | null = null;
  let currentLines: string[] = [];

  function flushEntry() {
    if (currentDate && currentLines.length > 0) {
      const content = currentLines.join("\n").trim();
      if (content) {
        if (seenDates.has(currentDate)) {
          errors.push(
            `Duplicate date: ${currentDate}`
          );
        } else {
          seenDates.add(currentDate);
          entries.push({ date: currentDate, content });
        }
      }
    }
    currentDate = null;
    currentLines = [];
  }

  for (const line of lines) {
    // Match header: ### 26/4/22 Mon
    const match = line.match(/^###\s+(\d{2})\/(\d{1,2})\/(\d{1,2})\s+\w+/);

    if (match) {
      flushEntry();

      const year = 2000 + parseInt(match[1], 10);
      const month = parseInt(match[2], 10);
      const day = parseInt(match[3], 10);

      // Validate date
      const dateObj = new Date(year, month - 1, day);
      if (
        dateObj.getFullYear() !== year ||
        dateObj.getMonth() !== month - 1 ||
        dateObj.getDate() !== day
      ) {
        errors.push(`Invalid date: ${line.trim()}`);
        continue;
      }

      currentDate = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    } else if (currentDate !== null) {
      currentLines.push(line);
    }
  }

  flushEntry();

  // Sort by date
  entries.sort((a, b) => a.date.localeCompare(b.date));

  return { entries, errors };
}
