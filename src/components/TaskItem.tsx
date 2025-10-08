// src/components/TaskItem.tsx
import React, { useState, useRef } from "react";
import type { Task, Blocker, WithId } from "../types";
import { updateTask } from "../services/tasks";
import Icon from "./Icon";
// If you do not have an Icon component, create src/components/Icon.tsx with a default export.

const taskStatusConfig: { [key in Task["status"]]: { label: string; classes: string } } = {
  not_started: { label: "Not Started", classes: "dark:bg-surface bg-white dark:hover:bg-background hover:bg-gray-50 dark:border-gray-700 border-gray-200" },
  in_progress: { label: "In Progress", classes: "dark:bg-indigo-950 bg-white dark:hover:bg-indigo-900 hover:bg-gray-50 dark:border-indigo-900 border-blue-200" },
  done: { label: "Done", classes: "dark:bg-green-900 bg-white dark:hover:bg-green-800 hover:bg-gray-50 dark:border-green-800 border-green-200" },
  blocked: { label: "Blocked", classes: "dark:bg-red-900 bg-white dark:hover:bg-red-800 hover:bg-gray-50 dark:border-red-800 border-red-300" },
  archived: { label: "Archived", classes: "dark:bg-gray-800 bg-gray-100 dark:border-gray-700 border-gray-200 opacity-60" },
};

const priorities: { [key: number]: { label: string; color: string } } = {
  0: { label: "None", color: "bg-zinc-200" }, // Iron
  1: { label: "Low", color: "bg-gradient-to-r from-gray-300 via-gray-400 to-gray-500" }, // Steel (metallic gradient)
  2: { label: "Medium", color: "bg-gradient-to-r from-slate-100 via-slate-300 to-slate-400" }, // Silver (metallic gradient)
  3: { label: "High", color: "bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-500" }, // Gold (metallic gradient)
  4: { label: "Urgent", color: "bg-gradient-to-r from-orange-300 via-orange-400 to-yellow-600" }, // Bronze (metallic gradient)
};

