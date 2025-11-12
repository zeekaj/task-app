import React, { useState, useRef, useEffect } from "react";
import { createTask } from "../../services/tasks";
import { useUserContext } from "../../hooks/useUserContext";

export const QuickAddTask: React.FC<{ uid: string; projectId: string }> = ({ uid, projectId }) => {
  const { teamMemberId } = useUserContext();
  const inputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await createTask(uid, title.trim(), projectId, {}, teamMemberId || undefined);
      setTitle("");
      // Optionally, you could trigger a callback to refresh tasks if needed
    } catch (err: any) {
      setError(err?.message || "Failed to add task.");
    } finally {
      setLoading(false);
    }
  };

  return (
  <form onSubmit={handleAdd} className="flex gap-2 mb-3 bg-gray-200 bg-opacity-80 rounded-xl shadow-lg p-4">
      <input
        ref={inputRef}
        className="flex-1 border rounded-lg px-3 py-2 text-base"
        placeholder="Add a new task to this project..."
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        disabled={loading}
      />
      <button
        type="submit"
        className="px-4 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-60"
        disabled={loading || !title.trim()}
      >
        Add
      </button>
      {error && <span className="text-sm text-red-600 ml-2">{error}</span>}
    </form>
  );
};