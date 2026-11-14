export default function AdminLoading() {
  return (
    <div role="status" aria-label="Loading">
      <div className="skeleton h-9 w-56" />
      <div className="skeleton mt-6 h-72 w-full" />
    </div>
  );
}
