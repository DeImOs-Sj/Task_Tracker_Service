"use client";
import { useEffect, useMemo, useState } from "react";
import type { Attachment, TaskDTO, TaskNode } from "@/types";
import TaskItem from "./TaskItem";
import AddTaskInput from "./AddTaskInput";

function buildTree(tasks: TaskDTO[]): TaskNode[] {
  const map = new Map<string, TaskNode>();
  tasks.forEach((t) => map.set(t._id, { ...t, children: [] }));
  const roots: TaskNode[] = [];
  map.forEach((node) => {
    if (node.parentId && map.has(node.parentId)) {
      map.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  });
  const sortRec = (arr: TaskNode[]) => {
    arr.sort((a, b) => {
      const ad = a.deadline ? new Date(a.deadline).getTime() : Infinity;
      const bd = b.deadline ? new Date(b.deadline).getTime() : Infinity;
      if (ad !== bd) return ad - bd;
      return a.order - b.order;
    });
    arr.forEach((n) => sortRec(n.children));
  };
  sortRec(roots);
  return roots;
}

function pruneToDepth(nodes: TaskNode[], maxDepth: number, current = 1): TaskNode[] {
  return nodes.map((n) => ({
    ...n,
    children: current >= maxDepth ? [] : pruneToDepth(n.children, maxDepth, current + 1),
  }));
}
function maxTreeDepth(nodes: TaskNode[]): number {
  let m = 0;
  for (const n of nodes) {
    const d = 1 + maxTreeDepth(n.children);
    if (d > m) m = d;
  }
  return m;
}

export default function TaskTree({ workspaceId }: { workspaceId: string }) {
  const [tasks, setTasks] = useState<TaskDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [maxDepth, setMaxDepth] = useState<number | "all">("all");
  const [rootDragId, setRootDragId] = useState<string | null>(null);
  const [rootOverId, setRootOverId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/tasks?workspaceId=${workspaceId}`);
    if (res.ok) setTasks(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  const tree = useMemo(() => buildTree(tasks), [tasks]);
  const treeDepth = useMemo(() => maxTreeDepth(tree), [tree]);
  const visibleTree = useMemo(
    () => (maxDepth === "all" ? tree : pruneToDepth(tree, maxDepth)),
    [tree, maxDepth]
  );

  async function reorderTasks(parentId: string | null, orderedIds: string[]) {
    setTasks((prev) => {
      const orderMap = new Map(orderedIds.map((id, i) => [id, i]));
      return prev.map((t) => {
        if (t.parentId === parentId && orderMap.has(t._id)) {
          return { ...t, order: orderMap.get(t._id)! };
        }
        return t;
      });
    });
    await fetch("/api/tasks/reorder", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId, parentId, orderedIds }),
    });
  }

  function makeRootDragProps(taskId: string) {
    return {
      draggable: true as const,
      onDragStart(e: React.DragEvent) {
        e.stopPropagation();
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", taskId);
        setRootDragId(taskId);
      },
      onDragEnd(e: React.DragEvent) {
        e.stopPropagation();
        setRootDragId(null);
        setRootOverId(null);
      },
      onDragOver(e: React.DragEvent) {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = "move";
        setRootOverId(taskId);
      },
      onDragLeave(e: React.DragEvent) {
        e.stopPropagation();
        // Only clear if leaving to something outside this element
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setRootOverId((id) => (id === taskId ? null : id));
        }
      },
      onDrop(e: React.DragEvent) {
        e.preventDefault();
        e.stopPropagation();
        const draggedId = e.dataTransfer.getData("text/plain");
        if (!draggedId || draggedId === taskId) return;
        const ids = visibleTree.map((t) => t._id);
        const from = ids.indexOf(draggedId);
        const to = ids.indexOf(taskId);
        if (from < 0 || to < 0) return;
        ids.splice(to, 0, ids.splice(from, 1)[0]);
        reorderTasks(null, ids);
        setRootDragId(null);
        setRootOverId(null);
      },
    };
  }

  async function addTask(text: string, parentId: string | null, attachments: Attachment[] = []) {
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, workspaceId, parentId, attachments }),
    });
    if (!res.ok) {
      const msg = await res.text().catch(() => "");
      alert(`Failed to create task (${res.status}). ${msg}`);
      return;
    }
    await load();
  }

  async function setAttachments(id: string, attachments: Attachment[]) {
    const res = await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attachments }),
    });
    if (!res.ok) { alert(`Failed to save attachments (${res.status}).`); return; }
    await load();
  }

  async function toggle(id: string) {
    await fetch(`/api/tasks/${id}/toggle`, { method: "PATCH" });
    await load();
  }

  async function edit(id: string, text: string) {
    await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    await load();
  }

  async function remove(id: string) {
    await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    await load();
  }

  async function setDeadline(id: string, deadline: string | null) {
    await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deadline }),
    });
    await load();
  }

  if (loading)
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-tk-muted text-sm">Loading…</p>
      </div>
    );

  return (
    <div>
      {treeDepth > 1 && (
        <div className="flex items-center justify-end gap-2 mb-4">
          <label className="text-xs text-tk-muted">Show levels:</label>
          <select
            value={maxDepth === "all" ? "all" : String(maxDepth)}
            onChange={(e) =>
              setMaxDepth(e.target.value === "all" ? "all" : Number(e.target.value))
            }
            className="text-xs border border-tk-border rounded-lg px-2.5 py-1.5 bg-tk-card text-tk-text focus:outline-none focus:ring-2 focus:ring-accent/30"
          >
            <option value="all">All levels</option>
            {Array.from({ length: Math.max(treeDepth, 1) }, (_, i) => i + 1).map((lvl) => (
              <option key={lvl} value={lvl}>
                Up to {lvl}
              </option>
            ))}
          </select>
        </div>
      )}

      {tree.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-12 h-12 rounded-2xl bg-tk-blue-light flex items-center justify-center mb-3">
            <span className="text-xl">📋</span>
          </div>
          <p className="text-base font-medium text-tk-text mb-1">No tasks yet</p>
          <p className="text-sm text-tk-muted">Add your first task below.</p>
        </div>
      ) : (
        <div className="space-y-1">
          {visibleTree.map((t, i) => (
            <TaskItem
              key={t._id}
              task={t}
              depth={0}
              number={`${i + 1}`}
              onToggle={toggle}
              onEdit={edit}
              onDelete={remove}
              onAddChild={(pid, text, atts) => addTask(text, pid, atts)}
              onSetDeadline={setDeadline}
              onSetAttachments={setAttachments}
              onReorder={reorderTasks}
              isDragging={rootDragId === t._id}
              isDragOver={rootOverId === t._id}
              dragProps={makeRootDragProps(t._id)}
            />
          ))}
        </div>
      )}

      <div className="mt-4">
        <AddTaskInput onAdd={(text, atts) => addTask(text, null, atts)} />
      </div>
    </div>
  );
}
