import React from "react";

const Icon: React.FC<{ path: string; className?: string }> = ({ path, className }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    width="1em"
    height="1em"
    aria-hidden="true"
  >
    <path d={path} />
  </svg>
);

export default Icon;