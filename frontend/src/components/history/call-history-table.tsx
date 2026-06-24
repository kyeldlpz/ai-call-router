"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface CallSummary {
  callerName: string | null;
  category: string;
  summary: string;
}

interface CallRecord {
  callId: string;
  status: string;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number;
  callSummary: CallSummary | null;
}

const CATEGORY_STYLES: Record<string, string> = {
  payment_inquiry: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  dispute: "bg-red-500/10 text-red-400 border-red-500/30",
  hardship: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  settlement: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  callback: "bg-purple-500/10 text-purple-400 border-purple-500/30",
  general: "bg-slate-500/10 text-slate-400 border-slate-500/30",
  unknown: "bg-slate-500/10 text-slate-500 border-slate-500/30",
};

const CATEGORY_LABELS: Record<string, string> = {
  payment_inquiry: "Payment",
  dispute: "Dispute",
  hardship: "Hardship",
  settlement: "Settlement",
  callback: "Callback",
  general: "General",
  unknown: "Unknown",
};

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface CallHistoryTableProps {
  refreshTrigger?: number;
}

export function CallHistoryTable({ refreshTrigger }: CallHistoryTableProps) {
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const lastDataRef = useRef<string>("");

  const fetchCalls = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/calls`);
      const data = await res.json();
      if (data.success && data.data) {
        // Only update state if data actually changed (prevents flicker)
        const serialized = JSON.stringify(data.data);
        if (serialized !== lastDataRef.current) {
          lastDataRef.current = serialized;
          setCalls(data.data);
        }
      }
    } catch {
      // Silent fail — table just stays as-is
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchCalls().finally(() => setLoading(false));
  }, [refreshTrigger, fetchCalls]);

  // Auto-refresh every 10 seconds (no loading state to avoid flicker)
  useEffect(() => {
    const interval = setInterval(fetchCalls, 10000);
    return () => clearInterval(interval);
  }, [fetchCalls]);

  if (calls.length === 0 && !loading) {
    return null; // Don't show empty table
  }

  return (
    <Card className="panel-surface border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Call History
          </CardTitle>
          <Badge variant="outline" className="text-[10px] tabular-nums">
            {calls.length} {calls.length === 1 ? "call" : "calls"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="rounded-md border border-border/50 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border/50 hover:bg-transparent">
                <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground h-8">
                  Time
                </TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground h-8">
                  Caller
                </TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground h-8">
                  Category
                </TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground h-8">
                  Summary
                </TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground h-8 text-right">
                  Duration
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {calls.map((call) => (
                <TableRow
                  key={call.callId}
                  className="border-border/30 hover:bg-muted/30"
                >
                  <TableCell className="text-xs tabular-nums text-muted-foreground py-2.5">
                    {formatTime(call.startedAt)}
                  </TableCell>
                  <TableCell className="text-xs py-2.5">
                    {call.callSummary?.callerName || (
                      <span className="text-muted-foreground italic">Unknown</span>
                    )}
                  </TableCell>
                  <TableCell className="py-2.5">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] capitalize font-medium",
                        CATEGORY_STYLES[call.callSummary?.category || "unknown"]
                      )}
                    >
                      {CATEGORY_LABELS[call.callSummary?.category || "unknown"] || "Unknown"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs max-w-[300px] truncate py-2.5">
                    {call.callSummary?.summary || (
                      <span className="text-muted-foreground italic">Processing...</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs tabular-nums text-muted-foreground text-right py-2.5">
                    {formatDuration(call.durationSeconds)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
