// src/components/Header.tsx
import React, { useState } from "react";
import { signOut } from "../firebase";

export const Header: React.FC<{ user: any; onAddTask: (title: string) => void }> = ({
  user,
  onAddTask,
}) => {
  const [title, setTitle] = useState("");

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    await onAddTask(title.trim());
    setTitle("");
  };

  return (
    <header className="p-4 border-b bg-gray-50 flex items-center justify-between flex-shrink-0">
      <form onSubmit={handleAddTask} className="flex-grow max-w-xl">
        <input
          className="w-full border rounded-lg px-3 py-2 text-base"
          placeholder="✨ Add a new task..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </form>

      <div className="flex items-center gap-4 ml-6">
        <div className="text-sm text-right">
          <div>{user.displayName || user.email}</div>
          <button className="text-xs text-gray-500 hover:underline" onClick={() => signOut()}>
            Sign out
          </button>
        </div>
        {user?.photoURL && (
          <img className="w-10 h-10 rounded-full" src={user.photoURL} alt="User" />
        )}
      </div>
    </header>
  );
};
