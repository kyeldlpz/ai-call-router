"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface CallRecord {
  id: string;
  call_id: string;
  category: string;
  summary: string;
  language: string;
  duration_seconds: number;
  started_at: string;
  ended_at: string;
  created_at: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  payment: "bg-green-100 text-green-700 border-green-200",
  dispute: "bg-red-100 text-red-700 border-red-200",
  hardship: "bg-yellow-100 text-yellow-700 border-yellow-200",
  settlement: "bg-blue-100 text-blue-700 border-blue-200",
  callback: "bg-purple-100 text-purple-700 border-purple-200",
  general: "bg-gray-100 text-gray-700 border-gray-200",
  unknown: "bg-gray-100 text-gray-500 border-gray-200",
};

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function HistoryPage() {
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string | null>(null);
  const [stats, setStats] = useState<{ total: number; categories: Record<string, number> } | null>(null);
  const router = useRouter();

  // Redirect to login if no token
  useEffect(() => {
    const token = localStorage.getItem("supabase_token");
    if (!token) {
      router.push("/login");
    }
  }, [router]);

  const fetchCalls = async (category?: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (category) params.set("category", category);

      const token = localStorage.getItem("supabase_token") || "";
      const res = await fetch(`${API_BASE}/api/v1/history/calls?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (data.success) {
        setCalls(data.data || []);
      } else {
        setError(data.error || data.detail || "Failed to fetch calls");
      }
    } catch (e) {
      setError("Failed to connect to server. Is the backend running?");
    }
    setLoading(false);
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem("supabase_token") || "";
      const res = await fetch(`${API_BASE}/api/v1/history/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch {
      // Stats are optional
    }
  };

  useEffect(() => {
    fetchCalls(filter || undefined);
    fetchStats();
  }, [filter]);

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <a href="/" className="text-xl font-semibold tracking-tight hover:opacity-80">
            RecoverAi
          </a>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
            Call History
          </span>
        </div>
        <Badge variant="outline" className="text-xs">Super Admin</Badge>
      </header>

      <main className="flex-1 p-6">
        {/* Stats Bar */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
            <button
              onClick={() => setFilter(null)}
              className={`rounded-lg border p-3 text-center transition-colors ${!filter ? "ring-2 ring-primary" : "hover:bg-muted"}`}
            >
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">All Calls</p>
            </button>
            {Object.entries(stats.categories).map(([cat, count]) => (
              <button
                key={cat}
                onClick={() => setFilter(cat === filter ? null : cat)}
                className={`rounded-lg border p-3 text-center transition-colors ${filter === cat ? "ring-2 ring-primary" : "hover:bg-muted"}`}
              >
                <p className="text-2xl font-bold">{count}</p>
                <p className="text-xs text-muted-foreground capitalize">{cat}</p>
              </button>
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 mb-6">
            <p className="text-sm text-red-700">{error}</p>
            <p className="text-xs text-red-500 mt-1">
              Make sure you are logged in as a super_admin.
            </p>
          </div>
        )}

        {/* Calls List */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading calls...</div>
        ) : calls.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No calls found. Complete a call to see it here.
          </div>
        ) : (
          <div className="space-y-3">
            {calls.map((call) => (
              <Card key={call.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge
                          variant="outline"
                          className={`text-xs capitalize ${CATEGORY_COLORS[call.category] || CATEGORY_COLORS.unknown}`}
                        >
                          {call.category}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDuration(call.duration_seconds)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(call.started_at)}
                        </span>
                      </div>
                      <p className="text-sm">{call.summary || "No summary available"}</p>
                    </div>
                    <span className="text-xs text-muted-foreground font-mono">
                      {call.call_id.slice(0, 16)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
