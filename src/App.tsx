// src/App.tsx - Redesigned with top navigation and email/password auth
import { useState, useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import { useOrganizationId } from "./hooks/useOrganization";
import { getTeamMemberByUserId, signOutUser } from "./services/auth";
import { AppLayout } from "./components/layout/AppLayout";
import { DashboardView } from "./components/views/DashboardView";
import { TeamView } from "./components/views/TeamView";
import { TasksView } from "./components/views/TasksView";
import { ProjectsView } from "./components/views/ProjectsView";
import { SettingsView } from "./components/views/SettingsView";
import { StyleGuideView } from "./components/views/StyleGuideView";
import { ScheduleView } from "./components/views/ScheduleView";
import { LoginView } from "./components/views/LoginView";
import { FirstTimePasswordView } from "./components/views/FirstTimePasswordView";
import { ToastProvider } from "./components/shared/Toast";
import type { TeamMember, Notification, WithId } from "./types";
import { upsertOrgMembership } from "./services/organizations";
import { updateTeamMember, findTeamMemberByOrgAndEmail } from "./services/teamMembers";
import { DevRoleSwitcher } from "./components/DevRoleSwitcher";
import { UserContextProvider } from "./hooks/useUserContext";

type TabView = 'dashboard' | 'team' | 'tasks' | 'projects' | 'schedule' | 'settings' | 'style-guide';
type AuthView = 'login' | 'first-time-password';

const App = () => {
  return (
    <UserContextProvider>
      <ToastProvider>
        <Routes>
          <Route path="/*" element={<MainApp />} />
        </Routes>
      </ToastProvider>
    </UserContextProvider>
  );
};

function MainApp() {
  const user = useAuth();
  const { orgId } = useOrganizationId();
  const [teamMember, setTeamMember] = useState<(TeamMember & { id: string }) | null | undefined>(undefined);
  const [realTeamMember, setRealTeamMember] = useState<(TeamMember & { id: string }) | null | undefined>(undefined);
  const [impersonatedMember, setImpersonatedMember] = useState<WithId<TeamMember> | null>(null);
  const [authView, setAuthView] = useState<AuthView>('login');
  // Reserved hook for future first-time setup flow was removed to satisfy lint (no-unused-vars)
  
  console.log('MainApp render, user:', user?.uid, 'orgId:', orgId, 'activeTab:', localStorage.getItem('activeTab'), 'impersonated:', impersonatedMember?.name);
  
  // Load active tab from localStorage, default to 'dashboard'
  const [activeTab, setActiveTab] = useState<TabView>(() => {
    const saved = localStorage.getItem('activeTab');
    return (saved as TabView) || 'dashboard';
  });

  // Handle notification clicks - navigate to related project
  const handleNotificationClick = (notification: Notification & { id: string }) => {
    if (notification.entityType === 'project' && notification.entityId) {
      // Switch to projects tab
      setActiveTab('projects');
      // Store the project ID to open in ProjectsView
      localStorage.setItem('openProjectId', notification.entityId);
    }
  };

  // Save active tab to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('activeTab', activeTab);
  }, [activeTab]);

  // Check if user has team member record
  useEffect(() => {
    // Avoid flicker: don't change teamMember while auth is still resolving
    if (user === undefined) {
      setTeamMember(undefined);
      setRealTeamMember(undefined);
      return;
    }
    if (user) {
      (async () => {
        let member = await getTeamMemberByUserId(user.uid);
        // Fallback: if no linked record, try to locate the org owner record by email under orgId=user.uid and link it
        if (!member) {
          const email = (user.email || '').toLowerCase();
          if (email) {
            const candidate = await findTeamMemberByOrgAndEmail(user.uid, email);
            if (candidate) {
              // Optimistically treat as authorized to avoid flicker
              member = candidate as any;
              // Ensure membership mirror first (rules allow org owner by UID)
              try {
                await upsertOrgMembership(candidate.organizationId, user.uid, (candidate.role as any) || 'owner', true);
              } catch (_) {
                // best-effort mirror; safe to ignore
              }
              // Then link the document to this user
              try {
                await updateTeamMember(candidate.id, { userId: user.uid });
                member = { ...candidate, userId: user.uid } as any;
              } catch (_) {
                // best-effort link; safe to ignore
              }
            }
          }
        }
        // Auto-upgrade to Owner if this user is the org owner but role isn't 'owner'
        if (member && member.organizationId === user.uid && member.role !== 'owner') {
          try {
            await updateTeamMember(member.id, { role: 'owner', title: member.title || 'Organization Owner' });
            member.role = 'owner' as any;
          } catch (_) {
            // role sync is non-critical here
          }
        }
        setRealTeamMember(member);
        // If not impersonating, use the real member
        if (!impersonatedMember) {
          setTeamMember(member);
        }
        // Ensure org membership mirror exists for security rules
        if (member && member.organizationId && member.role) {
          try {
            await upsertOrgMembership(member.organizationId, user.uid, member.role as any, true);
          } catch (_e) {
            // No-op: this is a best-effort mirror write
          }
        }
      })();
    } else {
      // user explicitly signed out
      setTeamMember(null);
      setRealTeamMember(null);
    }
  }, [user, impersonatedMember]);

  // Handle dev mode impersonation
  const handleSwitchUser = (member: WithId<TeamMember>) => {
    setImpersonatedMember(member);
    setTeamMember(member);
  };

  const handleResetToReal = () => {
    setImpersonatedMember(null);
    setTeamMember(realTeamMember);
  };

  const handleLoginSuccess = () => {
    // User state will update via useAuth hook
    // Team member check will trigger via useEffect
  };

  const handlePasswordCreated = () => {
    // User state will update via useAuth hook
    setAuthView('login');
  };

  // Loading state - waiting for auth
  if (user === undefined) {
    return (
      <ToastProvider>
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-2xl mb-4 shadow-lg shadow-cyan-500/20 animate-pulse">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div className="text-white text-lg">Loading...</div>
          </div>
        </div>
      </ToastProvider>
    );
  }

  // Not authenticated - show login or first-time password view
  if (user === null) {
    return (
      <>
        {authView === 'login' ? (
          <LoginView 
            onLoginSuccess={handleLoginSuccess}
          />
        ) : (
          <FirstTimePasswordView
            email="" // Will be set when first-time flow is implemented
            onPasswordCreated={handlePasswordCreated}
            onBackToLogin={() => setAuthView('login')}
          />
        )}
      </>
    );
  }

  // Authenticated but checking team member status
  if (teamMember === undefined) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-2xl mb-4 shadow-lg shadow-cyan-500/20 animate-pulse">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div className="text-white text-lg">Verifying access...</div>
        </div>
      </div>
    );
  }

  // Authenticated but no team member record - unauthorized
  if (teamMember === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="w-full max-w-md px-6">
          <div className="bg-gray-800 rounded-2xl shadow-2xl p-8 border border-gray-700">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-red-500/10 border-2 border-red-500/30 rounded-2xl mb-4">
                <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
              <p className="text-gray-400 mb-6">
                You are not authorized to access this application.
              </p>
              <p className="text-gray-500 text-sm mb-6">
                Your account is not associated with any team. Please contact your administrator to request access.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <button
                onClick={async () => {
                  await signOutUser();
                  setTeamMember(null);
                }}
                className="w-full py-3 bg-gray-600 hover:bg-gray-500 rounded-lg font-medium text-white transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Authorized - show main app
  let viewContent;
  switch (activeTab) {
    case 'dashboard':
      viewContent = <DashboardView uid={orgId || user.uid} />;
      break;
    case 'team':
      viewContent = <TeamView uid={orgId || user.uid} />;
      break;
    case 'tasks':
      viewContent = <TasksView uid={orgId || user.uid} />;
      break;
    case 'projects':
      viewContent = <ProjectsView uid={orgId || user.uid} />;
      break;
    case 'schedule':
      viewContent = <ScheduleView uid={orgId || user.uid} />;
      break;
    case 'settings':
      viewContent = <SettingsView uid={orgId || user.uid} />;
      break;
    case 'style-guide':
      viewContent = <StyleGuideView uid={orgId || user.uid} />;
      break;
    default:
      viewContent = <DashboardView uid={orgId || user.uid} />;
  }

  return (
    <AppLayout
      activeTab={activeTab}
      onTabChange={(tab) => setActiveTab(tab as TabView)}
      account={{
        name: teamMember?.name || user.displayName || (user.email ? user.email.split('@')[0] : undefined),
        email: user.email || undefined,
        avatarUrl: teamMember?.avatar,
  role: teamMember?.role,
        title: teamMember?.title,
      }}
      uid={user.uid}
      organizationId={orgId}
      onNotificationClick={handleNotificationClick}
      onSignOut={async () => { await signOutUser(); }}
    >
      {viewContent}
      
      {/* Development-only role switcher */}
      <DevRoleSwitcher
        currentUserId={user.uid}
        currentMember={realTeamMember || null}
        onSwitchUser={handleSwitchUser}
        onResetToReal={handleResetToReal}
      />
    </AppLayout>
  );
};

export default App;
