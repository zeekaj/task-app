// src/App.tsx
import React, { useState } from "react";
import { DndContext, pointerWithin, closestCorners, DragOverlay } from "@dnd-kit/core";
import { useAuth } from "./hooks/useAuth";
import { useProjects } from "./hooks/useProjects";
import { useTasks } from "./hooks/useTasks";
import { useAllBlockers } from "./hooks/useBlockers";

import { Header } from "./components/Header";
import { updateTask } from "./services/tasks";
import { Sidebar } from "./components/Sidebar";
import { TasksView } from "./components/views/TasksView";
import { ProjectView } from "./components/views/ProjectView";
import { BlockedView } from "./components/views/BlockedView";
import { CalendarView } from "./components/views/CalendarView";
import { BlockerModal } from "./components/BlockerModal";
import { BlockerManagerModal } from "./components/BlockerManagerModal";
import { PromotionModal } from "./components/PromotionModal";
import { TaskItem } from "./components/TaskItem";
import { signIn } from "./firebase";

type View =
  | { type: "tasks"; id: null }
  | { type: "project"; id: string }
  | { type: "blocked"; id: null }
  | { type: "calendar"; id: null };


const App: React.FC = () => {
  // Track currently dragged task id
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const user = useAuth();
  const [currentView, setCurrentView] = useState<View>({
    type: "tasks",
    id: null,
  });

  const allProjects = useProjects(user?.uid);
  const allTasks = useTasks(user?.uid);
  const allBlockers = useAllBlockers(user?.uid);

  const [promotingTask, setPromotingTask] = useState<any | null>(null);
  const [modalState, setModalState] = useState<{ type: null | "block" | "manage_blockers"; target: any }>({
    type: null,
    target: null,
  });

  const closeModal = () => setModalState({ type: null, target: null });

  if (!user) {
    return (
      <div className="min-h-screen grid place-items-center p-6 bg-gray-100">
        <div className="rounded-2xl shadow p-4 bg-white max-w-md w-full text-center space-y-4">
          <h1 className="text-3xl font-bold">Welcome!</h1>
          <p className="text-gray-600">Sign in to manage your tasks and projects.</p>
          <button className="mt-4 px-6 py-3 bg-black text-white rounded-xl text-lg hover:bg-gray-800" onClick={() => signIn()}>
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  // dnd-kit drag-and-drop handler
  const handleDragStart = ({ active }: any) => {
    setActiveDragId(active?.id ?? null);
  };

  const handleDragEnd = ({ active, over }: any) => {
    setActiveDragId(null);
    console.log('dnd-kit drag end:', { activeId: active?.id, overId: over?.id, over });
    if (!over) {
      console.log('No drop target detected.');
      return;
    }
    // Log all possible over.id values for debugging
    if (typeof over.id === 'string') {
      if (over.id.startsWith('sidebar-project-')) {
        console.log('Sidebar project drop detected:', over.id);
      } else if (over.id === 'sidebar-quicktasks') {
  console.log('Sidebar tasks drop detected.');
      } else {
        console.log('Other drop target:', over.id);
      }
    }
    if (!over) return;
    // Sidebar droppable ids: "sidebar-quicktasks" or "sidebar-project-<id>"
    if (over.id === "sidebar-quicktasks") {
  // Move to Tasks (remove projectId)
      const task = allTasks.find(t => t.id === active.id);
      if (task && task.projectId !== null) {
        updateTask(user.uid, task.id, { projectId: null });
        setCurrentView({ type: "tasks", id: null });
        // Optimistically update local state
        task.projectId = null;
      }
      return;
    }
    if (typeof over.id === "string" && over.id.startsWith("sidebar-project-")) {
      const projectId = over.id.replace("sidebar-project-", "");
      let taskId = active.id;
      if (typeof taskId === "string" && taskId.startsWith("crosslist-")) {
        taskId = taskId.replace("crosslist-", "");
      }
      const task = allTasks.find(t => t.id === taskId);
      if (task && task.projectId !== projectId) {
        // Only move if actually dropped on sidebar project
        const targetTasks = allTasks.filter(t => t.projectId === projectId);
        const newOrder = targetTasks.length;
        updateTask(user.uid, task.id, { projectId, order: newOrder });
        setCurrentView({ type: "project", id: projectId });
        task.projectId = projectId;
        task.order = newOrder;
      }
      return;
    }
  // Handle in-list reordering for Tasks
  // Only reorder if both active and over are in Tasks (no projectId)
    const activeTask = allTasks.find(t => t.id === active.id);
    const overTask = allTasks.find(t => t.id === over.id);
    if (activeTask && overTask) {
  // Tasks reordering
      if (!activeTask.projectId && !overTask.projectId) {
        const quickTasks = allTasks.filter(t => !t.projectId);
        const oldIndex = quickTasks.findIndex(t => t.id === active.id);
        const newIndex = quickTasks.findIndex(t => t.id === over.id);
        if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
          const reordered = [...quickTasks];
          const [removed] = reordered.splice(oldIndex, 1);
          reordered.splice(newIndex, 0, removed);
          for (let i = 0; i < reordered.length; ++i) {
            if (reordered[i].order !== i) {
              updateTask(user.uid, reordered[i].id, { order: i });
              reordered[i].order = i;
            }
          }
        }
        return;
      }
      // Project tasks reordering
      if (
        activeTask.projectId &&
        overTask.projectId &&
        activeTask.projectId === overTask.projectId
      ) {
        const projectTasks = allTasks.filter(t => t.projectId === activeTask.projectId);
        const oldIndex = projectTasks.findIndex(t => t.id === active.id);
        const newIndex = projectTasks.findIndex(t => t.id === over.id);
        if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
          const reordered = [...projectTasks];
          const [removed] = reordered.splice(oldIndex, 1);
          reordered.splice(newIndex, 0, removed);
          for (let i = 0; i < reordered.length; ++i) {
            if (reordered[i].order !== i) {
              updateTask(user.uid, reordered[i].id, { order: i });
              reordered[i].order = i;
            }
          }
        }
      }
    }
  };

  // Custom collision detection: prioritize sortable list reordering, then sidebar droppables
  function customCollisionDetection(args: Parameters<typeof closestCorners>[0]) {
    // Get pointer coordinates
    const pointer = args?.pointerCoordinates;
    // Get all droppable containers
    const containers = args?.droppableContainers || [];
    // Sidebar region: left 0-300px (assuming sidebar width is 300px)
    const isPointerInSidebar = pointer && pointer.x < 300;
    if (isPointerInSidebar) {
      // Only consider sidebar droppables
      const sidebarDroppables = containers.filter(c => typeof c.id === 'string' && c.id.startsWith('sidebar-'));
      // Use pointerWithin for sidebar
      return pointerWithin({ ...args, droppableContainers: sidebarDroppables });
    } else {
      // Only consider non-sidebar droppables (tasks, etc.)
      const listDroppables = containers.filter(c => typeof c.id === 'string' && !c.id.startsWith('sidebar-'));
      // Use closestCorners for in-list reordering
      return closestCorners({ ...args, droppableContainers: listDroppables });
    }
  }

  return (
    <DndContext
      collisionDetection={customCollisionDetection}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
  <div className="flex h-screen font-sans">
  <Sidebar uid={user.uid} currentView={currentView} setCurrentView={setCurrentView} allTasks={allTasks} />
        <main className="flex-1 flex flex-col h-screen">
          <Header
            user={user}
            onAddTask={(title: string) => {
              if (title && user?.uid) {
                console.log(`Add task: ${title}`);
              }
            }}
          />
          <div className="flex-1 p-6 overflow-y-auto">
            {promotingTask && <PromotionModal uid={user.uid} task={promotingTask} onClose={() => setPromotingTask(null)} />}
            {modalState.type === "block" && <BlockerModal uid={user.uid} entity={modalState.target} onClose={closeModal} />}
            {modalState.type === "manage_blockers" && (
              <BlockerManagerModal uid={user.uid} entity={modalState.target} allBlockers={allBlockers} onClose={closeModal} />
            )}

            {currentView.type === "tasks" && (
              <TasksView
                uid={user.uid}
                allTasks={allTasks}
                allBlockers={allBlockers}
                allProjects={allProjects}
              />
            )}

            {currentView.type === "project" && currentView.id && (
              <ProjectView
                uid={user.uid}
                projectId={currentView.id}
                allTasks={allTasks}
                allBlockers={allBlockers}
                allProjects={allProjects}
              />
            )}

            {currentView.type === "blocked" && (
              <BlockedView
                uid={user.uid}
                allTasks={allTasks}
                allBlockers={allBlockers}
                allProjects={allProjects}
                setCurrentView={setCurrentView}
              />
            )}

            {currentView.type === "calendar" && (
              <CalendarView
                tasks={allTasks}
                onTaskClick={(task) => {
                  if (task.projectId) {
                    setCurrentView({ type: "project", id: task.projectId });
                  } else {
                    setCurrentView({ type: "tasks", id: null });
                  }
                }}
              />
            )}
          </div>
        </main>
        <DragOverlay>
          {activeDragId ? (
            (() => {
              const draggedTask = allTasks.find(t => t.id === activeDragId);
              if (!draggedTask) return null;
              return (
                <TaskItem
                  uid={user.uid}
                  task={draggedTask}
                  allBlockers={allBlockers}
                  onStartEdit={() => {}}
                  onManageBlockers={() => {}}
                  onStartBlock={() => {}}
                  onArchive={() => {}}
                  onDelete={() => {}}
                  onUnarchive={() => {}}
                  onStatusChange={() => {}}
                  dragHandleProps={{}}
                />
              );
            })()
          ) : null}
        </DragOverlay>
      </div>
    </DndContext>
  );
};

export default App;
