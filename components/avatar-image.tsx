export function AvatarImage({
  src,
  initials,
  label,
  size = 40,
  className = "",
}: {
  src: string | null;
  initials: string;
  label: string;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-rose-100 font-semibold text-rose-700 ${className}`}
      style={{ width: size, height: size, fontSize: Math.max(11, Math.round(size * 0.32)) }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} width={size} height={size} alt={label} loading="lazy" className="h-full w-full object-cover" />
      ) : (
        initials || "EF"
      )}
    </span>
  );
}
