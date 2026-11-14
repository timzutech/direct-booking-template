"use client";

import { useState } from "react";

export function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div>
      <label htmlFor="copy-field" className="label">{label}</label>
      <div className="flex gap-2">
        <input id="copy-field" readOnly value={value} onFocus={(e) => e.currentTarget.select()} className="field font-mono text-sm" />
        <button
          type="button"
          className="btn-outline shrink-0"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(value);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            } catch {
              setCopied(false);
            }
          }}
        >
          <span aria-live="polite">{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>
    </div>
  );
}
