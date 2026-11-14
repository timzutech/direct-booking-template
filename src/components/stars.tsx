import { Icon } from "@/components/icons";

export function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5 text-accent" role="img" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Icon key={i} name="star" className={`h-4 w-4 ${i < rating ? "" : "opacity-25"}`} />
      ))}
    </div>
  );
}
