// src/components/ClientModal.tsx
import { useState, useEffect, useRef } from 'react';
import { Modal } from './shared/Modal';
import type { Client } from '../types';

interface ClientModalProps {
  uid: string;
  client?: Client | null;
  prefillName?: string;
  onSave: (data: Omit<Client, 'id' | 'createdAt' | 'updatedAt' | 'active'>) => Promise<void>;
  onClose: () => void;
}

export function ClientModal({ client, prefillName, onSave, onClose }: ClientModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    billingNotes: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const contactNameRef = useRef<HTMLInputElement>(null);

  // Format phone number as user types
  const formatPhoneNumber = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');
    
    // Format as (XXX) XXX-XXXX
    if (digits.length <= 3) {
      return digits;
    } else if (digits.length <= 6) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    } else {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setFormData({ ...formData, contactPhone: formatted });
    // Clear error while typing
    if (phoneError) setPhoneError('');
  };

  const isValidEmail = (email: string) => {
    if (!email) return true; // optional field
    // Simple, pragmatic pattern
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const isValidUsPhone = (phone: string) => {
    if (!phone) return true; // optional field
    return /^\(\d{3}\) \d{3}-\d{4}$/.test(phone);
  };

  useEffect(() => {
    if (client) {
      setFormData({
        name: client.name || '',
        contactName: client.contactName || '',
        contactEmail: client.contactEmail || '',
        contactPhone: client.contactPhone || '',
        billingNotes: client.billingNotes || '',
      });
    } else if (prefillName) {
      setFormData({
        name: prefillName,
        contactName: '',
        contactEmail: '',
        contactPhone: '',
        billingNotes: '',
      });
      // Focus the contact name field after prefilling the name
      setTimeout(() => {
        contactNameRef.current?.focus();
      }, 100);
    }
  }, [client, prefillName]);

  const validate = () => {
    let ok = true;
    setEmailError('');
    setPhoneError('');

    if (!formData.name.trim()) {
      setError('Client name is required');
      ok = false;
    } else {
      setError('');
    }

    if (!isValidEmail(formData.contactEmail)) {
      setEmailError('Please enter a valid email (e.g., name@example.com)');
      ok = false;
    }

    // Enforce full US number if any digits entered
    const hasAnyDigits = /\d/.test(formData.contactPhone);
    if (hasAnyDigits && !isValidUsPhone(formData.contactPhone)) {
      setPhoneError('Enter a 10-digit US number as (555) 123-4567');
      ok = false;
    }

    return ok;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setSaving(true);
      await onSave(formData);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save client');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={true} onClose={onClose} widthClass="max-w-2xl">
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-white mb-6">
          {client ? 'Edit Client' : 'Add New Client'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Client Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Client Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-cyan-500"
              placeholder="Enter client name"
              autoFocus={!prefillName}
            />
            {error && !formData.name.trim() && (
              <div className="mt-1 text-xs text-red-400">{error}</div>
            )}
          </div>

          {/* Contact Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Contact Name
            </label>
            <input
              ref={contactNameRef}
              type="text"
              value={formData.contactName}
              onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-cyan-500"
              placeholder="Enter contact name"
            />
          </div>

          {/* Contact Email */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Contact Email
            </label>
            <input
              type="email"
              value={formData.contactEmail}
              onChange={(e) => {
                setFormData({ ...formData, contactEmail: e.target.value });
                if (emailError) setEmailError('');
              }}
              className={`w-full px-3 py-2 rounded-lg bg-white/5 border text-white focus:outline-none focus:border-cyan-500 ${emailError ? 'border-red-500/60' : 'border-white/10'}`}
              placeholder="contact@example.com"
            />
            {emailError && (
              <div className="mt-1 text-xs text-red-400">{emailError}</div>
            )}
          </div>

          {/* Contact Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Contact Phone
            </label>
            <input
              type="tel"
              value={formData.contactPhone}
              onChange={handlePhoneChange}
              className={`w-full px-3 py-2 rounded-lg bg-white/5 border text-white focus:outline-none focus:border-cyan-500 ${phoneError ? 'border-red-500/60' : 'border-white/10'}`}
              placeholder="(555) 123-4567"
              maxLength={14}
            />
            {phoneError && (
              <div className="mt-1 text-xs text-red-400">{phoneError}</div>
            )}
          </div>

          {/* Billing Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Billing Notes
            </label>
            <textarea
              value={formData.billingNotes}
              onChange={(e) => setFormData({ ...formData, billingNotes: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-cyan-500 min-h-[80px]"
              placeholder="Any billing-related notes..."
            />
          </div>

          {/* Error Message */}
          {error && formData.name.trim() && !emailError && !phoneError && (
            <div className="text-red-400 text-sm">{error}</div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-white/5 text-white hover:bg-white/10 transition-colors"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-cyan-500 text-white hover:bg-cyan-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={saving}
            >
              {saving ? 'Saving...' : client ? 'Save Changes' : 'Add Client'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
