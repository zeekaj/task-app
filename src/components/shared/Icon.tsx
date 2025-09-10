// src/components/shared/Icon.tsx
import React from "react";

export const Icon: React.FC<{ path: string; className?: string }> = ({
  path,
  className = "w-5 h-5",
}) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d={path} />
  </svg>
);
