"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import type { Workspace } from "@/types";

interface Props {
  workspaces: Workspace[];
  activeId: string | null;
  email: string;
  onSelect: (id: string) => void;
  onCreate: (name: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onReorder: (orderedIds: string[]) => void;
}

export default function WorkspaceSidebar({
  workspaces,
  activeId,
  email,
  onSelect,
  onCreate,
  onRename,
  onDelete,
  onReorder,
}: Props) {
  const pathname = usePathname();
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  function handleDrop(targetId: string) {
    if (!dragId || dragId === targetId) { setDragId(null); setOverId(null); return; }
    const ids = workspaces.map((w) => w._id);
    const from = ids.indexOf(dragId);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) return;
    ids.splice(to, 0, ids.splice(from, 1)[0]);
    onReorder(ids);
    setDragId(null);
    setOverId(null);
  }

  function submitNew() {
    if (newName.trim()) onCreate(newName.trim());
    setNewName(""); setAdding(false);
  }
  function submitRename(id: string) {
    if (editingName.trim()) onRename(id, editingName.trim());
    setEditingId(null);
  }

  const navLink = (href: string, label: string) => {
    const active = pathname === href;
    return (
      <Link
        href={href}
        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
          active ? "bg-tk-blue text-white" : "text-gray-400 hover:text-white hover:bg-navlight"
        }`}
      >
        {label}
      </Link>
    );
  };

  return (
    <aside className="w-56 flex-shrink-0 bg-nav flex flex-col h-screen">
      {/* Logo */}
      <div className="h-14 flex items-center px-4 border-b border-navlight flex-shrink-0">
        <h1 className="text-lg font-bold tracking-tight text-white">
          Task<span className="text-accent">Nest</span>
        </h1>
      </div>

      {/* Nav links */}
      <nav className="px-2 pt-3 pb-2 flex flex-col gap-0.5 flex-shrink-0">
        {navLink("/dashboard", "Dashboard")}
        {navLink("/workspaces", "Workspaces")}
        {navLink("/profile", "Profile")}
      </nav>

      {/* Divider */}
      <div className="mx-3 my-1 border-t border-navlight flex-shrink-0" />

      {/* Workspace label */}
      <div className="px-4 pt-2 pb-1 flex-shrink-0">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-tk-muted">
          Workspaces
        </span>
      </div>

      {/* Workspace list */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-2 pb-2">
        {workspaces.map((w) => {
          const active = w._id === activeId;
          const isEditing = editingId === w._id;
          return (
            <div
              key={w._id}
              draggable={!isEditing}
              onDragStart={() => setDragId(w._id)}
              onDragOver={(e) => { e.preventDefault(); if (dragId && dragId !== w._id) setOverId(w._id); }}
              onDragLeave={() => setOverId((id) => (id === w._id ? null : id))}
              onDrop={(e) => { e.preventDefault(); handleDrop(w._id); }}
              onDragEnd={() => { setDragId(null); setOverId(null); }}
              onClick={() => !isEditing && onSelect(w._id)}
              onDoubleClick={() => { setEditingId(w._id); setEditingName(w.name); }}
              className={`group flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer transition-all mb-0.5 ${
                active ? "bg-tk-blue text-white" : "text-gray-400 hover:text-white hover:bg-navlight"
              } ${dragId === w._id ? "opacity-40" : ""} ${overId === w._id ? "ring-1 ring-accent" : ""}`}
            >
              {/* Drag handle */}
              <span
                className={`text-xs select-none flex-shrink-0 cursor-grab ${
                  active ? "text-blue-200" : "text-gray-600 group-hover:text-gray-400"
                }`}
                title="Drag to reorder"
              >
                ⠿
              </span>

              {isEditing ? (
                <input
                  autoFocus
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onBlur={() => submitRename(w._id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") submitRename(w._id);
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  className="flex-1 bg-transparent outline-none text-sm text-white min-w-0"
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <>
                  <span className="flex-1 text-sm truncate min-w-0">{w.name}</span>
                  {active && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Delete workspace "${w.name}" and all its tasks?`)) onDelete(w._id);
                      }}
                      className="opacity-0 group-hover:opacity-100 text-blue-200 hover:text-red-400 text-xs flex-shrink-0 transition-all"
                      aria-label="Delete workspace"
                    >
                      ✕
                    </button>
                  )}
                </>
              )}
            </div>
          );
        })}

        {/* Add workspace */}
        {adding ? (
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onBlur={submitNew}
            onKeyDown={(e) => {
              if (e.key === "Enter") submitNew();
              if (e.key === "Escape") { setNewName(""); setAdding(false); }
            }}
            placeholder="Workspace name…"
            className="w-full px-3 py-2 rounded-lg bg-navlight text-white text-sm outline-none placeholder:text-gray-500"
          />
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-navlight text-sm transition-all"
          >
            <span className="text-base font-bold leading-none">+</span>
            <span>New Workspace</span>
          </button>
        )}
      </div>

      {/* Footer: user email + logout */}
      <div className="flex-shrink-0 border-t border-navlight px-3 py-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-tk-blue flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {email.charAt(0).toUpperCase()}
          </div>
          <span className="text-xs text-gray-400 truncate flex-1 min-w-0">{email}</span>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-xs text-gray-500 hover:text-white transition-all flex-shrink-0"
            title="Logout"
          >
            ↪
          </button>
        </div>
      </div>
    </aside>
  );
}
