// src/App.tsx
import React, { useState } from "react";
import { useAuth } from "./hooks/useAuth";
import { useProjects } from "./hooks/useProjects";
import { useTasks } from "./hooks/useTasks";
import { useAllBlockers } from "./hooks/useBlockers";

import { Header } from "./components/Header";
import { Sidebar } from "./components/Sidebar";
import { TasksView } from "./components/views/TasksView";
import { ProjectView } from "./components/views/ProjectView";
import { BlockedView } from "./components/views/BlockedView";
import { BlockerModal } from "./components/BlockerModal";
import { BlockerManagerModal } from "./components/BlockerManagerModal";
import { PromotionModal } from "./components/PromotionModal";
import { signIn } from "./firebase";

const App: React.FC = () => {
  const user = useAuth();
  const [currentView, setCurrentView] = useState<{ type: "tasks" | "project" | "blocked"; id: string | null }>({
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

  const openBlockerModal = (target: any) => setModalState({ type: "block", target });
  const openBlockerManagerModal = (target: any) => setModalState({ type: "manage_blockers", target });
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

  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      <Sidebar uid={user.uid} currentView={currentView} setCurrentView={setCurrentView} />
      <main className="flex-1 flex flex-col h-screen">
        <Header uid={user.uid} user={user} />
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
              openBlockerModal={openBlockerModal}
              openBlockerManagerModal={openBlockerManagerModal}
              setPromotingTask={setPromotingTask}
            />
          )}

          {currentView.type === "project" && currentView.id && (
            <ProjectView
              uid={user.uid}
              projectId={currentView.id}
              allTasks={allTasks}
              allBlockers={allBlockers}
              allProjects={allProjects}
              openBlockerModal={openBlockerModal}
              openBlockerManagerModal={openBlockerManagerModal}
              setPromotingTask={setPromotingTask}
            />
          )}

          {currentView.type === "blocked" && (
            <BlockedView
              uid={user.uid}
              allTasks={allTasks}
              allBlockers={allBlockers}
              allProjects={allProjects}
              openBlockerManagerModal={openBlockerManagerModal}
              setPromotingTask={setPromotingTask}
              setCurrentView={setCurrentView}
            />
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
