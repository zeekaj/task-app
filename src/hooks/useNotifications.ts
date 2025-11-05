// src/hooks/useNotifications.ts
import { useState, useEffect } from 'react';
import { subscribeToNotifications } from '../services/notifications';
import type { Notification } from '../types';

export function useNotifications(organizationId: string | null, userId: string): (Notification & { id: string })[] {
  const [notifications, setNotifications] = useState<(Notification & { id: string })[]>([]);

  useEffect(() => {
    if (!organizationId || !userId) {
      setNotifications([]);
      return;
    }

    const unsubscribe = subscribeToNotifications(organizationId, userId, setNotifications);
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [organizationId, userId]);

  return notifications;
}

export function useUnreadNotifications(organizationId: string | null, userId: string): (Notification & { id: string })[] {
  const notifications = useNotifications(organizationId, userId);
  return notifications.filter(n => !n.read);
}
