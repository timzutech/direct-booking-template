export function PageIntro({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="container-page pb-8 pt-12 sm:pt-16">
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h1 className="mt-2 max-w-3xl text-4xl font-semibold leading-tight text-ink sm:text-5xl">{title}</h1>
      {children && <div className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-soft">{children}</div>}
    </div>
  );
}
