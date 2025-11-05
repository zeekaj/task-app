import { getFirebase } from '../firebase';
import type { Notification, NotificationType } from '../types';

/**
 * Create a notification for a user
 */
export async function createNotification(
  organizationId: string,
  recipientId: string,
  type: NotificationType,
  title: string,
  message: string,
  entityType: 'project' | 'task',
  entityId: string,
  entityTitle: string,
  createdBy?: string,
  createdByName?: string
): Promise<string> {
  try {
    const { addDoc, serverTimestamp } = await import('firebase/firestore');
    const fb = await getFirebase();
    const notificationsRef = fb.col(organizationId, 'notifications');
    
    const notification: Omit<Notification, 'id'> = {
      type,
      title,
      message,
      recipientId,
      read: false,
      entityType,
      entityId,
      entityTitle,
      createdAt: serverTimestamp(),
      createdBy,
      createdByName,
    };

    const docRef = await addDoc(notificationsRef, notification);
    return docRef.id;
  } catch (err) {
    const { logError } = await import('../utils/logger');
    logError('createNotification error:', (err as any)?.message ?? err);
    throw err;
  }
}

/**
 * Subscribe to notifications for a user
 */
export function subscribeToNotifications(
  organizationId: string,
  userId: string,
  callback: (notifications: Array<Notification & { id: string }>) => void
): () => void {
  let unsubscribe: (() => void) | null = null;

  (async () => {
    try {
      const { query, where, orderBy, onSnapshot } = await import('firebase/firestore');
      const fb = await getFirebase();
      const notificationsRef = fb.col(organizationId, 'notifications');
      const q = query(
        notificationsRef,
        where('recipientId', '==', userId),
        orderBy('createdAt', 'desc')
      );

      unsubscribe = onSnapshot(q, (snapshot: any) => {
        const notifications = snapshot.docs.map((doc: any) => ({
          id: doc.id,
          ...doc.data()
        } as Notification & { id: string }));
        callback(notifications);
      });
    } catch (err) {
      const { logError } = await import('../utils/logger');
      logError('subscribeToNotifications error:', (err as any)?.message ?? err);
    }
  })();

  return () => {
    if (unsubscribe) unsubscribe();
  };
}

/**
 * Mark a notification as read
 */
export async function markNotificationRead(
  organizationId: string,
  notificationId: string
): Promise<void> {
  try {
    const { doc, updateDoc } = await import('firebase/firestore');
    const fb = await getFirebase();
    const notificationRef = doc(fb.db, 'organizations', organizationId, 'notifications', notificationId);
    await updateDoc(notificationRef, {
      read: true,
    });
  } catch (err) {
    const { logError } = await import('../utils/logger');
    logError('markNotificationRead error:', (err as any)?.message ?? err);
    throw err;
  }
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsRead(
  organizationId: string,
  userId: string
): Promise<void> {
  try {
    const { query, where, getDocs, writeBatch } = await import('firebase/firestore');
    const fb = await getFirebase();
    const notificationsRef = fb.col(organizationId, 'notifications');
    const q = query(
      notificationsRef,
      where('recipientId', '==', userId),
      where('read', '==', false)
    );

    const snapshot = await getDocs(q);
    const batch = writeBatch(fb.db);
    
    snapshot.docs.forEach((doc: any) => {
      batch.update(doc.ref, { read: true });
    });

    await batch.commit();
  } catch (err) {
    const { logError } = await import('../utils/logger');
    logError('markAllNotificationsRead error:', (err as any)?.message ?? err);
    throw err;
  }
}

/**
 * Delete a notification
 */
export async function deleteNotification(
  organizationId: string,
  notificationId: string
): Promise<void> {
  try {
    const firestoreModule: any = await import('firebase/firestore');
    const deleteDoc = firestoreModule.deleteDoc;
    const doc = firestoreModule.doc;
    const fb = await getFirebase();
    const notificationRef = doc(fb.db, 'organizations', organizationId, 'notifications', notificationId);
    await deleteDoc(notificationRef);
  } catch (err) {
    const { logError } = await import('../utils/logger');
    logError('deleteNotification error:', (err as any)?.message ?? err);
    throw err;
  }
}

/**
 * Delete all notifications related to a specific entity (e.g., project)
 */
export async function deleteNotificationsForEntity(
  organizationId: string,
  entityType: 'project' | 'task',
  entityId: string
): Promise<void> {
  try {
    const { query, where, getDocs, writeBatch } = await import('firebase/firestore');
    const fb = await getFirebase();
    const notificationsRef = fb.col(organizationId, 'notifications');
    const q = query(
      notificationsRef,
      where('entityType', '==', entityType),
      where('entityId', '==', entityId)
    );

    const snapshot = await getDocs(q);
    const batch = writeBatch(fb.db);
    
    snapshot.docs.forEach((doc: any) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
  } catch (err) {
    const { logError } = await import('../utils/logger');
    logError('deleteNotificationsForEntity error:', (err as any)?.message ?? err);
    throw err;
  }
}
