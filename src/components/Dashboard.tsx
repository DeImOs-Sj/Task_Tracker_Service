"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import WorkspaceSidebar from "./WorkspaceTabBar";
import TaskTree from "./TaskTree";
import type { Workspace } from "@/types";

export default function Dashboard({ userEmail }: { userEmail: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlWs = searchParams.get("ws");

  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loaded, setLoaded] = useState(false);

  function navigateTo(id: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (id) params.set("ws", id);
    else params.delete("ws");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  async function loadWorkspaces() {
    const res = await fetch("/api/workspaces");
    if (res.ok) {
      const data: Workspace[] = await res.json();
      setWorkspaces(data);
      const exists = urlWs && data.some((w) => w._id === urlWs);
      if (!exists && data[0]) navigateTo(data[0]._id);
      else if (!data[0]) navigateTo(null);
    }
    setLoaded(true);
  }

  useEffect(() => {
    loadWorkspaces();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeId = urlWs && workspaces.some((w) => w._id === urlWs) ? urlWs : null;
  const activeWorkspace = workspaces.find((w) => w._id === activeId);

  async function createWorkspace(name: string) {
    const res = await fetch("/api/workspaces", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      const ws: Workspace = await res.json();
      setWorkspaces((prev) => [...prev, ws]);
      navigateTo(ws._id);
    }
  }

  async function renameWorkspace(id: string, name: string) {
    const res = await fetch(`/api/workspaces/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (res.ok) setWorkspaces((prev) => prev.map((w) => (w._id === id ? { ...w, name } : w)));
  }

  async function reorderWorkspaces(orderedIds: string[]) {
    setWorkspaces((prev) => {
      const map = new Map(prev.map((w) => [w._id, w]));
      return orderedIds.map((id, idx) => ({ ...(map.get(id) as Workspace), order: idx }));
    });
    await fetch("/api/workspaces/reorder", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order: orderedIds }),
    });
  }

  async function deleteWorkspace(id: string) {
    const res = await fetch(`/api/workspaces/${id}`, { method: "DELETE" });
    if (res.ok) {
      setWorkspaces((prev) => {
        const next = prev.filter((w) => w._id !== id);
        if (activeId === id) navigateTo(next[0]?._id ?? null);
        return next;
      });
    }
  }

  return (
    <div className="h-screen flex overflow-hidden">
      <WorkspaceSidebar
        workspaces={workspaces}
        activeId={activeId}
        email={userEmail}
        onSelect={(id) => navigateTo(id)}
        onCreate={createWorkspace}
        onRename={renameWorkspace}
        onDelete={deleteWorkspace}
        onReorder={reorderWorkspaces}
      />

      <div className="flex-1 flex flex-col min-w-0 bg-tk-bg">
        {/* Top bar */}
        <header className="h-14 flex-shrink-0 bg-tk-card border-b border-tk-border flex items-center px-6 shadow-sm">
          <h2 className="text-base font-semibold text-tk-text">
            {activeWorkspace?.name ?? (loaded && workspaces.length === 0 ? "TaskNest" : "…")}
          </h2>
        </header>

        <main className="flex-1 overflow-y-auto">
          {!loaded ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-tk-muted text-sm">Loading…</p>
            </div>
          ) : workspaces.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
              <div className="w-16 h-16 rounded-2xl bg-tk-blue-light flex items-center justify-center mb-4">
                <span className="text-2xl">✓</span>
              </div>
              <p className="text-lg font-semibold text-tk-text mb-1">Welcome to TaskNest</p>
              <p className="text-sm text-tk-muted">Create your first workspace using the sidebar.</p>
            </div>
          ) : activeId ? (
            <div className="max-w-2xl mx-auto px-6 py-6">
              <TaskTree key={activeId} workspaceId={activeId} />
            </div>
          ) : null}
        </main>
      </div>
    </div>
  );
}
