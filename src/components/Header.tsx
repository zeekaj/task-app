// src/components/Header.tsx
import React from "react";
import { signOut } from "../firebase";
import logoUrl from "../assets/logo.svg";

export const Header: React.FC<{ user: any; onAddTask: (title: string) => void }> = ({
  user,
}) => {
  // Removed add task input and handler

  return (
  <header className="p-4 border-b bg-gray-900 text-white border-gray-800 flex items-center justify-between flex-shrink-0 transition-colors duration-200">
      <div className="flex items-center gap-3">
        <img src={logoUrl} alt="Momentum" className="h-8 w-auto" />
        <span className="text-white font-manrope type-h5 tracking-wide">Momentum</span>
      </div>
      <div className="flex items-center gap-4 ml-4">
        <div className="text-sm text-right text-white">
          <div>{user.displayName || user.email}</div>
          <button className="text-xs text-gray-200 hover:underline" onClick={() => signOut()}>
            Sign out
          </button>
        </div>
        {user?.photoURL && (
          <img className="w-10 h-10 rounded-full border dark:border-gray-700" src={user.photoURL} alt="User" />
        )}
      </div>
    </header>
  );
};
