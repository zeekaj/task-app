// Settings View - App customization (Roles, Skills, Priorities, Statuses)
import { useState, useEffect } from 'react';
import { listJobTitles, createJobTitle, updateJobTitle, deleteJobTitle } from '../../services/jobTitles';
import { PillTabs } from '../ui/PillTabs';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { ClientsView } from './ClientsView';
import { VenuesView } from './VenuesView';
import { TeamView } from './TeamView';
import { useUserContext } from '../../hooks/useUserContext';

interface SettingsViewProps {
  uid: string;
}

export function SettingsView({ uid }: SettingsViewProps) {
  const { role } = useUserContext();
  const isAdmin = role === 'owner' || role === 'admin';
  const isTechnician = role === 'technician';
  const [activeTab, setActiveTab] = useState(isAdmin ? 'team' : 'clients');
  const [jobTitles, setJobTitles] = useState<{ id: string; name: string; active: boolean }[]>([]);
  const [newJobTitle, setNewJobTitle] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  useEffect(() => {
    if (activeTab === 'jobTitles') {
      listJobTitles(uid).then((titles) => setJobTitles(titles.map(jt => ({ id: jt.id || '', name: jt.name, active: jt.active }))));
    }
  }, [activeTab, uid]);

  const baseTabs = [
    {
      id: 'clients',
      label: 'Clients',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      )
    },
    {
      id: 'venues',
      label: 'Venues',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    }
  ];

  const adminTabs = [
    {
      id: 'team',
      label: 'Team Management',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      )
    },
    {
      id: 'roles',
      label: 'Team Roles',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      )
    },
    {
      id: 'jobTitles',
      label: 'Job Titles',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 01-8 0M12 3v4m0 0a4 4 0 014 4v4a4 4 0 01-8 0V7a4 4 0 014-4z" />
        </svg>
      )
    },
    {
      id: 'skills',
      label: 'Skills',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      )
    },
    {
      id: 'priorities',
      label: 'Priorities',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      )
    },
    {
      id: 'statuses',
      label: 'Statuses',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    }
  ];

  const restrictedForTechnicians = new Set(['roles', 'jobTitles', 'skills', 'priorities', 'statuses']);
  const tabs = [
    ...(isAdmin ? [adminTabs[0]] : []), // team management
    ...baseTabs,
    ...(isAdmin ? adminTabs.slice(1) : []),
  ].filter(tab => !(isTechnician && restrictedForTechnicians.has(tab.id)));

  // If role changes or tab becomes restricted, ensure we land on an allowed tab
  useEffect(() => {
    if (isTechnician && restrictedForTechnicians.has(activeTab)) {
      setActiveTab('clients');
    }
  }, [isTechnician, activeTab]);

  // Role legend (informational)
  const sampleRoles = [
    { name: 'Owner', color: 'purple' as const, note: 'Full control' },
    { name: 'Admin', color: 'red' as const, note: 'Manage team & data' },
    { name: 'Technician', color: 'blue' as const, note: 'Standard contributor' },
    { name: 'Freelance', color: 'cyan' as const, note: 'Read-only' },
    { name: 'Viewer', color: 'gray' as const, note: 'Read-only (scoped)' }
  ];

  const sampleSkills = [
    { name: 'Audio', color: 'blue' as const },
    { name: 'Graphic Design', color: 'purple' as const },
    { name: 'Truck Driving', color: 'green' as const },
    { name: 'Video', color: 'yellow' as const },
    { name: 'Rigging', color: 'blue' as const },
    { name: 'Lighting', color: 'orange' as const },
    { name: 'Stage Design', color: 'cyan' as const },
    { name: 'Electric', color: 'purple' as const }
  ];

  const samplePriorities = [
    { name: 'Low', color: 'blue' as const },
    { name: 'Medium', color: 'yellow' as const },
    { name: 'High', color: 'orange' as const },
    { name: 'Critical', color: 'red' as const }
  ];

  const sampleStatuses = [
    { name: 'Backlog', color: 'gray' as const },
    { name: 'In Progress', color: 'blue' as const },
    { name: 'Review', color: 'purple' as const },
    { name: 'Completed', color: 'green' as const }
  ];

  const renderContent = () => {
    if (isTechnician && restrictedForTechnicians.has(activeTab)) {
      return <ClientsView uid={uid} />;
    }
    if (activeTab === 'team' && isAdmin) {
      return <TeamView uid={uid} />;
    }
    if (activeTab === 'clients') {
      return <ClientsView uid={uid} />;
    }
    if (activeTab === 'venues') {
      return <VenuesView uid={uid} />;
    }
    if (activeTab === 'jobTitles') {
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">Job Titles</h2>
              <p className="text-sm text-gray-400 mt-1">Manage the job titles available for assignment and scheduling.</p>
            </div>
            <div className="flex gap-2">
              <input
                value={newJobTitle}
                onChange={e => setNewJobTitle(e.target.value)}
                placeholder="Add new job title"
                className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              />
              <button
                className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg font-medium hover:from-cyan-600 hover:to-blue-600 transition-all duration-200 text-sm"
                disabled={!newJobTitle.trim()}
                onClick={async () => {
                  if (!newJobTitle.trim()) return;
                  await createJobTitle(uid, newJobTitle.trim());
                  setNewJobTitle('');
                  const titles = await listJobTitles(uid);
                  setJobTitles(titles.map(jt => ({ id: jt.id || '', name: jt.name, active: jt.active })));
                }}
              >+ Add</button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {jobTitles.map((jt) => (
              <Card key={jt.id} padding="md" hover className="flex items-center justify-between">
                {editingId === jt.id ? (
                  <div className="flex items-center gap-2 w-full">
                    <input
                      value={editingName}
                      onChange={e => setEditingName(e.target.value)}
                      className="px-2 py-1 rounded bg-white/10 text-white w-full"
                    />
                    <button className="text-green-400 px-2" onClick={async () => {
                      await updateJobTitle(uid, jt.id, { name: editingName });
                      setEditingId(null);
                      setEditingName('');
                      const titles = await listJobTitles(uid);
                      setJobTitles(titles.map(jt => ({ id: jt.id || '', name: jt.name, active: jt.active })));
                    }}>Save</button>
                    <button className="text-gray-400 px-2" onClick={() => { setEditingId(null); setEditingName(''); }}>Cancel</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <Badge color="cyan" size="md">{jt.name}</Badge>
                  </div>
                )}
                <div className="flex gap-2">
                  {editingId !== jt.id && (
                    <button className="text-blue-400 px-2" onClick={() => { setEditingId(jt.id); setEditingName(jt.name); }}>Edit</button>
                  )}
                  <button className="text-red-400 px-2" onClick={async () => {
                    await deleteJobTitle(uid, jt.id);
                    const titles = await listJobTitles(uid);
                    setJobTitles(titles.map(jt => ({ id: jt.id || '', name: jt.name, active: jt.active })));
                  }}>Delete</button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      );
    }
    switch (activeTab) {
      case 'roles':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white">Team Roles</h2>
                <p className="text-sm text-gray-400 mt-1">Define the roles available for your team members.</p>
              </div>
              <button className="px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg font-medium hover:from-purple-600 hover:to-purple-700 transition-all duration-200 text-sm">
                + Add Role
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {sampleRoles.map((role, idx) => (
                <Card key={idx} padding="md" hover className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge color={role.color} size="md">{role.name}</Badge>
                    <span className="text-sm text-gray-400">{role.note}</span>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        );
      
      case 'skills':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white">Skills</h2>
                <p className="text-sm text-gray-400 mt-1">Define the skills that team members can have and tasks can require.</p>
              </div>
              <button className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-medium hover:from-blue-600 hover:to-blue-700 transition-all duration-200 text-sm">
                + Add Skill
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {sampleSkills.map((skill, idx) => (
                <Card key={idx} padding="md" hover>
                  <Badge color={skill.color} size="md">{skill.name}</Badge>
                </Card>
              ))}
            </div>
          </div>
        );
      
      case 'priorities':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white">Task Priorities</h2>
                <p className="text-sm text-gray-400 mt-1">Define priority levels for your tasks.</p>
              </div>
              <button className="px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg font-medium hover:from-orange-600 hover:to-orange-700 transition-all duration-200 text-sm">
                + Add Priority
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {samplePriorities.map((priority, idx) => (
                <Card key={idx} padding="md" hover>
                  <Badge color={priority.color} size="lg">{priority.name}</Badge>
                </Card>
              ))}
            </div>
          </div>
        );
      
      case 'statuses':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white">Task Statuses</h2>
                <p className="text-sm text-gray-400 mt-1">Define the workflow statuses for your tasks.</p>
              </div>
              <button className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg font-medium hover:from-green-600 hover:to-green-700 transition-all duration-200 text-sm">
                + Add Status
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {sampleStatuses.map((status, idx) => (
                <Card key={idx} padding="md" hover>
                  <Badge color={status.color} size="md">{status.name}</Badge>
                </Card>
              ))}
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white">{activeTab === 'team' ? 'Team Management' : 'App Customization'}</h1>
        </div>
        <p className="text-gray-400">{activeTab === 'team' ? 'Manage your team members and their skills.' : "Configure roles, skills, priorities, and statuses to match your team's workflow."}</p>
      </div>

      {/* Tabs */}
      <PillTabs 
        tabs={tabs} 
        activeTab={activeTab} 
        onChange={setActiveTab}
        variant="secondary"
        size="md"
      />

      {/* Content */}
      <Card padding="lg">
        {renderContent()}
      </Card>
    </div>
  );
}
