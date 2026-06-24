import Image from "next/image";

export function BrandLogo({
  size = 48,
  priority = false,
  className = "",
  imageClassName = "",
}: {
  size?: number;
  priority?: boolean;
  className?: string;
  imageClassName?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center ${className}`}
      style={{ height: size, width: size }}
    >
      <Image
        alt=""
        className={`h-full w-full object-contain ${imageClassName}`}
        height={size}
        priority={priority}
        src="/ranked-runs-logo.png"
        width={size}
      />
    </span>
  );
}
