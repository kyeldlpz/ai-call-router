"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { CallStatus } from "@/types";

interface CallStatusBadgeProps {
  status: CallStatus;
}

const STATUS_CONFIG: Record<CallStatus, { label: string; className: string }> = {
  idle: { label: "Ready", className: "bg-gray-100 text-gray-700 border-gray-200" },
  connecting: { label: "Connecting...", className: "bg-yellow-100 text-yellow-700 border-yellow-200 animate-pulse" },
  active: { label: "Active", className: "bg-green-100 text-green-700 border-green-200" },
  ending: { label: "Ending...", className: "bg-orange-100 text-orange-700 border-orange-200" },
  complete: { label: "Complete", className: "bg-blue-100 text-blue-700 border-blue-200" },
  error: { label: "Error", className: "bg-red-100 text-red-700 border-red-200" },
};

export function CallStatusBadge({ status }: CallStatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  return (
    <Badge variant="outline" className={cn("text-xs font-medium", config.className)}>
      <span className={cn(
        "mr-1.5 h-2 w-2 rounded-full",
        status === "active" && "bg-green-500",
        status === "connecting" && "bg-yellow-500",
        status === "idle" && "bg-gray-400",
        status === "complete" && "bg-blue-500",
        status === "error" && "bg-red-500",
        status === "ending" && "bg-orange-500",
      )} />
      {config.label}
    </Badge>
  );
}
