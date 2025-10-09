import type { WithId, Task } from "../types";

/**
 * Calculates the percent complete for a project based on its tasks.
 * Excludes archived/cancelled tasks from the denominator.
 * @param tasks All tasks for the project
 * @returns { percent: number, completed: number, total: number }
 */
export function getProjectProgress(tasks: WithId<Task>[]): { percent: number; completed: number; total: number } {
  const relevant = tasks.filter(
    t => t.status !== "archived"
  );
  const completed = relevant.filter(t => t.status === "done").length;
  const total = relevant.length;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
  return { percent, completed, total };
}
