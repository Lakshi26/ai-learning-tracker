import { useState, useEffect } from 'react';
import {
  collection, onSnapshot, addDoc, deleteDoc,
  doc, serverTimestamp, query, orderBy,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { SUPER_ADMIN_EMAIL, ALLOWED_DOMAIN } from '../../lib/roles';

export default function AdminsTab({ currentUser }) {
  const [admins,  setAdmins]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [email,   setEmail]   = useState('');
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, 'admins'), orderBy('addedAt', 'asc')),
      (snap) => {
        setAdmins(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    const trimmed = email.trim().toLowerCase();

    if (!trimmed) return;
    if (!trimmed.endsWith(`@${ALLOWED_DOMAIN}`)) {
      setError(`Only @${ALLOWED_DOMAIN} emails can be added as admins.`);
      return;
    }
    if (trimmed === SUPER_ADMIN_EMAIL) {
      setError('This email is already the permanent super admin.');
      return;
    }
    if (admins.some((a) => a.email === trimmed)) {
      setError('This email already has admin access.');
      return;
    }

    setSaving(true);
    try {
      await addDoc(collection(db, 'admins'), {
        email:     trimmed,
        addedBy:   currentUser.email,
        addedAt:   serverTimestamp(),
      });
      setEmail('');
      setSuccess(`Admin access granted to ${trimmed}`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to add admin. Try again.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (admin) => {
    if (admin.email === SUPER_ADMIN_EMAIL) return; // safety
    if (!window.confirm(`Remove admin access for ${admin.email}?`)) return;
    try {
      await deleteDoc(doc(db, 'admins', admin.id));
    } catch (err) {
      console.error('Failed to remove admin:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 bg-indigo-600 rounded-lg animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Access</h1>
        <p className="text-sm text-gray-400 mt-1">
          Manage who has admin privileges in KUWA
        </p>
      </div>

      {/* Add admin form */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="text-sm font-bold text-gray-900 mb-4">Grant Admin Access</h2>
        <form onSubmit={handleAdd} className="flex gap-3">
          <input
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(''); setSuccess(''); }}
            placeholder={`name@${ALLOWED_DOMAIN}`}
            className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <button
            type="submit"
            disabled={saving || !email.trim()}
            className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
          >
            {saving ? (
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            )}
            Add Admin
          </button>
        </form>

        {error && (
          <p className="mt-3 text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
        {success && (
          <p className="mt-3 text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
            ✓ {success}
          </p>
        )}
      </div>

      {/* Admins list */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Current Admins</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {1 + admins.length} admin{admins.length !== 0 ? 's' : ''} total
          </p>
        </div>

        <ul className="divide-y divide-gray-50">
          {/* Permanent super admin — always shown first */}
          <li className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-indigo-600 text-xs font-bold">
                  {SUPER_ADMIN_EMAIL.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{SUPER_ADMIN_EMAIL}</p>
                <p className="text-xs text-gray-400">Super Admin · permanent</p>
              </div>
            </div>
            <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-full">
              Super Admin
            </span>
          </li>

          {/* Dynamic admins */}
          {admins.length === 0 ? (
            <li className="px-6 py-5 text-sm text-gray-400 text-center">
              No additional admins added yet.
            </li>
          ) : (
            admins.map((admin) => (
              <li key={admin.id} className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-violet-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-violet-600 text-xs font-bold">
                      {admin.email.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{admin.email}</p>
                    <p className="text-xs text-gray-400">
                      Added by {admin.addedBy || 'admin'}
                      {admin.addedAt?.toDate
                        ? ` · ${admin.addedAt.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                        : ''}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleRemove(admin)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-rose-400 hover:text-rose-600 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-lg transition"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Revoke
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
