"use client";

interface CallingAnimationProps {
  isActive: boolean;
}

export function CallingAnimation({ isActive }: CallingAnimationProps) {
  if (!isActive) {
    return null;
  }

  return (
    <>
      <div
        className="absolute inset-0 rounded-full border-2 border-primary/50 animate-pulse-ring will-change-[transform,opacity]"
        style={{ animationDelay: "0s" }}
      />
      <div
        className="absolute inset-0 rounded-full border-2 border-primary/50 animate-pulse-ring will-change-[transform,opacity]"
        style={{ animationDelay: "0.5s" }}
      />
      <div
        className="absolute inset-0 rounded-full border-2 border-primary/50 animate-pulse-ring will-change-[transform,opacity]"
        style={{ animationDelay: "1.0s" }}
      />
    </>
  );
}
