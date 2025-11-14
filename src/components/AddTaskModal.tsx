import React, { useState } from 'react';
import { Modal } from './shared/Modal';
import type { WithId, Project, Task } from '../types';
import { createTask } from '../services/tasks';

type Props = {
  uid: string;
  open: boolean;
  onClose: () => void;
  allProjects?: WithId<Project>[];
  teamMemberId?: string;
  teamMembers?: { id: string; name: string; active?: boolean }[];
  onCreated?: (id: string) => void;
};

export const AddTaskModal: React.FC<Props> = ({ uid, open, onClose, allProjects = [], teamMemberId, teamMembers = [], onCreated }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<number>(50);
  const [dueDate, setDueDate] = useState('');
  const [assignee, setAssignee] = useState('');
  const [projectId, setProjectId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  return (
    <Modal open={true} onClose={onClose} widthClass="max-w-4xl" noFrame={true}>
      <div className="max-w-4xl mx-auto bg-[rgba(20,20,30,0.95)] backdrop-blur-sm rounded-xl shadow-lg overflow-hidden relative border border-white/10 p-4">
        <h2 className="text-xl font-semibold mb-3 text-brand-text">Add Task</h2>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!title.trim()) return;
            setSubmitting(true);
            try {
              const options: any = {
                description: description || '',
                priority,
                dueDate: dueDate || null,
                assignee: assignee || undefined,
              };
              const newId = await createTask(uid, title.trim(), projectId || null, options, teamMemberId || undefined);
              setSubmitting(false);
              setTitle(''); setDescription(''); setPriority(50); setDueDate(''); setAssignee(''); setProjectId('');
              if (onCreated) onCreated(newId);
              onClose();
            } catch (err) {
              console.error('Failed to create task', err);
              setSubmitting(false);
            }
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-brand-text mb-1">Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus className="w-full px-3 py-2 rounded bg-transparent border border-white/10 text-brand-text focus:ring-2 focus:ring-brand-cyan" />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text mb-1">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-3 py-2 rounded bg-gray-800/40 border border-white/10 text-brand-text focus:ring-2 focus:ring-brand-cyan" rows={3} />
          </div>
            <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs text-brand-text mb-1">Project</label>
              <select className="w-full bg-[rgba(20,20,30,0.95)] text-brand-text border border-white/10 rounded px-2 py-1.5 text-sm" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                <option value="">— No Project —</option>
                {allProjects.map(p => (<option key={p.id} value={p.id}>{p.title}</option>))}
              </select>
            </div>
            <div className="w-48">
              <label className="block text-xs text-brand-text mb-1">Due Date</label>
              <input type="date" className="w-full bg-gray-800/40 text-brand-text border border-white/10 rounded px-2 py-1.5 text-sm" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <div className="w-48 flex items-center gap-2">
              <div className="flex-1">
                <label className="block text-xs text-brand-text mb-1">Priority</label>
                <input type="range" min={0} max={100} value={priority} onChange={(e) => setPriority(Number(e.target.value))} className="w-full h-2" />
              </div>
              <div className="w-16">
                <label className="block text-xs text-brand-text mb-1">Value</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={priority}
                  onChange={(e) => setPriority(Math.max(0, Math.min(100, Number(e.target.value || 0))))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      (e.target as HTMLInputElement).blur();
                    }
                    if (e.key === 'Escape') {
                      setPriority(50);
                      (e.target as HTMLInputElement).blur();
                    }
                  }}
                  className="w-full text-center text-sm font-bold text-white bg-transparent border border-white/10 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-brand-cyan"
                />
              </div>
            </div>
            <div className="w-48">
              <label className="block text-xs text-brand-text mb-1">Assignee</label>
              <select className="w-full bg-[rgba(20,20,30,0.95)] text-brand-text border border-white/10 rounded px-2 py-1.5 text-sm" value={assignee} onChange={(e) => setAssignee(e.target.value)}>
                <option value="">— Unassigned —</option>
                {teamMembers?.filter(m => m.active !== false).map(m => (<option key={m.id} value={m.name}>{m.name}</option>))}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-3 py-2 bg-gray-800/40 text-brand-text rounded border border-white/10">Cancel</button>
            <button type="submit" disabled={submitting} className="px-4 py-2 bg-brand-cyan text-black rounded font-medium">{submitting ? 'Creating…' : 'Create Task'}</button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default AddTaskModal;
