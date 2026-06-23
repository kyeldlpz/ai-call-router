import Image from "next/image";

import { cn } from "@/lib/utils";

const LOGO_SRC = "/logo/whitewolf-headset.png";

type BrandLogoSize = "header" | "avatar";

interface BrandLogoProps {
  size: BrandLogoSize;
  className?: string;
  priority?: boolean;
}

const sizeConfig = {
  header: {
    className: "h-12 w-12",
    dimension: 48,
  },
  avatar: {
    className: "h-[4.5rem] w-[4.5rem] sm:h-20 sm:w-20",
    dimension: 80,
  },
} as const;

export function BrandLogo({ size, className, priority = false }: BrandLogoProps) {
  const config = sizeConfig[size];

  return (
    <Image
      src={LOGO_SRC}
      alt="RecoverAi"
      width={config.dimension}
      height={config.dimension}
      priority={priority}
      unoptimized
      className={cn(
        "shrink-0 bg-transparent object-contain",
        config.className,
        className
      )}
    />
  );
}
