// src/components/views/ClientsView.tsx
import { useState } from 'react';
import { Card } from '../ui/Card';
import { Modal } from '../shared/Modal';
import { useClients } from '../../hooks/useClients';
import { createClient, updateClient, deleteClient } from '../../services/clients';
import { useToast } from '../shared/Toast';
import type { Client, WithId } from '../../types';

interface ClientsViewProps {
  uid: string;
}

export function ClientsView({ uid }: ClientsViewProps) {
  const [clients, refetchClients] = useClients(uid);
  const toast = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<WithId<Client> | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<{ id: string; name: string } | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [billingNotes, setBillingNotes] = useState('');

  const resetForm = () => {
    setName('');
    setContactName('');
    setContactEmail('');
    setContactPhone('');
    setBillingNotes('');
  };

  const validateEmail = (email: string): boolean => {
    if (!email.trim()) return true; // Empty is valid (optional field)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const formatPhoneNumber = (value: string): string => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');
    
    // Don't format if empty
    if (digits.length === 0) return '';
    
    // Format as (123) 456-7890
    if (digits.length <= 3) {
      return `(${digits}`;
    } else if (digits.length <= 6) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    } else if (digits.length <= 10) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    } else {
      // Limit to 10 digits
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
    }
  };

  const handlePhoneChange = (value: string) => {
    const formatted = formatPhoneNumber(value);
    setContactPhone(formatted);
  };

  const validatePhone = (phone: string): boolean => {
    if (!phone.trim()) return true; // Empty is valid (optional field)
    const digitsOnly = phone.replace(/\D/g, '');
    return digitsOnly.length === 10;
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error('Client name is required');
      return;
    }
    if (contactEmail.trim() && !validateEmail(contactEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }
    if (contactPhone.trim() && !validatePhone(contactPhone)) {
      toast.error('Please enter a valid 10-digit phone number');
      return;
    }
    try {
      const clientData: any = {
        name: name.trim(),
        active: true,
      };
      // Only include optional fields if they have values (Firestore doesn't accept undefined)
      if (contactName.trim()) clientData.contactName = contactName.trim();
      if (contactEmail.trim()) clientData.contactEmail = contactEmail.trim();
      if (contactPhone.trim()) clientData.contactPhone = contactPhone.trim();
      if (billingNotes.trim()) clientData.billingNotes = billingNotes.trim();
      
      await createClient(uid, clientData);
      toast.success('Client created');
      resetForm();
      setCreateOpen(false);
      refetchClients(); // Refresh the list
    } catch (err) {
      console.error('Failed to create client:', err);
      toast.error('Failed to create client');
    }
  };

  const handleEdit = (client: WithId<Client>) => {
    setEditingClient(client);
    setName(client.name || '');
    setContactName(client.contactName || '');
    setContactEmail(client.contactEmail || '');
    setContactPhone(client.contactPhone || '');
    setBillingNotes(client.billingNotes || '');
  };

  const handleUpdate = async () => {
    if (!editingClient || !name.trim()) {
      toast.error('Client name is required');
      return;
    }
    if (contactEmail.trim() && !validateEmail(contactEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }
    if (contactPhone.trim() && !validatePhone(contactPhone)) {
      toast.error('Please enter a valid 10-digit phone number');
      return;
    }
    try {
      const updates: any = {
        name: name.trim(),
      };
      // Only include optional fields if they have values (Firestore doesn't accept undefined)
      if (contactName.trim()) updates.contactName = contactName.trim();
      if (contactEmail.trim()) updates.contactEmail = contactEmail.trim();
      if (contactPhone.trim()) updates.contactPhone = contactPhone.trim();
      if (billingNotes.trim()) updates.billingNotes = billingNotes.trim();
      
      await updateClient(uid, editingClient.id, updates);
      toast.success('Client updated');
      resetForm();
      setEditingClient(null);
      refetchClients(); // Refresh the list
    } catch (err) {
      toast.error('Failed to update client');
    }
  };

  const handleDeleteRequest = (client: WithId<Client>) => {
    setClientToDelete({ id: client.id, name: client.name });
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!clientToDelete) return;
    try {
      await deleteClient(uid, clientToDelete.id);
      toast.success(`Deleted ${clientToDelete.name}`);
      setDeleteConfirmOpen(false);
      setClientToDelete(null);
      refetchClients(); // Refresh the list
    } catch (err) {
      toast.error('Failed to delete client');
    }
  };

  if (!clients) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-400">Loading clients...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Clients</h2>
        <button
          onClick={() => setCreateOpen(true)}
          className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg font-medium hover:from-cyan-600 hover:to-blue-600 transition-all duration-200"
        >
          + New Client
        </button>
      </div>

      {clients.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-800 rounded-xl mx-auto mb-4 flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-white mb-2">No clients yet</h3>
            <p className="text-gray-400 mb-6">Add clients to associate with your projects</p>
            <button
              onClick={() => setCreateOpen(true)}
              className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg font-medium hover:from-cyan-600 hover:to-blue-600 transition-all duration-200"
            >
              Add Client
            </button>
          </div>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Name</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Contact</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Email</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Phone</th>
                <th className="w-24"></th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr 
                  key={client.id} 
                  onClick={() => handleEdit(client)}
                  className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <td className="py-3 px-4">
                    <div className="font-medium text-white">{client.name}</div>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-400">{client.contactName || '—'}</td>
                  <td className="py-3 px-4 text-sm text-gray-400">{client.contactEmail || '—'}</td>
                  <td className="py-3 px-4 text-sm text-gray-400">{client.contactPhone || '—'}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(client);
                        }}
                        className="p-1.5 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 rounded transition-colors"
                        title="Edit client"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteRequest(client);
                        }}
                        className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors"
                        title="Delete client"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* Create Modal */}
      <Modal
        open={createOpen}
        onClose={() => {
          setCreateOpen(false);
          resetForm();
        }}
        title="New Client"
        widthClass="max-w-xl"
        footer={
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={() => {
                setCreateOpen(false);
                resetForm();
              }}
              className="px-4 py-2 text-sm font-medium text-gray-300 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={!name.trim()}
              className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${
                !name.trim() ? 'bg-white/10 cursor-not-allowed' : 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600'
              }`}
            >
              Create
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Client Name *</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Client name"
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Contact Name</label>
            <input
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="Primary contact person"
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Contact Email</label>
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="email@example.com"
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Contact Phone</label>
            <input
              type="tel"
              value={contactPhone}
              onChange={(e) => handlePhoneChange(e.target.value)}
              placeholder="(555) 123-4567"
              maxLength={14}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Billing Notes</label>
            <textarea
              value={billingNotes}
              onChange={(e) => setBillingNotes(e.target.value)}
              placeholder="Special billing instructions or notes"
              rows={3}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            />
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      {editingClient && (
        <Modal
          open={!!editingClient}
          onClose={() => {
            setEditingClient(null);
            resetForm();
          }}
          title="Edit Client"
          widthClass="max-w-xl"
          footer={
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setEditingClient(null);
                  resetForm();
                }}
                className="px-4 py-2 text-sm font-medium text-gray-300 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdate}
                disabled={!name.trim()}
                className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${
                  !name.trim() ? 'bg-white/10 cursor-not-allowed' : 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600'
                }`}
              >
                Update
              </button>
            </div>
          }
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Client Name *</label>
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Client name"
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Contact Name</label>
              <input
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Primary contact person"
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Contact Email</label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="email@example.com"
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Contact Phone</label>
              <input
                type="tel"
                value={contactPhone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                placeholder="(555) 123-4567"
                maxLength={14}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Billing Notes</label>
              <textarea
                value={billingNotes}
                onChange={(e) => setBillingNotes(e.target.value)}
                placeholder="Special billing instructions or notes"
                rows={3}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              />
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmOpen && clientToDelete && (
        <div
          className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50"
          onClick={() => setDeleteConfirmOpen(false)}
        >
          <div
            className="bg-gray-800 rounded-lg border border-gray-700 shadow-2xl max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Delete Client?</h2>
              <p className="text-gray-300 mb-6">
                Are you sure you want to delete <span className="font-semibold text-white">{clientToDelete.name}</span>? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirmOpen(false)}
                  className="flex-1 px-6 py-3 bg-gray-600 hover:bg-gray-500 rounded-lg font-medium text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg font-medium text-white transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
