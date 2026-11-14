"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { Photo } from "@/components/photo";
import type { PropertyPhoto } from "@/lib/types";

/** Photo grid with a keyboard-accessible lightbox (native <dialog>: focus trap + Esc for free). */
export function Gallery({ photos, name }: { photos: PropertyPhoto[]; name: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [index, setIndex] = useState<number | null>(null);
  const count = photos.length;

  const open = (i: number) => {
    setIndex(i);
    dialogRef.current?.showModal();
  };
  const close = () => dialogRef.current?.close();
  const step = useCallback(
    (delta: number) => setIndex((i) => (i === null ? i : (i + delta + count) % count)),
    [count],
  );

  useEffect(() => {
    if (index === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, step]);

  if (count === 0) {
    return <div className="flex aspect-[16/9] items-center justify-center rounded-2xl bg-muted text-ink-soft">Photos coming soon</div>;
  }

  const alt = (p: PropertyPhoto, i: number) => p.alt || `${name} — photo ${i + 1}`;
  const grid = photos.slice(0, 5);
  const current = index === null ? null : photos[index];

  return (
    <div className="relative">
      <ul className={`grid gap-2 overflow-hidden rounded-2xl ${grid.length >= 5 ? "sm:grid-cols-4 sm:grid-rows-2" : grid.length >= 3 ? "sm:grid-cols-3" : ""}`}>
        {grid.map((photo, i) => (
          <li
            key={photo.id}
            className={`relative bg-muted ${i === 0 ? "aspect-[4/3] sm:aspect-auto sm:min-h-[26rem]" : "hidden aspect-[4/3] sm:block"} ${
              i === 0 && grid.length >= 5 ? "sm:col-span-2 sm:row-span-2" : i === 0 && grid.length >= 3 ? "sm:col-span-2 sm:row-span-2" : ""
            }`}
          >
            <button type="button" onClick={() => open(i)} className="group absolute inset-0 block h-full w-full" aria-label={`Open photo ${i + 1} of ${count}: ${alt(photo, i)}`}>
              <Photo
                src={photo.url}
                alt={alt(photo, i)}
                fill
                priority={i === 0}
                sizes={i === 0 ? "(min-width: 640px) 50vw, 100vw" : "25vw"}
                className="object-cover transition-opacity group-hover:opacity-90"
              />
            </button>
          </li>
        ))}
      </ul>
      <button type="button" onClick={() => open(0)} className="btn absolute bottom-4 right-4 bg-white text-ink shadow-card hover:bg-white/90">
        View all {count} photos
      </button>

      <dialog
        ref={dialogRef}
        onClose={() => setIndex(null)}
        onClick={(e) => e.target === dialogRef.current && close()}
        aria-label={`${name} photo gallery`}
        className="m-0 h-dvh max-h-none w-screen max-w-none bg-black/95 p-0 text-white backdrop:bg-black"
      >
        {current && index !== null && (
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between px-4 py-3">
              <p aria-live="polite" className="text-sm tabular-nums">{index + 1} / {count}</p>
              <button type="button" onClick={close} autoFocus aria-label="Close gallery" className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-white/10">
                <Icon name="close" className="h-6 w-6" />
              </button>
            </div>
            <div className="relative flex-1">
              <Photo key={current.id} src={current.url} alt={alt(current, index)} fill sizes="100vw" className="object-contain" />
              {count > 1 && (
                <>
                  <button type="button" onClick={() => step(-1)} aria-label="Previous photo" className="absolute left-2 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 hover:bg-black/70">
                    <Icon name="chevron-left" className="h-6 w-6" />
                  </button>
                  <button type="button" onClick={() => step(1)} aria-label="Next photo" className="absolute right-2 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 hover:bg-black/70">
                    <Icon name="chevron-right" className="h-6 w-6" />
                  </button>
                </>
              )}
            </div>
            <p className="px-4 py-4 text-center text-sm text-white/85">{alt(current, index)}</p>
          </div>
        )}
      </dialog>
    </div>
  );
}
