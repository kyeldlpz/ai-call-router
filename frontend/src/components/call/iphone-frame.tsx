"use client";

interface IPhoneFrameProps {
  children: React.ReactNode;
}

export function IPhoneFrame({ children }: IPhoneFrameProps) {
  return (
    <div
      className="relative mx-auto max-w-[340px] w-full max-h-[85vh] aspect-[9/19.5] border-[5px] border-gray-800 rounded-[3.5rem] shadow-2xl shadow-[0_0_40px_rgba(0,0,0,0.6)] bg-black"
    >
      {/* Left side buttons */}
      {/* Mute switch */}
      <div className="absolute -left-[8px] top-[12%] w-[3px] h-6 bg-gray-600 rounded-l-sm" />
      {/* Volume up */}
      <div className="absolute -left-[8px] top-[18%] w-[3px] h-10 bg-gray-600 rounded-l-sm" />
      {/* Volume down */}
      <div className="absolute -left-[8px] top-[25%] w-[3px] h-10 bg-gray-600 rounded-l-sm" />

      {/* Right side button — power/side button */}
      <div className="absolute -right-[8px] top-[20%] w-[3px] h-14 bg-gray-600 rounded-r-sm" />

      {/* Inner content area — screen fills edge to edge like Pro Max */}
      <div className="overflow-hidden rounded-[3rem] h-full w-full relative">
        {/* Dynamic Island — floats on top of content, no black bar */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 w-[120px] h-[34px] rounded-full bg-black shadow-[0_0_4px_rgba(0,0,0,0.8)]" />
        {children}
      </div>
    </div>
  );
}
