// Authentication and authorization services
import { collection, query, where, getDocs, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { getFirestoreClient, getAuth } from '../firebase';
import type { TeamMember } from '../types';

/**
 * Get team member by email from global collection
 */
export async function getTeamMemberByEmail(
  email: string
): Promise<(TeamMember & { id: string }) | null> {
  try {
    const { db } = await getFirestoreClient();
    const membersRef = collection(db, 'teamMembers');
    const q = query(
      membersRef, 
      where('email', '==', email.toLowerCase()), 
      where('active', '==', true)
    );
    
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return null;
    }
    
    const docSnap = snapshot.docs[0];
    return {
      id: docSnap.id,
      ...docSnap.data()
    } as TeamMember & { id: string };
  } catch (error: any) {
    const code = error?.code || error?.name;
    // Quiet common permission errors to avoid noisy console during first login before mirror exists
    if (code !== 'permission-denied' && code !== 'FirebaseError') {
      console.error('Error fetching team member by email:', error);
    }
    return null;
  }
}

/**
 * Get team member by Firebase Auth UID from global collection
 */
export async function getTeamMemberByUserId(
  userId: string
): Promise<(TeamMember & { id: string }) | null> {
  try {
    const { db } = await getFirestoreClient();
    const membersRef = collection(db, 'teamMembers');
    const q = query(
      membersRef,
      where('userId', '==', userId),
      where('active', '==', true)
    );
    
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return null;
    }
    
    const docSnap = snapshot.docs[0];
    return {
      id: docSnap.id,
      ...docSnap.data()
    } as TeamMember & { id: string };
  } catch (error: any) {
    const code = error?.code || error?.name;
    if (code !== 'permission-denied' && code !== 'FirebaseError') {
      console.error('Error fetching team member by user ID:', error);
    }
    return null;
  }
}

/**
 * Link a Firebase Auth user to a team member record and set password flag
 */
export async function linkUserToTeamMember(
  memberId: string,
  userId: string
): Promise<void> {
  try {
    const { db } = await getFirestoreClient();
    const memberRef = doc(db, `teamMembers/${memberId}`);
    
    await updateDoc(memberRef, {
      userId,
      lastLoginAt: serverTimestamp(),
      hasPassword: true,
    });
  } catch (error) {
    console.error('Error linking user to team member:', error);
    throw error;
  }
}

/**
 * Update team member's last login timestamp
 */
export async function updateLastLogin(
  memberId: string
): Promise<void> {
  try {
    const { db } = await getFirestoreClient();
    const memberRef = doc(db, `teamMembers/${memberId}`);
    
    await updateDoc(memberRef, {
      lastLoginAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating last login:', error);
    throw error;
  }
}

/**
 * Sign in with email and password
 */
export async function signInWithEmail(email: string, password: string) {
  try {
    const authContext = await getAuth();
    
    const userCredential = await authContext.signInWithEmailAndPassword(authContext.auth, email, password);
    
    // Update last login
    const member = await getTeamMemberByEmail(email);
    if (member) {
      await updateLastLogin(member.id);
    }
    
    return { user: userCredential.user, error: null };
  } catch (error: any) {
    console.error('Sign in error:', error);
    return { user: null, error: error.message || 'Failed to sign in' };
  }
}

/**
 * Create password for first-time user
 */
export async function createPasswordForUser(email: string, password: string) {
  try {
    // Check if team member exists
    const member = await getTeamMemberByEmail(email);
    if (!member) {
      return { user: null, error: 'Email not found. Please contact your administrator.' };
    }
    
    if (member.hasPassword) {
      return { user: null, error: 'Password already set. Please use sign in.' };
    }
    
    const authContext = await getAuth();
    
    // Create Firebase Auth user
    const userCredential = await authContext.createUserWithEmailAndPassword(authContext.auth, email, password);
    
    // Update display name
    await authContext.updateProfile(userCredential.user, {
      displayName: member.name
    });
    
    // Link to team member record
    await linkUserToTeamMember(member.id, userCredential.user.uid);
    
    return { user: userCredential.user, error: null };
  } catch (error: any) {
    console.error('Create password error:', error);
    return { user: null, error: error.message || 'Failed to create password' };
  }
}

/**
 * Sign out current user
 */
export async function signOutUser() {
  try {
    const { signOut } = await getAuth();
    await signOut();
  } catch (error) {
    console.error('Sign out error:', error);
    throw error;
  }
}
