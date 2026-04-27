#!/usr/bin/env node

/**
 * Extract work daily notes from SideNotes SQLite DB and output as a markdown file.
 *
 * Usage:
 *   node scripts/sidenote-export.js /path/to/SideNotes.sqlite [output.md]
 *   node scripts/sidenote-export.js /path/to/SideNotes.sqlite              # prints to stdout
 *   node scripts/sidenote-export.js /path/to/SideNotes.sqlite work-daily.md
 */

const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");

const WORK_DAILY_FOLDER_ID = 10;

const dbPath = process.argv[2];
const outputPath = process.argv[3];

if (!dbPath) {
  console.error("Usage: node scripts/sidenote-export.js <SideNotes.sqlite> [output.md]");
  process.exit(1);
}

if (!fs.existsSync(dbPath)) {
  console.error(`File not found: ${dbPath}`);
  process.exit(1);
}

const sqlite = new Database(dbPath, { readonly: true });

const rows = sqlite
  .prepare(
    `SELECT ZTEXT FROM ZNOTE
     WHERE ZFOLDER = ? AND ZISHIDDENDELETED = 0 AND ZTEXT LIKE '%### 2%/%/%'
     ORDER BY ZDATE ASC`
  )
  .all(WORK_DAILY_FOLDER_ID);

sqlite.close();

if (rows.length === 0) {
  console.error("No work daily notes found in folder ID " + WORK_DAILY_FOLDER_ID);
  process.exit(1);
}

const output = rows.map((r) => r.ZTEXT.trim()).join("\n\n");

if (outputPath) {
  fs.writeFileSync(outputPath, output, "utf-8");
  console.log(`Exported ${rows.length} notes to ${outputPath}`);
} else {
  console.log(output);
}
