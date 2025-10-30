// Settings View - App customization (Roles, Skills, Priorities, Statuses)
import { useState } from 'react';
import { PillTabs } from '../ui/PillTabs';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';

interface SettingsViewProps {
  uid: string;
}

export function SettingsView({ uid }: SettingsViewProps) {
  void uid;
  const [activeTab, setActiveTab] = useState('roles');

  const tabs = [
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
          <h1 className="text-3xl font-bold text-white">App Customization</h1>
        </div>
  <p className="text-gray-400">{"Configure roles, skills, priorities, and statuses to match your team's workflow."}</p>
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
