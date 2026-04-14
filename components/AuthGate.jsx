import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { GoogleAuthProvider, signInWithPopup, getRedirectResult, signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { getRoles, ALLOWED_DOMAIN } from '../lib/roles';

// ── Icons ─────────────────────────────────────────────────────────────────────
function GoogleIcon() {
  return (
    <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

// ── Main AuthGate ─────────────────────────────────────────────────────────────
// Single sign-in flow. Roles (admin / team) are assigned after login based on
// email — no role selection required before signing in.
export default function AuthGate({ authError }) {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(authError || '');
  const router = useRouter();

  const handleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ hd: ALLOWED_DOMAIN });
      const result = await signInWithPopup(auth, provider);
      const email  = result.user.email;
      const roles  = getRoles(email);
      if (roles.length === 0) {
        await signOut(auth);
        setError(`Access is restricted to @${ALLOWED_DOMAIN} accounts. You signed in as ${email}.`);
        setLoading(false);
        return;
      }
      router.push('/');
    } catch (err) {
      if (!['auth/popup-closed-by-user', 'auth/cancelled-popup-request'].includes(err.code)) {
        setError('Sign-in failed. Please try again.');
        console.error(err);
      }
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-violet-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Branding */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-indigo-200">
            <span className="text-white text-xl font-bold tracking-tighter">AI</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">KUWA</h1>
          <p className="text-sm text-gray-400 mt-1">Sign in to access your workspace</p>
        </div>

        {/* Sign-in card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest text-center mb-5">
            Continue with your work account
          </p>

          <button
            onClick={handleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-wait text-white text-sm font-semibold rounded-xl transition-all shadow-sm hover:shadow-md"
          >
            {loading ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Signing in…
              </>
            ) : (
              <>
                <GoogleIcon />
                Sign in with Google
              </>
            )}
          </button>

          {/* Role hint */}
          <p className="text-center text-xs text-gray-400 mt-4 leading-relaxed">
            Your access level is determined automatically after sign-in.
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="mt-4 p-3 bg-rose-50 border border-rose-100 rounded-xl">
            <p className="text-xs text-rose-600 text-center leading-relaxed">{error}</p>
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-gray-300 mt-5">
          Access restricted to{' '}
          <span className="text-gray-400 font-medium">@{ALLOWED_DOMAIN}</span> accounts only
        </p>
      </div>
    </div>
  );
}
