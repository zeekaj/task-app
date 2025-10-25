// Admin Setup Page - Temporary component for creating first admin
import { useState } from 'react';
import { getAuth, getFirestoreClient } from '../../firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';

export function AdminSetup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validate
      if (password.length < 8) {
        setError('Password must be at least 8 characters');
        setLoading(false);
        return;
      }

      if (password !== confirmPassword) {
        setError('Passwords do not match');
        setLoading(false);
        return;
      }

      // Get Firebase instances
      const { db } = await getFirestoreClient();
      const authContext = await getAuth();

      // Check if team member already exists
      const membersRef = collection(db, 'teamMembers');
      const q = query(membersRef, where('email', '==', email.toLowerCase()));
      const existingSnapshot = await getDocs(q);

      if (!existingSnapshot.empty) {
        setError('A team member with this email already exists');
        setLoading(false);
        return;
      }

      // Create Firebase Auth user
      const userCredential = await authContext.createUserWithEmailAndPassword(
        authContext.auth,
        email,
        password
      );

      const userId = userCredential.user.uid;

      // Create team member record
      const memberData = {
        name: name.trim(),
        email: email.toLowerCase(),
        role: 'admin',
        active: true,
        userId: userId,
        organizationId: userId, // Admin is their own organization
        hasPassword: true,
        skills: {
          audio: 5,
          graphicDesign: 5,
          truckDriving: 5,
          video: 5,
          rigging: 5,
          lighting: 5,
          stageDesign: 5,
          electric: 5,
        },
        availability: 100,
        workload: 0,
        viewerPermissions: [],
        invitedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastLoginAt: null,
      };

      await addDoc(membersRef, memberData);

      setSuccess(true);
      setLoading(false);

    } catch (err: any) {
      console.error('Admin setup error:', err);
      
      if (err.code === 'auth/email-already-in-use') {
        setError('An account with this email already exists');
      } else if (err.code === 'auth/invalid-email') {
        setError('Invalid email address');
      } else if (err.code === 'auth/weak-password') {
        setError('Password is too weak');
      } else if (err.code === 'permission-denied' || err.message?.includes('permission')) {
        setError('⚠️ Firestore permissions error. You need to update your Firestore security rules. See ADMIN_SETUP_INSTRUCTIONS.md in the project root for instructions.');
      } else {
        setError('Failed to create admin account: ' + (err.message || 'Unknown error'));
      }
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="w-full max-w-md px-6">
          <div className="bg-gray-800 rounded-2xl shadow-2xl p-8 border border-gray-700">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500/10 border-2 border-green-500/30 rounded-2xl mb-4">
                <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Admin Account Created!</h2>
              <p className="text-gray-400 mb-6">
                Your admin account has been successfully created.
              </p>
              <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4 mb-6 text-left">
                <p className="text-sm text-gray-400 mb-2">Login Credentials:</p>
                <p className="text-white mb-1"><strong>Email:</strong> {email}</p>
                <p className="text-white"><strong>Role:</strong> Admin</p>
              </div>
              <button
                onClick={() => window.location.href = '/'}
                className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold rounded-lg hover:from-cyan-600 hover:to-blue-600 transition-all duration-200 shadow-lg shadow-cyan-500/20"
              >
                Go to Login
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="w-full max-w-md px-6">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-2xl mb-4 shadow-lg shadow-cyan-500/20">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Create Admin Account</h1>
          <p className="text-gray-400">Set up the first admin for your organization</p>
        </div>

        <div className="bg-gray-800 rounded-2xl shadow-2xl p-8 border border-gray-700">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                <p className="text-red-400 text-sm whitespace-pre-wrap">{error}</p>
                {error.includes('Firestore permissions') && (
                  <div className="mt-3 p-3 bg-gray-900/50 rounded text-left">
                    <p className="text-xs text-gray-400 mb-2 font-semibold">Quick Fix:</p>
                    <ol className="text-xs text-gray-300 space-y-1 list-decimal list-inside">
                      <li>Go to <a href="https://console.firebase.google.com" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">Firebase Console</a></li>
                      <li>Select your project → Firestore Database → Rules</li>
                      <li>Allow authenticated users to create teamMembers</li>
                      <li>Click Publish and try again</li>
                    </ol>
                    <p className="text-xs text-gray-500 mt-2">
                      See <code className="text-cyan-400">ADMIN_SETUP_INSTRUCTIONS.md</code> for detailed rules
                    </p>
                  </div>
                )}
              </div>
            )}

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                Full Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                required
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                required
                autoComplete="email"
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="new-password"
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
              />
              <p className="mt-1 text-xs text-gray-500">Minimum 8 characters</p>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="new-password"
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold rounded-lg hover:from-cyan-600 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-gray-800 transition-all duration-200 shadow-lg shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating account...
                </span>
              ) : (
                'Create Admin Account'
              )}
            </button>
          </form>
        </div>

        <div className="mt-6 text-center">
          <p className="text-gray-500 text-sm">
            This page should only be used for initial setup.
          </p>
        </div>
      </div>
    </div>
  );
}
