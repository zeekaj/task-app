// Profile Modal - For users to edit their own profile
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { TeamMember } from '../types';

interface ProfileModalProps {
  member: TeamMember & { id: string };
  onClose: () => void;
  onSave: (updates: Partial<TeamMember>) => Promise<void>;
}

export function ProfileModal({ member, onClose, onSave }: ProfileModalProps) {
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    name: member.name || '',
    email: member.email || '',
    phone: member.phone || '',
    title: member.title || '',
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    nameInputRef.current?.focus();
  }, []);

  const formatPhoneNumber = (value: string): string => {
    const digits = value.replace(/\D/g, '');
    if (digits.length === 0) return '';
    if (digits.length <= 3) return `(${digits}`;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    if (digits.length <= 10) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string): boolean => {
    if (!phone.trim()) return true;
    const digitsOnly = phone.replace(/\D/g, '');
    return digitsOnly.length === 10;
  };

  const handlePhoneChange = (value: string) => {
    const formatted = formatPhoneNumber(value);
    setFormData({ ...formData, phone: formatted });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      alert('Name is required');
      return;
    }
    if (!formData.email.trim()) {
      alert('Email is required');
      return;
    }
    if (!validateEmail(formData.email)) {
      alert('Please enter a valid email address');
      return;
    }
    if (formData.phone && !validatePhone(formData.phone)) {
      alert('Please enter a valid 10-digit phone number');
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim() || undefined,
        title: formData.title.trim() || undefined,
      });
      onClose();
    } catch (error) {
      console.error('Failed to save profile:', error);
      alert('Failed to save profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return createPortal(
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="bg-gray-800/95 backdrop-blur-md rounded-xl border border-white/10 p-6 w-full max-w-md shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Edit Profile</h2>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-white text-2xl transition-colors"
            disabled={isSaving}
          >
            ×
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-300">
              Full Name <span className="text-red-400">*</span>
            </label>
            <input
              ref={nameInputRef}
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 bg-gray-800/40 rounded-lg border border-white/10 focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan focus:outline-none text-brand-text transition-all"
              required
              disabled={isSaving}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-300">
              Email <span className="text-red-400">*</span>
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-3 bg-gray-800/40 rounded-lg border border-white/10 focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan focus:outline-none text-brand-text transition-all"
              required
              disabled={isSaving}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-300">
              Phone
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => handlePhoneChange(e.target.value)}
              placeholder="(555) 123-4567"
              maxLength={14}
              className="w-full px-4 py-3 bg-gray-800/40 rounded-lg border border-white/10 focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan focus:outline-none text-brand-text transition-all"
              disabled={isSaving}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-300">
              Job Title
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Audio Engineer, Stage Manager"
              className="w-full px-4 py-3 bg-gray-800/40 rounded-lg border border-white/10 focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan focus:outline-none text-brand-text transition-all"
              disabled={isSaving}
            />
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 rounded-lg border border-white/20 text-gray-300 hover:bg-white/5 transition-all"
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-brand-cyan to-blue-500 text-white font-medium hover:from-brand-cyan/90 hover:to-blue-500/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
