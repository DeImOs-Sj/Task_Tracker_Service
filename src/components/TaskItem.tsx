"use client";
import { useState } from "react";
import type { Attachment, TaskNode } from "@/types";
import AddTaskInput from "./AddTaskInput";
import AttachmentEditor from "./AttachmentEditor";

type DragProps = {
  draggable: true;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
};

interface Props {
  task: TaskNode;
  depth: number;
  number: string;
  onToggle: (id: string) => void;
  onEdit: (id: string, text: string) => void;
  onDelete: (id: string) => void;
  onAddChild: (parentId: string, text: string, attachments: Attachment[]) => void;
  onSetDeadline: (id: string, deadline: string | null) => void;
  onSetAttachments: (id: string, attachments: Attachment[]) => void;
  onReorder: (parentId: string | null, orderedIds: string[]) => void;
  isDragging?: boolean;
  isDragOver?: boolean;
  dragProps?: DragProps;
}

function fmtDate(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
function isOverdue(iso: string | null, completed: boolean) {
  if (!iso || completed) return false;
  return new Date(iso).getTime() < new Date().setHours(0, 0, 0, 0);
}
function toInputValue(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toISOString().slice(0, 10);
}

export default function TaskItem({
  task,
  depth,
  number,
  onToggle,
  onEdit,
  onDelete,
  onAddChild,
  onSetDeadline,
  onSetAttachments,
  onReorder,
  isDragging = false,
  isDragOver = false,
  dragProps,
}: Props) {
  const [expanded, setExpanded] = useState(true);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(task.text);
  const [showAddChild, setShowAddChild] = useState(false);
  const [editingDate, setEditingDate] = useState(false);
  const [showAttachments, setShowAttachments] = useState(false);

  // Each TaskItem manages drag state for its own children list
  const [childDragId, setChildDragId] = useState<string | null>(null);
  const [childOverId, setChildOverId] = useState<string | null>(null);

  const hasChildren = task.children.length > 0;
  const overdue = isOverdue(task.deadline, task.completed);
  const attachmentCount = task.attachments?.length ?? 0;

  function makeChildDragProps(childId: string, siblings: TaskNode[]): DragProps {
    return {
      draggable: true,
      onDragStart(e) {
        e.stopPropagation();
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", childId);
        setChildDragId(childId);
      },
      onDragEnd(e) {
        e.stopPropagation();
        setChildDragId(null);
        setChildOverId(null);
      },
      onDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = "move";
        setChildOverId(childId);
      },
      onDragLeave(e) {
        e.stopPropagation();
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setChildOverId((id) => (id === childId ? null : id));
        }
      },
      onDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        const draggedId = e.dataTransfer.getData("text/plain");
        if (!draggedId || draggedId === childId) return;
        const ids = siblings.map((s) => s._id);
        const from = ids.indexOf(draggedId);
        const to = ids.indexOf(childId);
        if (from < 0 || to < 0) return;
        ids.splice(to, 0, ids.splice(from, 1)[0]);
        onReorder(task._id, ids);
        setChildDragId(null);
        setChildOverId(null);
      },
    };
  }

  function commitEdit() {
    const v = text.trim();
    if (v && v !== task.text) onEdit(task._id, v);
    else setText(task.text);
    setEditing(false);
  }

  return (
    <div style={{ marginLeft: depth === 0 ? 0 : 20 }}>
      {/* Task row */}
      <div
        {...(dragProps ?? {})}
        className={`group flex items-center gap-2 px-3 py-2.5 rounded-xl bg-tk-card border transition-all ${
          isDragOver
            ? "border-accent shadow-md ring-2 ring-accent/20 scale-[1.01]"
            : "border-tk-border hover:border-accent/30 hover:shadow-sm"
        } ${isDragging ? "opacity-40 scale-95" : "opacity-100"} ${task.completed ? "opacity-60" : ""}`}
      >
        {/* Drag handle */}
        <span
          className="text-sm text-gray-300 group-hover:text-tk-muted cursor-grab active:cursor-grabbing flex-shrink-0 select-none"
          title="Drag to reorder"
        >
          ⠿
        </span>

        {/* Expand/collapse */}
        <button
          onClick={() => setExpanded((v) => !v)}
          className={`w-4 h-4 flex-shrink-0 flex items-center justify-center text-tk-muted text-[10px] transition-transform ${
            hasChildren ? "visible" : "invisible"
          } ${expanded ? "rotate-90" : ""}`}
          aria-label="Toggle children"
        >
          ▶
        </button>

        {/* Checkbox */}
        <input
          type="checkbox"
          checked={task.completed}
          onChange={() => onToggle(task._id)}
          className="w-4 h-4 flex-shrink-0 cursor-pointer rounded"
        />

        {/* Number */}
        <span className="text-[10px] font-mono text-tk-muted flex-shrink-0 min-w-[1.5rem]">
          {number}
        </span>

        {/* Text */}
        {editing ? (
          <input
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitEdit();
              if (e.key === "Escape") { setText(task.text); setEditing(false); }
            }}
            className="flex-1 bg-transparent outline-none border-b border-accent text-sm text-tk-text min-w-0"
          />
        ) : (
          <span
            onClick={() => setEditing(true)}
            className={`flex-1 text-sm cursor-text break-words min-w-0 ${
              task.completed ? "line-through text-tk-muted" : "text-tk-text"
            }`}
          >
            {task.text}
          </span>
        )}

        {/* Deadline */}
        {editingDate ? (
          <span className="flex items-center gap-1 flex-shrink-0">
            <input
              type="date"
              autoFocus
              value={toInputValue(task.deadline)}
              onChange={(e) => { onSetDeadline(task._id, e.target.value || null); }}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === "Escape") setEditingDate(false); }}
              className="text-xs border border-tk-border rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
            <button onClick={() => setEditingDate(false)} className="text-xs text-tk-muted hover:text-tk-text px-1">✓</button>
            {task.deadline && (
              <button
                onClick={() => { onSetDeadline(task._id, null); setEditingDate(false); }}
                className="text-xs text-tk-muted hover:text-red-500 px-1"
              >
                ×
              </button>
            )}
          </span>
        ) : task.deadline ? (
          <button
            onClick={() => setEditingDate(true)}
            className={`flex-shrink-0 text-xs px-2.5 py-1 rounded-full font-medium transition-all ${
              overdue
                ? "bg-red-50 text-red-600 border border-red-200"
                : task.completed
                ? "bg-gray-100 text-gray-400"
                : "bg-tk-blue-light text-accent border border-accent/20"
            }`}
          >
            {fmtDate(task.deadline)}
          </button>
        ) : (
          <button
            onClick={() => setEditingDate(true)}
            className="flex-shrink-0 opacity-0 group-hover:opacity-100 text-xs text-tk-muted hover:text-accent px-2 py-1 rounded-full border border-dashed border-tk-border transition-all"
          >
            + date
          </button>
        )}

        {/* Attachments */}
        <button
          onClick={() => setShowAttachments((v) => !v)}
          className={`flex-shrink-0 text-[11px] px-1.5 h-7 flex items-center justify-center rounded-lg transition-all ${
            attachmentCount > 0
              ? "text-accent bg-tk-blue-light"
              : "opacity-0 group-hover:opacity-100 text-tk-muted hover:text-accent hover:bg-tk-blue-light"
          }`}
          title={attachmentCount > 0 ? `${attachmentCount} attachment(s)` : "Add attachment"}
        >
          {attachmentCount > 0 ? `@ ${attachmentCount}` : "@"}
        </button>

        {/* Add sub-task */}
        <button
          onClick={() => setShowAddChild((v) => !v)}
          className="flex-shrink-0 opacity-0 group-hover:opacity-100 w-7 h-7 flex items-center justify-center rounded-lg text-tk-muted hover:text-accent hover:bg-tk-blue-light transition-all text-base font-bold"
          title="Add sub-task"
        >
          +
        </button>

        {/* Delete */}
        <button
          onClick={() => { if (confirm("Delete this task and all its sub-tasks?")) onDelete(task._id); }}
          className="flex-shrink-0 opacity-0 group-hover:opacity-100 w-7 h-7 flex items-center justify-center rounded-lg text-tk-muted hover:text-red-500 hover:bg-red-50 transition-all"
          title="Delete"
        >
          ×
        </button>
      </div>

      {/* Attachments panel */}
      {showAttachments && (
        <div className="mt-1 ml-4 p-3 bg-tk-card border border-tk-border rounded-xl">
          <AttachmentEditor
            attachments={task.attachments || []}
            onChange={(next) => onSetAttachments(task._id, next)}
          />
        </div>
      )}

      {/* Add sub-task input */}
      {showAddChild && (
        <div className="mt-1 ml-4">
          <AddTaskInput
            placeholder="New sub-task…"
            onAdd={(t, atts) => {
              onAddChild(task._id, t, atts);
              setShowAddChild(false);
              setExpanded(true);
            }}
          />
        </div>
      )}

      {/* Children */}
      {expanded && hasChildren && (
        <div className="mt-1 space-y-1">
          {task.children.map((c, i) => (
            <TaskItem
              key={c._id}
              task={c}
              depth={depth + 1}
              number={`${number}.${i + 1}`}
              onToggle={onToggle}
              onEdit={onEdit}
              onDelete={onDelete}
              onAddChild={onAddChild}
              onSetDeadline={onSetDeadline}
              onSetAttachments={onSetAttachments}
              onReorder={onReorder}
              isDragging={childDragId === c._id}
              isDragOver={childOverId === c._id}
              dragProps={makeChildDragProps(c._id, task.children)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