export const TaskItem: React.FC<{
  uid: string;
  task: WithId<Task>;
  allBlockers: WithId<Blocker>[];
  onStartEdit: () => void;
  onStartPromote: () => void;
  onManageBlockers: () => void;
  onStartBlock: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onUnarchive: () => void;
  onStatusChange: (newStatus: Task["status"]) => void;
  dragHandleProps?: React.HTMLAttributes<HTMLSpanElement>;
  crossListDragHandleProps?: React.HTMLAttributes<HTMLSpanElement>;
  onPriorityChange?: (taskId: string, newPriority: number) => void;
}> = ({ uid, task, allBlockers, onStartEdit, onStartPromote, onManageBlockers, onStartBlock, onArchive, onDelete, onUnarchive, onStatusChange, onPriorityChange }) => {
  const [iconHovered, setIconHovered] = useState(false);
  // Debug: log when TaskItem is rendered and show props
  const dueDateObj = task.dueDate ? new Date(task.dueDate) : null;
  const createdAtObj = (task as any).createdAt?.toDate ? (task as any).createdAt.toDate() : null;
  const updatedAtObj = (task as any).updatedAt?.toDate ? (task as any).updatedAt.toDate() : null;
  const isBlocked = task.status === "blocked";
  const isArchived = task.status === "archived";
  const activeTaskBlockers = isBlocked
    ? allBlockers.filter((b) => b.entityId === task.id && b.status === "active")
    : [];

  const wasUpdated =
    updatedAtObj && createdAtObj && updatedAtObj.getTime() - createdAtObj.getTime() > 60000;
  const latestDateObj = wasUpdated ? updatedAtObj : createdAtObj;
  const latestDateString = latestDateObj && typeof latestDateObj.toLocaleDateString === "function"
    ? latestDateObj.toLocaleDateString(undefined, { month: "short", day: "numeric" })
    : "";
  const dueDateString = dueDateObj && typeof dueDateObj.toLocaleDateString === "function"
    ? dueDateObj.toLocaleDateString(undefined, { month: "short", day: "numeric" })
    : "";

  const handlePriorityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    e.stopPropagation();
    const newPriority = Number(e.target.value);
    updateTask(uid, task.id, { priority: newPriority });
    if (onPriorityChange) {
      onPriorityChange(task.id, newPriority);
    }
  };

  const statusClasses =
    taskStatusConfig[task.status as Task["status"]]?.classes ||
    taskStatusConfig.not_started.classes;

  // Inline edit state
  const [editingInline, setEditingInline] = useState(false);
  const [inlineTitle, setInlineTitle] = useState(task.title);
  const inputRef = useRef<HTMLInputElement>(null);

  // Commit inline edit
  const commitInlineEdit = async () => {
    if (typeof inlineTitle === "string" && inlineTitle.trim() && inlineTitle !== task.title) {
      await updateTask(uid, task.id, { title: inlineTitle.trim() });
    }
    setEditingInline(false);
  };

  // Handle click outside
  React.useEffect(() => {
    if (!editingInline) return;
    function handleClick(e: MouseEvent) {
      if (inputRef.current && !inputRef.current.contains(e.target as Node)) {
        commitInlineEdit();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [editingInline]);

  return (
      <div
        className={`flex items-stretch border rounded-lg shadow-sm transition-shadow ${statusClasses} dark:text-gray-100 text-gray-900`}
        onClick={e => {
          // Only open edit if clicking the container itself, not a child button/input
          if (!isArchived && !editingInline && e.target === e.currentTarget) onStartEdit();
        }}
      >
        <div className="flex flex-1 items-stretch">
          <div className="flex w-full">
            {/* Left cell: status / blockers */}
            <div
              className="flex-shrink-0 flex items-center justify-center h-full transition-all duration-200 dark:bg-black bg-black bg-opacity-5 rounded-l-lg p-2"
              onClick={isBlocked ? onManageBlockers : undefined}
              style={{
                background: isBlocked ? undefined : 'transparent',
                justifyContent: 'flex-start',
                width: iconHovered ? '180px' : (isBlocked ? '165px' : '48px'),
                minWidth: iconHovered ? '180px' : (isBlocked ? '165px' : '48px'),
                maxWidth: iconHovered ? '180px' : (isBlocked ? '300px' : '48px'),
                height: '100%',
                transition: 'all 0.2s',
                position: 'relative',
                zIndex: 1,
                cursor: 'pointer',
                alignItems: 'center',
                display: 'flex',
              }}
              onMouseEnter={() => setIconHovered(true)}
              onMouseLeave={() => setIconHovered(false)}
            >
              {/* Expanded invisible hover area to keep hover state */}
              {iconHovered && !isBlocked && (
                <span
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    width: '100%',
                    height: '100%',
                    background: 'rgba(0,0,0,0)',
                    zIndex: 0,
                    pointerEvents: 'auto',
                  }}
                  aria-hidden="true"
                />
              )}
              {isBlocked ? (
                <div className="text-left w-full">
                  <div className="text-sm font-bold dark:text-red-400 text-red-700 mb-1">BLOCKED</div>
                  <div className="space-y-1 text-xs dark:text-red-300 text-red-900">
                    {activeTaskBlockers.slice(0, 2).map((b) => (
                      <span key={b.id} className="block truncate" title={typeof b.reason === "object" ? JSON.stringify(b.reason) : b.reason}>
                        {typeof b.reason === "object" ? JSON.stringify(b.reason) : b.reason}
                      </span>
                    ))}
                    {activeTaskBlockers.length > 2 && (
                      <span className="block font-semibold">...and {activeTaskBlockers.length - 2} more</span>
                    )}
                  </div>
                </div>
              ) : (
                <div
                  className="relative flex items-center"
                  style={{ width: iconHovered ? '180px' : '60px', minWidth: iconHovered ? '180px' : '60px', maxWidth: iconHovered ? '180px' : '60px', transition: 'max-width 0.2s, width 0.2s', overflow: iconHovered ? 'visible' : 'hidden', background: 'transparent', padding: 0, margin: 0, justifyContent: 'flex-start' }}
                >
                  {/* Only show the active icon when not hovered; show all on hover */}
                  {!iconHovered && (
                    <button
                      type="button"
                      className="p-2 rounded-full transition-all duration-200"
                      title="Not Started"
                      disabled={isArchived}
                      onClick={() => onStatusChange("not_started")}
                      style={{ display: task.status === "not_started" ? 'block' : 'none' }}
                    >
                      {/* Person sitting on bench (Font Awesome) for not_started */}
                      <span className={`inline-flex items-center justify-center rounded-full bg-gray-200 ${task.status === "not_started" ? 'w-8 h-8' : 'w-5 h-5'}` }>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className={`${task.status === "not_started" ? 'w-6 h-6' : 'w-4 h-4'} text-gray-700`}>
                          <path d="M376 88C376 57.1 350.9 32 320 32C289.1 32 264 57.1 264 88C264 118.9 289.1 144 320 144C350.9 144 376 118.9 376 88zM400 300.7L446.3 363.1C456.8 377.3 476.9 380.3 491.1 369.7C505.3 359.1 508.3 339.1 497.7 324.9L427.2 229.9C402 196 362.3 176 320 176C277.7 176 238 196 212.8 229.9L142.3 324.9C131.8 339.1 134.7 359.1 148.9 369.7C163.1 380.3 183.1 377.3 193.7 363.1L240 300.7L240 576C240 593.7 254.3 608 272 608C289.7 608 304 593.7 304 576L304 416C304 407.2 311.2 400 320 400C328.8 400 336 407.2 336 416L336 576C336 593.7 350.3 608 368 608C385.7 608 400 593.7 400 576L400 300.7z"/>
                        </svg>
                      </span>
                    </button>
                  )}
                  {!iconHovered && (
                    <button
                      type="button"
                      className="p-2 rounded-full transition-all duration-200"
                      title="In Progress"
                      disabled={isArchived}
                      onClick={() => onStatusChange("in_progress")}
                      style={{ display: task.status === "in_progress" ? 'block' : 'none' }}
                    >
                      {/* Person walking (Font Awesome) for in_progress */}
                      <span className={`inline-flex items-center justify-center rounded-full bg-blue-300 ${task.status === "in_progress" ? 'w-8 h-8' : 'w-5 h-5'}` }>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className={`${task.status === "in_progress" ? 'w-6 h-6' : 'w-4 h-4'} text-blue-500`}>
                          <path d="M352.5 32C383.4 32 408.5 57.1 408.5 88C408.5 118.9 383.4 144 352.5 144C321.6 144 296.5 118.9 296.5 88C296.5 57.1 321.6 32 352.5 32zM219.6 240C216.3 240 213.4 242 212.2 245L190.2 299.9C183.6 316.3 165 324.3 148.6 317.7C132.2 311.1 124.2 292.5 130.8 276.1L152.7 221.2C163.7 193.9 190.1 176 219.6 176L316.9 176C345.4 176 371.7 191.1 386 215.7L418.8 272L480.4 272C498.1 272 512.4 286.3 512.4 304C512.4 321.7 498.1 336 480.4 336L418.8 336C396 336 375 323.9 363.5 304.2L353.5 287.1L332.8 357.5L408.2 380.1C435.9 388.4 450 419.1 438.3 445.6L381.7 573C374.5 589.2 355.6 596.4 339.5 589.2C323.4 582 316.1 563.1 323.3 547L372.5 436.2L276.6 407.4C243.9 397.6 224.6 363.7 232.9 330.6L255.6 240L219.7 240zM211.6 421C224.9 435.9 242.3 447.3 262.8 453.4L267.5 454.8L260.6 474.1C254.8 490.4 244.6 504.9 231.3 515.9L148.9 583.8C135.3 595 115.1 593.1 103.9 579.5C92.7 565.9 94.6 545.7 108.2 534.5L190.6 466.6C195.1 462.9 198.4 458.1 200.4 452.7L211.6 421z"/>
                        </svg>
                      </span>
                    </button>
                  )}
                  {!iconHovered && (
                    <button
                      type="button"
                      className="p-2 rounded-full transition-all duration-200"
                      title="Done"
                      disabled={isArchived}
                      onClick={() => onStatusChange("done")}
                      style={{ display: task.status === "done" ? 'block' : 'none' }}
                    >
                      {/* Done (Crosswalk thumbs up) for done */}
                      <span className={`inline-flex items-center justify-center rounded-full bg-green-300 ${task.status === "done" ? 'w-8 h-8' : 'w-5 h-5'}` }>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className={`${task.status === "done" ? 'w-6 h-6' : 'w-4 h-4'} text-green-600`}><path d="M280 88C280 57.1 254.9 32 224 32C193.1 32 168 57.1 168 88C168 118.9 193.1 144 224 144C254.9 144 280 118.9 280 88zM304 300.7L341 350.6C353.8 333.1 369.5 317.9 387.3 305.6L331.1 229.9C306 196 266.3 176 224 176C181.7 176 142 196 116.8 229.9L46.3 324.9C35.8 339.1 38.7 359.1 52.9 369.7C67.1 380.3 87.1 377.3 97.7 363.1L144 300.7L144 576C144 593.7 158.3 608 176 608C193.7 608 208 593.7 208 576L208 416C208 407.2 215.2 400 224 400C232.8 400 240 407.2 240 416L240 576C240 593.7 254.3 608 272 608C289.7 608 304 593.7 304 576L304 300.7zM640 464C640 384.5 575.5 320 496 320C416.5 320 352 384.5 352 464C352 543.5 416.5 608 496 608C575.5 608 640 543.5 640 464zM553.4 403.1C560.5 408.3 562.1 418.3 556.9 425.4L492.9 513.4C490.1 517.2 485.9 519.6 481.2 519.9C476.5 520.2 471.9 518.6 468.6 515.3L428.6 475.3C422.4 469.1 422.4 458.9 428.6 452.7C434.8 446.5 445 446.5 451.2 452.7L478 479.5L531 406.6C536.2 399.5 546.2 397.9 553.4 403.1z"/></svg>
                      </span>
                    </button>
                  )}
                  {!iconHovered && (
                    <button
                      type="button"
                      className="p-2 rounded-full transition-all duration-200"
                      title="Blocked"
                      disabled={isArchived}
                      onClick={onStartBlock}
                      style={{ display: task.status === "blocked" ? 'block' : 'none' }}
                    >
                      {/* Blocked (Font Awesome) for blocked */}
                      <span className={`inline-flex items-center justify-center rounded-full bg-red-300 ${task.status === "blocked" ? 'w-8 h-8' : 'w-5 h-5'}` }>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className={`${task.status === "blocked" ? 'w-6 h-6' : 'w-4 h-4'} text-red-600`}>
                          <path d="M288 64C305.7 64 320 78.3 320 96L320 101.4C320 156.6 296.3 208.4 256.1 244.5L319 320L408 320C423.1 320 437.3 327.1 446.4 339.2L489.6 396.8C500.2 410.9 497.3 431 483.2 441.6C469.1 452.2 449 449.3 438.4 435.2L400 384L295.2 384L408.8 523.8C419.9 537.5 417.9 557.7 404.1 568.8C390.3 579.9 370.2 577.9 359.1 564.1L169.4 330.6C163.3 345.6 160 361.9 160 378.6L160 448C160 465.7 145.7 480 128 480C110.3 480 96 465.7 96 448L96 378.6C96 311.2 131.4 248.7 189.2 214L193.8 211.2C232.4 188 256 146.4 256 101.4L256 96C256 78.3 270.3 64 288 64zM48 152C48 121.1 73.1 96 104 96C134.9 96 160 121.1 160 152C160 182.9 134.9 208 104 208C73.1 208 48 182.9 48 152zM424 144.1C424 157.4 413.3 168.1 400 168.1C386.7 168.1 376 157.4 376 144.1L376 96.1C376 82.8 386.7 72.1 400 72.1C413.3 72.1 424 82.8 424 96.1L424 144.1zM528 296.1C514.7 296.1 504 285.4 504 272.1C504 258.8 514.7 248.1 528 248.1L576 248.1C589.3 248.1 600 258.8 600 272.1C600 285.4 589.3 296.1 576 296.1L528 296.1zM473.5 198.6C464.1 189.2 464.1 174 473.5 164.7L507.4 130.8C516.8 121.4 532 121.4 541.3 130.8C550.6 140.2 550.7 155.4 541.3 164.7L507.4 198.6C498 208 482.8 208 473.5 198.6z"/>
                        </svg>
                      </span>
                    </button>
                  )}
                  {iconHovered && (
                    <>
                      <button
                        type="button"
                        className="p-2 rounded-full transition-all duration-200 opacity-100 scale-100"
                        title="Not Started"
                        disabled={isArchived}
                        onClick={() => onStatusChange("not_started")}
                      >
                        {/* Person sitting on bench (Font Awesome) for not_started */}
                        <span className={`inline-flex items-center justify-center rounded-full bg-gray-200 ${task.status === "not_started" ? 'w-8 h-8' : 'w-5 h-5'}` }>
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className={`${task.status === "not_started" ? 'w-6 h-6' : 'w-4 h-4'} text-gray-700`}>
                            <path d="M376 88C376 57.1 350.9 32 320 32C289.1 32 264 57.1 264 88C264 118.9 289.1 144 320 144C350.9 144 376 118.9 376 88zM400 300.7L446.3 363.1C456.8 377.3 476.9 380.3 491.1 369.7C505.3 359.1 508.3 339.1 497.7 324.9L427.2 229.9C402 196 362.3 176 320 176C277.7 176 238 196 212.8 229.9L142.3 324.9C131.8 339.1 134.7 359.1 148.9 369.7C163.1 380.3 183.1 377.3 193.7 363.1L240 300.7L240 576C240 593.7 254.3 608 272 608C289.7 608 304 593.7 304 576L304 416C304 407.2 311.2 400 320 400C328.8 400 336 407.2 336 416L336 576C336 593.7 350.3 608 368 608C385.7 608 400 593.7 400 576L400 300.7z"/>
                          </svg>
                        </span>
                      </button>
                      <button
                        type="button"
                        className="p-2 rounded-full transition-all duration-200 opacity-100 scale-100"
                        title="In Progress"
                        disabled={isArchived}
                        onClick={() => onStatusChange("in_progress")}
                      >
                        {/* Person walking (Font Awesome) for in_progress */}
                        <span className={`inline-flex items-center justify-center rounded-full bg-blue-300 ${task.status === "in_progress" ? 'w-8 h-8' : 'w-5 h-5'}` }>
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className={`${task.status === "in_progress" ? 'w-6 h-6' : 'w-4 h-4'} text-blue-500`}>
                            <path d="M352.5 32C383.4 32 408.5 57.1 408.5 88C408.5 118.9 383.4 144 352.5 144C321.6 144 296.5 118.9 296.5 88C296.5 57.1 321.6 32 352.5 32zM219.6 240C216.3 240 213.4 242 212.2 245L190.2 299.9C183.6 316.3 165 324.3 148.6 317.7C132.2 311.1 124.2 292.5 130.8 276.1L152.7 221.2C163.7 193.9 190.1 176 219.6 176L316.9 176C345.4 176 371.7 191.1 386 215.7L418.8 272L480.4 272C498.1 272 512.4 286.3 512.4 304C512.4 321.7 498.1 336 480.4 336L418.8 336C396 336 375 323.9 363.5 304.2L353.5 287.1L332.8 357.5L408.2 380.1C435.9 388.4 450 419.1 438.3 445.6L381.7 573C374.5 589.2 355.6 596.4 339.5 589.2C323.4 582 316.1 563.1 323.3 547L372.5 436.2L276.6 407.4C243.9 397.6 224.6 363.7 232.9 330.6L255.6 240L219.7 240zM211.6 421C224.9 435.9 242.3 447.3 262.8 453.4L267.5 454.8L260.6 474.1C254.8 490.4 244.6 504.9 231.3 515.9L148.9 583.8C135.3 595 115.1 593.1 103.9 579.5C92.7 565.9 94.6 545.7 108.2 534.5L190.6 466.6C195.1 462.9 198.4 458.1 200.4 452.7L211.6 421z"/>
                          </svg>
                        </span>
                      </button>
                      <button
                        type="button"
                        className="p-2 rounded-full transition-all duration-200 opacity-100 scale-100"
                        title="Done"
                        disabled={isArchived}
                        onClick={() => onStatusChange("done")}
                      >
                        {/* Done (Crosswalk thumbs up) for done */}
                        <span className={`inline-flex items-center justify-center rounded-full bg-green-300 ${task.status === "done" ? 'w-8 h-8' : 'w-5 h-5'}` }>
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className={`${task.status === "done" ? 'w-6 h-6' : 'w-4 h-4'} text-green-600`}><path d="M280 88C280 57.1 254.9 32 224 32C193.1 32 168 57.1 168 88C168 118.9 193.1 144 224 144C254.9 144 280 118.9 280 88zM304 300.7L341 350.6C353.8 333.1 369.5 317.9 387.3 305.6L331.1 229.9C306 196 266.3 176 224 176C181.7 176 142 196 116.8 229.9L46.3 324.9C35.8 339.1 38.7 359.1 52.9 369.7C67.1 380.3 87.1 377.3 97.7 363.1L144 300.7L144 576C144 593.7 158.3 608 176 608C193.7 608 208 593.7 208 576L208 416C208 407.2 215.2 400 224 400C232.8 400 240 407.2 240 416L240 576C240 593.7 254.3 608 272 608C289.7 608 304 593.7 304 576L304 300.7zM640 464C640 384.5 575.5 320 496 320C416.5 320 352 384.5 352 464C352 543.5 416.5 608 496 608C575.5 608 640 543.5 640 464zM553.4 403.1C560.5 408.3 562.1 418.3 556.9 425.4L492.9 513.4C490.1 517.2 485.9 519.6 481.2 519.9C476.5 520.2 471.9 518.6 468.6 515.3L428.6 475.3C422.4 469.1 422.4 458.9 428.6 452.7C434.8 446.5 445 446.5 451.2 452.7L478 479.5L531 406.6C536.2 399.5 546.2 397.9 553.4 403.1z"/></svg>
                        </span>
                      </button>
                      <button
                        type="button"
                        className="p-2 rounded-full transition-all duration-200 opacity-100 scale-100"
                        title="Blocked"
                        disabled={isArchived}
                        onClick={onStartBlock}
                      >
                        {/* Blocked (Font Awesome) for blocked */}
                        <span className={`inline-flex items-center justify-center rounded-full bg-red-300 ${task.status === "blocked" ? 'w-8 h-8' : 'w-5 h-5'}` }>
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className={`${task.status === "blocked" ? 'w-6 h-6' : 'w-4 h-4'} text-red-600`}>
                            <path d="M288 64C305.7 64 320 78.3 320 96L320 101.4C320 156.6 296.3 208.4 256.1 244.5L319 320L408 320C423.1 320 437.3 327.1 446.4 339.2L489.6 396.8C500.2 410.9 497.3 431 483.2 441.6C469.1 452.2 449 449.3 438.4 435.2L400 384L295.2 384L408.8 523.8C419.9 537.5 417.9 557.7 404.1 568.8C390.3 579.9 370.2 577.9 359.1 564.1L169.4 330.6C163.3 345.6 160 361.9 160 378.6L160 448C160 465.7 145.7 480 128 480C110.3 480 96 465.7 96 448L96 378.6C96 311.2 131.4 248.7 189.2 214L193.8 211.2C232.4 188 256 146.4 256 101.4L256 96C256 78.3 270.3 64 288 64zM48 152C48 121.1 73.1 96 104 96C134.9 96 160 121.1 160 152C160 182.9 134.9 208 104 208C73.1 208 48 182.9 48 152zM424 144.1C424 157.4 413.3 168.1 400 168.1C386.7 168.1 376 157.4 376 144.1L376 96.1C376 82.8 386.7 72.1 400 72.1C413.3 72.1 424 82.8 424 96.1L424 144.1zM528 296.1C514.7 296.1 504 285.4 504 272.1C504 258.8 514.7 248.1 528 248.1L576 248.1C589.3 248.1 600 258.8 600 272.1C600 285.4 589.3 296.1 576 296.1L528 296.1zM473.5 198.6C464.1 189.2 464.1 174 473.5 164.7L507.4 130.8C516.8 121.4 532 121.4 541.3 130.8C550.6 140.2 550.7 155.4 541.3 164.7L507.4 198.6C498 208 482.8 208 473.5 198.6z"/>
                          </svg>
                        </span>
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
            {/* Middle: title/description */}
            <div
              className={`flex-grow flex items-center gap-2 min-w-0 transition-all duration-200 relative`}
              style={{ paddingLeft: iconHovered && !isBlocked ? '40px' : '28px' }}
              onClick={e => {
                // Only open full edit if not clicking the text itself or inline input
                if (!isArchived && !editingInline && e.target === e.currentTarget) {
                  onStartEdit();
                }
              }}
            >
              {/* Vertical divider after icon area */}
              <span
                className="absolute left-0 top-3 bottom-3 w-px bg-gray-300 dark:bg-gray-700 opacity-70"
                style={{ left: iconHovered && !isBlocked ? '32px' : '20px' }}
                aria-hidden="true"
              />
              {task.description && (
                <div
                  className="w-1 h-6 dark:bg-gray-700 bg-gray-300 rounded-full flex-shrink-0"
                  title="This task has a description"
                />
              )}
              {editingInline ? (
                <input
                  ref={inputRef}
                  className="truncate border dark:border-gray-700 border-gray-300 rounded px-2 py-1 text-base dark:bg-background dark:text-gray-100"
                  value={typeof inlineTitle === "string" ? inlineTitle : String(inlineTitle)}
                  onChange={e => setInlineTitle(e.target.value)}
                  onBlur={commitInlineEdit}
                  onKeyDown={e => {
                    if (e.key === "Enter") commitInlineEdit();
                    if (e.key === "Escape") setEditingInline(false);
                  }}
                  autoFocus
                  onClick={e => e.stopPropagation()}
                />
              ) : (
                <p
                  className={`truncate ${task.status === "done" ? "line-through dark:text-gray-500 text-gray-500" : ""} cursor-pointer`}
                  onClick={e => {
                    e.stopPropagation();
                    if (!isArchived) setEditingInline(true);
                  }}
                  title="Click to edit title"
                >
                  {typeof task.title === "object" ? JSON.stringify(task.title) : task.title}
                </p>
              )}
            </div>
            {/* Right tools */}
            <div className="flex-shrink-0 flex items-center gap-x-3 p-3 text-sm dark:text-gray-300 text-gray-800">
              {/* Created date */}
              {/* Priority dropdown */}
              {!isArchived && (
                <select
                  value={task.priority}
                  onChange={handlePriorityChange}
                  onClick={(e) => e.stopPropagation()}
                  title="Priority"
                  className={`text-xs font-semibold rounded-lg px-2 py-1 appearance-none focus:outline-none focus:ring-2 focus:ring-accent cursor-pointer shadow-md border border-zinc-400 ${priorities[task.priority]?.color}`}
                  style={{ boxShadow: '0 2px 6px rgba(120,120,120,0.15), inset 0 1px 2px #fff' }}
                >
                  {Object.entries(priorities).map(([value, { label }]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              )}
              {/* Edit button */}
              {!isArchived && (
                <button
                  type="button"
                  className="px-2 py-1 text-xs border rounded dark:bg-surface bg-gray-100 dark:hover:bg-accent hover:bg-blue-100 dark:text-gray-100 text-gray-900"
                  onClick={e => { e.stopPropagation(); onStartEdit(); }}
                  title="Open full edit window"
                >
                  Edit
                </button>
              )}
              {/* Promote, archive, delete, unarchive buttons */}
              <button
                className="p-1 dark:text-gray-400 text-gray-400 dark:hover:text-accent hover:text-blue-500"
                title="Promote to Project"
                onClick={e => { e.stopPropagation(); onStartPromote(); }}
              >
                <Icon path="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z" />
              </button>
              {!isArchived ? (
                <>
                  <button
                    onClick={e => { e.stopPropagation(); onArchive(); }}
                    className="p-1 dark:text-gray-400 text-gray-400 dark:hover:text-gray-100 hover:text-gray-900"
                    title="Archive Task"
                  >
                    <Icon path="M5 5h14v2H5zM7 9h10v10H7z" />
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); onDelete(); }}
                    className="p-1 dark:text-gray-400 text-gray-400 dark:hover:text-red-400 hover:text-red-500"
                    title="Delete Task"
                  >
                    <Icon path="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                  </button>
                  {/* Notes section: vertically stacked on the far right */}
                  <div className="flex flex-col items-end justify-center ml-4 min-w-[120px] text-xs text-right space-y-1">
                    <div className="flex items-center">
                      <div className="border-l border-gray-300 h-10 mx-3" />
                      <div className="flex flex-col items-end justify-center min-w-[120px] text-xs text-right space-y-1">
                        {createdAtObj && (
                          <span className="block" title="Created date">Created: {latestDateString}</span>
                        )}
                        {dueDateObj && (
                          <span className="block" title="Due date">Due: {dueDateString}</span>
                        )}
                        {task.assignee && (
                          <span className="block" title="Assigned to">Assigned: {typeof task.assignee === "object" ? JSON.stringify(task.assignee) : task.assignee}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <button
                  onClick={e => { e.stopPropagation(); onUnarchive(); }}
                  className="p-1 dark:text-gray-400 text-gray-400 dark:hover:text-green-400 hover:text-green-600"
                  title="Unarchive Task"
                >
                  <Icon path="M5 5h14v2H5zm2 4h10v10H7z" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
}
