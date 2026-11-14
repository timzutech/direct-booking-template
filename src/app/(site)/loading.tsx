export default function Loading() {
  return (
    <div className="container-page min-h-screen py-16" role="status" aria-label="Loading">
      <div className="skeleton h-4 w-24" />
      <div className="skeleton mt-4 h-12 w-2/3 max-w-xl" />
      <div className="mt-10 grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => <div key={i} className="skeleton aspect-[4/3]" />)}
      </div>
    </div>
  );
}
