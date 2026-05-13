"use client";

import { useState, useRef } from "react";
import { Upload, FileText, AlertTriangle, Check } from "lucide-react";
import { PageTitle } from "@/components/page-title";
import { parseSidenoteMarkdown } from "@/lib/sidenote-parser";

interface ParsedEntry {
  date: string;
  content: string;
}

export default function ImportPage() {
  const [rawContent, setRawContent] = useState("");
  const [preview, setPreview] = useState<ParsedEntry[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleParse(text: string) {
    setRawContent(text);
    setResult(null);
    const { entries, errors: parseErrors } = parseSidenoteMarkdown(text);
    setPreview(entries);
    setErrors(parseErrors);
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => handleParse(ev.target?.result as string);
    reader.readAsText(file);
  }

  async function handleImport() {
    if (errors.length > 0) return;
    setImporting(true);

    const res = await fetch("/api/import/sidenote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: rawContent }),
    });

    const data = await res.json();

    if (res.ok) {
      setResult(`Imported ${data.imported} new reports, appended to ${data.appended} existing reports.`);
      setPreview([]);
      setRawContent("");
    } else {
      setErrors(data.errors || ["Import failed"]);
    }

    setImporting(false);
  }

  return (
    <div className="max-w-3xl px-4 pt-6 pb-24 md:px-6 md:pt-18 md:pb-6 relative z-10">
      <PageTitle title="Import" />

      {/* Title */}
      <h1 className="text-[var(--color-accent)] mb-2 heading-expanded text-[20px] md:text-[24px]">
        Import Sidenote
      </h1>
      <p className="text-sm text-[var(--color-main-hover)] mb-8">
        Upload a markdown file with daily notes in Sidenote format.
      </p>

      {/* Upload Button */}
      <div className="mb-6">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 px-5 py-2.5 border border-[var(--color-accent)] text-[var(--color-accent)] rounded-full hover:bg-[var(--color-accent)] hover:text-white transition-all ease-in duration-100"
        >
          <Upload size={16} />
          Upload .md file
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".md,.txt"
          onChange={handleFileUpload}
          className="hidden"
        />
      </div>

      {/* Text Area */}
      <div className="mb-6">
        <textarea
          value={rawContent}
          onChange={(e) => {
            handleParse(e.target.value);
            e.target.style.height = "auto";
            e.target.style.height = e.target.scrollHeight + "px";
          }}
          ref={(el) => {
            if (el) {
              el.style.height = "auto";
              el.style.height = el.scrollHeight + "px";
            }
          }}
          placeholder={"### 26/4/22 Mon\nToday I worked on...\n\n### 26/4/23 Tue\n..."}
          rows={1}
          className={`w-full py-2 text-sm font-mono focus:outline-none textarea-auto transition-all ease-in duration-100 bg-transparent border-b ${
            rawContent ? "border-[var(--color-main)]" : "border-transparent focus:border-[var(--color-main)]"
          }`}
        />
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 text-[var(--color-accent)] font-medium text-sm mb-1">
            <AlertTriangle size={16} />
            Parse Errors
          </div>
          <ul className="text-sm text-[var(--color-accent)] list-disc ml-6">
            {errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Preview */}
      {preview.length > 0 && errors.length === 0 && (
        <div className="mb-6">
          <p className="text-[var(--color-main-hover)] text-sm mb-3">
            Preview — {preview.length} entries
          </p>
          <div className="max-h-96 overflow-y-auto">
            {preview.map((entry, i) => (
              <div
                key={entry.date}
                className={`py-3 ${i > 0 ? "border-t border-[var(--color-main)]" : ""}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <FileText size={14} className="text-[var(--color-main-hover)]" />
                  <span className="text-sm font-medium">{entry.date}</span>
                </div>
                <p className="text-sm text-[var(--color-main-hover)] whitespace-pre-wrap line-clamp-3 ml-5">
                  {entry.content}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Import Button */}
      {preview.length > 0 && errors.length === 0 && (
        <button
          onClick={handleImport}
          disabled={importing}
          className="flex items-center justify-center gap-2 px-6 py-2.5 bg-[var(--color-accent)] text-white rounded-full border border-[var(--color-accent)] hover:bg-[var(--color-bg)] hover:text-[var(--color-accent)] disabled:opacity-50 transition-all ease-in duration-100"
        >
          {importing ? "Importing..." : `Import ${preview.length} Entries`}
        </button>
      )}

      {/* Result */}
      {result && (
        <div className="mt-6 flex items-center gap-2 text-sm text-[var(--color-main-hover)]">
          <Check size={16} className="text-[var(--color-accent)]" />
          {result}
        </div>
      )}
    </div>
  );
}
