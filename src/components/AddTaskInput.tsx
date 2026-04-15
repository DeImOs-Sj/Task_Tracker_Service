"use client";
import { useState } from "react";
import type { Attachment } from "@/types";
import AttachmentEditor from "./AttachmentEditor";

interface Props {
  placeholder?: string;
  onAdd: (text: string, attachments: Attachment[]) => void;
  allowAttachments?: boolean;
}

export default function AddTaskInput({
  placeholder = "Add a task…  Press Enter to save",
  onAdd,
  allowAttachments = true,
}: Props) {
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [focused, setFocused] = useState(false);

  function submit() {
    if (text.trim()) {
      onAdd(text.trim(), attachments);
      setText("");
      setAttachments([]);
    }
  }

  return (
    <div
      className={`bg-tk-card border rounded-xl transition-all ${
        focused ? "border-accent shadow-sm ring-2 ring-accent/15" : "border-tk-border"
      }`}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="text-xl font-light text-accent flex-shrink-0 leading-none">+</span>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          className="flex-1 bg-transparent outline-none text-sm text-tk-text placeholder:text-tk-muted"
        />
        {text.trim() && (
          <button
            onClick={submit}
            className="flex-shrink-0 bg-accent text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-blue-600 transition-all"
          >
            Add
          </button>
        )}
      </div>
      {allowAttachments && focused && (
        <div className="border-t border-tk-border px-4 py-2">
          <AttachmentEditor attachments={attachments} onChange={setAttachments} compact />
        </div>
      )}
    </div>
  );
}
