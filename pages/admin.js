// pages/admin.js
// This route is kept for backwards-compatibility (e.g. old bookmarks).
// Admins are redirected to the main app which now hosts the admin view.
// Non-admins see an access-denied screen.

import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { getRoles, isAdmin } from '../lib/roles';
import AuthGate from '../components/AuthGate';

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center animate-pulse">
          <span className="text-white text-sm font-bold">AI</span>
        </div>
        <p className="text-sm text-gray-400">Loading…</p>
      </div>
    </div>
  );
}

function AccessDenied() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center">
        <div className="w-16 h-16 bg-rose-100 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">
          🚫
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h1>
        <p className="text-sm text-gray-500 mb-6 max-w-xs mx-auto">
          You don&apos;t have permission to access the admin portal. This area is restricted to admins only.
        </p>
        <a
          href="/"
          className="inline-flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition"
        >
          ← Back to App
        </a>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const [authLoading,  setAuthLoading]  = useState(true);
  const [currentUser,  setCurrentUser]  = useState(null);
  const [userRoles,    setUserRoles]    = useState([]);
  const router = useRouter();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (fbUser) => {
      if (fbUser) {
        const roles = getRoles(fbUser.email);
        const name  = fbUser.displayName ||
          fbUser.email.split('@')[0]
            .split('.')
            .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
            .join(' ');
        setCurrentUser({ uid: fbUser.uid, email: fbUser.email, name });
        setUserRoles(roles);
      } else {
        setCurrentUser(null);
        setUserRoles([]);
      }
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  // Redirect admins to the main app (which hosts the admin view via toggle)
  useEffect(() => {
    if (!authLoading && currentUser && isAdmin(userRoles)) {
      router.replace('/');
    }
  }, [authLoading, currentUser, userRoles, router]);

  if (authLoading)  return <LoadingScreen />;
  if (!currentUser) return (
    <>
      <Head><title>Admin — AI Learning Sessions</title></Head>
      <AuthGate authError="" />
    </>
  );

  // Admin users get redirected (handled above), so reaching here means non-admin
  return (
    <>
      <Head><title>Access Denied — AI Learning Sessions</title></Head>
      <AccessDenied />
    </>
  );
}
