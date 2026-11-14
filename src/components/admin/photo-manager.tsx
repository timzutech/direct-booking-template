"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { addPhoto, deletePhoto, movePhoto, updatePhotoAlt } from "@/app/admin/actions";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { Photo } from "@/components/photo";
import { browserClient } from "@/lib/supabase/browser";
import type { PropertyPhoto } from "@/lib/types";

const MAX_BYTES = 10 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];

export function PhotoManager({ propertyId, photos }: { propertyId: string; photos: PropertyPhoto[] }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  const upload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const problems: string[] = [];
    const supabase = browserClient();
    let n = 0;
    for (const file of Array.from(files)) {
      n += 1;
      setBusy(`Uploading ${n} of ${files.length}…`);
      if (!TYPES.includes(file.type)) { problems.push(`${file.name}: use a JPG, PNG, WebP or AVIF image.`); continue; }
      if (file.size > MAX_BYTES) { problems.push(`${file.name}: larger than 10 MB.`); continue; }

      const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
      const path = `${propertyId}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("property-photos").upload(path, file, { contentType: file.type, cacheControl: "31536000" });
      if (error) { problems.push(`${file.name}: ${error.message}`); continue; }

      const url = supabase.storage.from("property-photos").getPublicUrl(path).data.publicUrl;
      const alt = file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ");
      const saved = await addPhoto({ propertyId, storagePath: path, url, alt });
      if (saved && !saved.ok) {
        problems.push(`${file.name}: ${saved.message}`);
        await supabase.storage.from("property-photos").remove([path]);
      }
    }
    setErrors(problems);
    setBusy(null);
    if (input.current) input.current.value = "";
    router.refresh();
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-4">
        <label className={`btn-outline cursor-pointer ${busy ? "pointer-events-none opacity-60" : ""}`}>
          {busy ?? "Upload photos"}
          <input ref={input} type="file" accept={TYPES.join(",")} multiple className="sr-only" disabled={!!busy} onChange={(e) => upload(e.target.files)} />
        </label>
        <p className="text-sm text-ink-soft">JPG, PNG, WebP or AVIF, up to 10 MB each. The first photo is the cover.</p>
      </div>
      {errors.length > 0 && (
        <ul role="alert" className="mt-3 space-y-1 rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          {errors.map((e) => <li key={e}>{e}</li>)}
        </ul>
      )}

      {photos.length === 0 ? (
        <p className="mt-5 rounded-lg border border-dashed border-line p-6 text-center text-sm text-ink-soft">No photos yet.</p>
      ) : (
        <ol className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {photos.map((photo, i) => (
            <li key={photo.id} className="rounded-xl border border-line bg-surface p-3">
              <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-muted">
                <Photo src={photo.url} alt={photo.alt || `Photo ${i + 1}`} fill sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 90vw" className="object-cover" />
                <span className="absolute left-2 top-2 rounded-full bg-white/95 px-2.5 py-0.5 text-xs font-semibold text-ink">{i === 0 ? "Cover" : i + 1}</span>
              </div>
              <ActionForm action={updatePhotoAlt} className="mt-3">
                <input type="hidden" name="id" value={photo.id} />
                <input type="hidden" name="property_id" value={propertyId} />
                <label htmlFor={`alt-${photo.id}`} className="label">Description (for screen readers and SEO)</label>
                <div className="flex gap-2">
                  <input id={`alt-${photo.id}`} name="alt" defaultValue={photo.alt} maxLength={200} className="field" />
                  <SubmitButton variant="outline" pendingText="…" className="px-4">Save</SubmitButton>
                </div>
              </ActionForm>
              <div className="mt-2 flex items-center gap-4">
                {(["up", "down"] as const).map((direction) => (
                  <ActionForm key={direction} action={movePhoto}>
                    <input type="hidden" name="id" value={photo.id} />
                    <input type="hidden" name="property_id" value={propertyId} />
                    <input type="hidden" name="direction" value={direction} />
                    <button
                      type="submit"
                      disabled={direction === "up" ? i === 0 : i === photos.length - 1}
                      aria-label={`Move photo ${i + 1} ${direction === "up" ? "earlier" : "later"}`}
                      className="min-h-9 text-sm font-medium text-primary underline underline-offset-4 disabled:text-ink-soft/50 disabled:no-underline"
                    >
                      {direction === "up" ? "← Earlier" : "Later →"}
                    </button>
                  </ActionForm>
                ))}
                <ActionForm action={deletePhoto} confirm="Delete this photo?" className="ml-auto">
                  <input type="hidden" name="id" value={photo.id} />
                  <input type="hidden" name="property_id" value={propertyId} />
                  <button type="submit" aria-label={`Delete photo ${i + 1}`} className="min-h-9 text-sm font-medium text-danger underline underline-offset-4">Delete</button>
                </ActionForm>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
