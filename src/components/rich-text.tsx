/**
 * Renders plain text from the database/config: blank lines separate
 * paragraphs, and consecutive lines starting with "- " become a bulleted list.
 */
export function RichText({ text, className = "" }: { text: string; className?: string }) {
  const blocks = text.replace(/\r\n/g, "\n").trim().split(/\n\s*\n/).filter(Boolean);
  return (
    <div className={`space-y-4 leading-relaxed text-ink-soft ${className}`}>
      {blocks.map((block, i) => {
        const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
        if (lines.every((l) => /^[-•*]\s+/.test(l))) {
          return (
            <ul key={i} className="list-disc space-y-1.5 pl-5 marker:text-accent">
              {lines.map((l, j) => <li key={j}>{l.replace(/^[-•*]\s+/, "")}</li>)}
            </ul>
          );
        }
        return <p key={i}>{lines.join(" ")}</p>;
      })}
    </div>
  );
}
