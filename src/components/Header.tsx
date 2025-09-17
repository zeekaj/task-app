// src/components/Header.tsx
import React from "react";
import { signOut } from "../firebase";

export const Header: React.FC<{ user: any; onAddTask: (title: string) => void }> = ({
  user,
}) => {
  // Removed add task input and handler

  return (
    <header className="p-4 border-b bg-gray-50 flex items-center justify-between flex-shrink-0">
      <div className="flex items-center gap-4 ml-auto">
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
