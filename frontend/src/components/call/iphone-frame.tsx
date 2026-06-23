"use client";

interface IPhoneFrameProps {
  children: React.ReactNode;
}

export function IPhoneFrame({ children }: IPhoneFrameProps) {
  return (
    <div className="relative mx-auto max-w-[300px] w-full max-h-[80vh] aspect-[9/19.5] border-[4px] border-secondary rounded-[3rem] shadow-lg bg-black">
      <div className="absolute -left-[7px] top-[12%] w-[3px] h-6 bg-secondary rounded-l-sm" />
      <div className="absolute -left-[7px] top-[18%] w-[3px] h-10 bg-secondary rounded-l-sm" />
      <div className="absolute -left-[7px] top-[25%] w-[3px] h-10 bg-secondary rounded-l-sm" />
      <div className="absolute -right-[7px] top-[20%] w-[3px] h-14 bg-secondary rounded-r-sm" />

      <div className="overflow-hidden rounded-[2.65rem] h-full w-full relative">
        <div className="absolute top-3.5 left-1/2 -translate-x-1/2 z-20 w-[100px] h-[28px] rounded-full bg-black border border-white/5" />
        {children}
      </div>
    </div>
  );
}
