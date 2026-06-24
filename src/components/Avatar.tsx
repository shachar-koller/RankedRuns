import Image from "next/image";
import { initials } from "@/lib/utils";

export function Avatar({
  name,
  src,
  size = 44,
}: {
  name: string;
  src?: string | null;
  size?: number;
}) {
  if (src) {
    return (
      <Image
        alt=""
        className="rounded-full bg-slate-200 object-cover"
        height={size}
        src={src}
        width={size}
      />
    );
  }

  return (
    <div
      className="grid shrink-0 place-items-center rounded-full bg-slate-200 text-sm font-bold text-slate-500"
      style={{ height: size, width: size }}
    >
      {initials(name)}
    </div>
  );
}
