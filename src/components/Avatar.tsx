import { initials } from "@/lib/format";

interface AvatarProps {
  name: string;
  src?: string | null;
  size?: number;
  premium?: boolean;
  className?: string;
}

/**
 * Kullanıcı / kanal avatarı.
 * Premium üyelerin avatarı özel bir çerçeve ile gösterilir.
 */
export function Avatar({ name, src, size = 40, premium = false, className = "" }: AvatarProps) {
  const dimension = { width: size, height: size };

  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full ${
        premium ? "ring-2 ring-premium ring-offset-2 ring-offset-bg" : "ring-1 ring-line"
      } ${className}`}
      style={dimension}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={name}
          style={dimension}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      ) : (
        <span
          className="flex h-full w-full items-center justify-center bg-brand-soft font-bold text-brand-strong"
          style={{ fontSize: Math.max(11, size * 0.38) }}
        >
          {initials(name) || "TT"}
        </span>
      )}
    </span>
  );
}
