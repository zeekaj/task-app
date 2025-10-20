// src/App.tsx
import React, { useState, Suspense } from "react";
import { Routes, Route, Navigate, useNavigate, useLocation, useParams } from "react-router-dom";
// drag/drop removed: no @dnd-kit usage
import { useAuth } from "./hooks/useAuth";
// useMaybeProjects/useMaybeTasks are used instead to defer subscriptions from App
// firebase helper removed from App-level; views manage their own firebase subscriptions

import { Header } from "./components/Header";
// updateTask not used at App-level after removing drag/drop
import { Sidebar } from "./components/Sidebar";
const TasksView = React.lazy(() => import("./components/views/TasksView").then(m => ({ default: m.TasksView })));
const ProjectView = React.lazy(() => import("./components/views/ProjectView").then(m => ({ default: m.ProjectView })));
const BlockedView = React.lazy(() => import("./components/views/BlockedView").then(m => ({ default: m.BlockedView })));
const CalendarView = React.lazy(() => import("./components/views/CalendarView").then(m => ({ default: m.CalendarView })));
const TechsView = React.lazy(() => import("./components/views/TechsView").then(m => ({ default: m.TechsView })));
import { BlockerModal } from "./components/BlockerModal";
import { BlockerManagerModal } from "./components/BlockerManagerModal";
import { PromotionModal } from "./components/PromotionModal";
// TaskItem not used at app-level (used in views)
import { signIn } from "./firebase";

type View =
  | { type: "tasks"; id: null }
  | { type: "project"; id: string }
  | { type: "blocked"; id: null }
  | { type: "calendar"; id: null }
  | { type: "techs"; id: null | string };


// Route wrapper components that use useParams
const ProjectRoute: React.FC<{
  uid: string;
  onBack: () => void;
}> = ({ uid, onBack }) => {
  const { projectId } = useParams<{ projectId: string }>();
  return (
    <ProjectView
      uid={uid}
      projectId={projectId!}
      onBack={onBack}
      previousViewType={undefined}
    />
  );
};

const TechRoute: React.FC<{
  uid: string;
  onNavigateToAllTechs: () => void;
  onNavigateToProject: (projectId: string) => void;
}> = ({ uid, onNavigateToAllTechs, onNavigateToProject }) => {
  const { techId } = useParams<{ techId: string }>();
  return (
    <TechsView
      uid={uid}
      selectedTech={techId || null}
      onNavigateToAllTechs={onNavigateToAllTechs}
      onNavigateToProject={onNavigateToProject}
    />
  );
};

// Helper component to get current view from URL
const getCurrentViewFromPath = (pathname: string): View => {
  if (pathname === "/" || pathname === "/tasks") {
    return { type: "tasks", id: null };
  }
  if (pathname === "/blocked") {
    return { type: "blocked", id: null };
  }
  if (pathname === "/calendar") {
    return { type: "calendar", id: null };
  }
  if (pathname === "/techs") {
    return { type: "techs", id: null };
  }
  if (pathname.startsWith("/techs/")) {
    const techId = pathname.replace("/techs/", "");
    return { type: "techs", id: techId };
  }
  if (pathname.startsWith("/project/")) {
    const projectId = pathname.replace("/project/", "");
    return { type: "project", id: projectId };
  }
  return { type: "tasks", id: null };
};

const App: React.FC = () => {
  // Drag/drop removed — no active drag state
  const user = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get current view from URL
  const currentView = getCurrentViewFromPath(location.pathname);
  
  // Helper function to navigate with URL updates
  const navigateToView = (newView: View) => {
    let path = "/";
    switch (newView.type) {
      case "tasks":
        path = "/tasks";
        break;
      case "blocked":
        path = "/blocked";
        break;
      case "calendar":
        path = "/calendar";
        break;
      case "techs":
        path = newView.id ? `/techs/${newView.id}` : "/techs";
        break;
      case "project":
        path = `/project/${newView.id}`;
        break;
    }
    navigate(path);
  };

  // Helper function to go back (browser back)
  const goBack = () => {
    navigate(-1);
  };

  // Views manage their own subscriptions.

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

  // Drag/drop removed — no handlers

  return (
    <div className="flex h-screen font-sans">
  <Sidebar uid={user.uid} currentView={currentView} setCurrentView={navigateToView} />
        <main className="flex-1 flex flex-col h-screen">
          <Header
            user={user}
            onAddTask={() => {
              // Task creation handled by Header component
            }}
          />
          <div className="flex-1 p-6 overflow-y-auto">
            {promotingTask && <PromotionModal uid={user.uid} task={promotingTask} onClose={() => setPromotingTask(null)} />}
            {modalState.type === "block" && <BlockerModal uid={user.uid} entity={modalState.target} onClose={closeModal} />}
            {modalState.type === "manage_blockers" && (
              <BlockerManagerModal uid={user.uid} entity={modalState.target} onClose={closeModal} />
            )}

            <Suspense fallback={<div className="p-6">Loading...</div>}>
            <Routes>
              <Route path="/" element={<Navigate to="/tasks" replace />} />
              <Route 
                path="/tasks" 
                element={
                  <TasksView
                    uid={user.uid}
                  />
                } 
              />
              <Route 
                path="/project/:projectId" 
                element={
                  <ProjectRoute
                    uid={user.uid}
                    onBack={goBack}
                  />
                } 
              />
              <Route 
                path="/blocked" 
                element={
                  <BlockedView
                    uid={user.uid}
                    setCurrentView={navigateToView}
                  />
                } 
              />
              <Route 
                path="/calendar" 
                element={
                  <CalendarView
                    onTaskClick={(task) => {
                      if (task.projectId) {
                        navigateToView({ type: "project", id: task.projectId });
                      } else {
                        navigateToView({ type: "tasks", id: null });
                      }
                    }}
                  />
                } 
              />
              <Route 
                path="/techs" 
                element={
                  <TechsView
                    uid={user.uid}
                    selectedTech={null}
                    onNavigateToAllTechs={() => navigateToView({ type: "techs", id: null })}
                    onNavigateToProject={(projectId) => navigateToView({ type: "project", id: projectId })}
                  />
                } 
              />
              <Route 
                path="/techs/:techId" 
                element={
                  <TechRoute
                    uid={user.uid}
                    onNavigateToAllTechs={() => navigateToView({ type: "techs", id: null })}
                    onNavigateToProject={(projectId) => navigateToView({ type: "project", id: projectId })}
                  />
                } 
              />
            </Routes>
            </Suspense>
          </div>
        </main>
      </div>
  );
};

export default App;
