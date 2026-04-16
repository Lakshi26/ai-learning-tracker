import { useState, useEffect } from 'react';
import {
  collection, onSnapshot, query, orderBy, where,
  addDoc, updateDoc, deleteDoc, doc, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { format } from 'date-fns';
import { ALLOWED_DOMAIN } from '../../lib/roles';

// ── User Detail View ───────────────────────────────────────────────────────────
function UserDetail({ user, submissions, attendance, weeks, validWeekNumbers, onBack }) {
  const userAtt  = attendance.filter((a) => a.userId === user.uid && validWeekNumbers.has(a.week)).sort((a, b) => a.week - b.week);
  const userSubs = submissions.filter((s) => s.userId === user.uid && validWeekNumbers.has(s.week)).sort((a, b) => b.week - a.week);
  const attendedWeeks = new Set(userAtt.map((a) => a.week));
  const availableWeeks = weeks.filter((w) => !attendedWeeks.has(w.weekNumber));

  const [addingAtt, setAddingAtt] = useState(false);
  const [attWeek,   setAttWeek]   = useState('');
  const [savingAtt, setSavingAtt] = useState(false);
  const [attError,  setAttError]  = useState('');

  const handleAddAttendance = async () => {
    if (!attWeek) return;
    setAttError('');
    setSavingAtt(true);
    const week = weeks.find((w) => w.weekNumber === Number(attWeek));
    try {
      await addDoc(collection(db, 'attendance'), {
        userId:       user.uid,
        name:         user.name,
        week:         Number(attWeek),
        topic:        week?.topic || '',
        timestamp:    serverTimestamp(),
        addedByAdmin: true,
      });
      setAddingAtt(false);
      setAttWeek('');
    } catch (err) {
      setAttError('Failed to add attendance. Try again.');
    } finally {
      setSavingAtt(false);
    }
  };

  const handleDeleteAttendance = async (record) => {
    if (!window.confirm(`Remove ${user.name}'s attendance for Week ${record.week}?`)) return;
    await deleteDoc(doc(db, 'attendance', record.id));
  };

  const handleDeleteSubmission = async (sub) => {
    if (!window.confirm(`Delete ${user.name}'s submission for Week ${sub.week}? This cannot be undone.`)) return;
    await deleteDoc(doc(db, 'submissions', sub.id));
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition">
        ← Back to Users
      </button>

      {/* User card */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 bg-indigo-100 rounded-2xl flex items-center justify-center flex-shrink-0">
            <span className="text-indigo-600 text-xl font-bold">{user.name.charAt(0)}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-gray-900">{user.name}</h1>
            <p className="text-sm text-gray-400">{user.email}</p>
            <p className="text-xs text-gray-400 mt-0.5">{userAtt.length} sessions attended · {userSubs.length} submissions</p>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <StatusBadge status={user.status} />
            {user.lastSeen && (
              <p className="text-xs text-gray-400">
                Last seen {format(user.lastSeen, 'MMM d, yyyy')}
              </p>
            )}
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Weeks Attended</p>
          <div className="flex flex-wrap gap-2">
            {[...attendedWeeks].sort((a, b) => a - b).map((w) => (
              <span key={w} className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold px-2.5 py-1 rounded-full">Week {w} ✓</span>
            ))}
            {attendedWeeks.size === 0 && <span className="text-xs text-gray-400">No attendance recorded</span>}
          </div>
        </div>
      </div>

      {/* Attendance */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Attendance History</h2>
            <p className="text-xs text-gray-400 mt-0.5">{userAtt.length} records</p>
          </div>
          <button
            onClick={() => { setAddingAtt(true); setAttWeek(''); setAttError(''); }}
            className="flex items-center gap-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-lg transition"
          >
            + Add Attendance
          </button>
        </div>
        {addingAtt && (
          <div className="px-6 py-4 bg-indigo-50 border-b border-indigo-100">
            <p className="text-xs font-bold text-indigo-700 mb-3">Mark {user.name} as present for:</p>
            {availableWeeks.length === 0 ? (
              <p className="text-sm text-gray-500">This user has attended all available weeks.</p>
            ) : (
              <div className="flex items-center gap-3">
                <select
                  value={attWeek}
                  onChange={(e) => setAttWeek(e.target.value)}
                  className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                >
                  <option value="">Select week…</option>
                  {availableWeeks.map((w) => (
                    <option key={w.weekNumber} value={w.weekNumber}>Week {w.weekNumber}{w.topic ? ` — ${w.topic}` : ''}</option>
                  ))}
                </select>
                <button
                  onClick={handleAddAttendance}
                  disabled={!attWeek || savingAtt}
                  className="flex items-center gap-1.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-xl transition disabled:opacity-50"
                >
                  {savingAtt ? <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> : null}
                  {savingAtt ? 'Saving…' : 'Confirm'}
                </button>
                <button onClick={() => { setAddingAtt(false); setAttError(''); }} className="text-sm text-gray-500 hover:text-gray-800 px-3 py-2 rounded-xl hover:bg-gray-100 transition">Cancel</button>
              </div>
            )}
            {attError && <p className="text-xs text-rose-600 mt-2">{attError}</p>}
          </div>
        )}
        {userAtt.length === 0 && !addingAtt ? (
          <p className="text-sm text-gray-400 px-6 py-5">No attendance records found.</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-widest px-6 py-3">Week</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-widest px-6 py-3">Topic</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-widest px-6 py-3">Date</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-widest px-6 py-3">Source</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody>
              {userAtt.map((a) => (
                <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                  <td className="px-6 py-3"><span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">Week {a.week}</span></td>
                  <td className="px-6 py-3 text-sm text-gray-600">{a.topic || '—'}</td>
                  <td className="px-6 py-3 text-sm text-gray-400">{a.timestamp ? format(a.timestamp, 'MMM d, yyyy') : '—'}</td>
                  <td className="px-6 py-3">
                    {a.addedByAdmin
                      ? <span className="text-xs text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full font-semibold">Admin</span>
                      : <span className="text-xs text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full font-semibold">Self</span>}
                  </td>
                  <td className="px-6 py-3 text-right">
                    <button onClick={() => handleDeleteAttendance(a)} className="text-xs font-semibold text-rose-400 hover:text-rose-600 bg-rose-50 hover:bg-rose-100 px-2.5 py-1.5 rounded-lg transition">Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Submissions */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Submissions ({userSubs.length})</h2>
        </div>
        {userSubs.length === 0 ? (
          <p className="text-sm text-gray-400 px-6 py-5">No submissions found.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {userSubs.map((s) => (
              <div key={s.id} className="px-6 py-4 hover:bg-gray-50 transition">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">Week {s.week}</span>
                      <span className="text-xs text-gray-400">{s.topic}</span>
                    </div>
                    <p className="text-sm text-gray-700 mb-1">{s.description || '—'}</p>
                    {s.link && <a href={s.link} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-600 hover:underline break-all">{s.link}</a>}
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <span className="text-xs text-gray-400">{s.timestamp ? format(s.timestamp, 'MMM d') : '—'}</span>
                    <span className="text-xs text-gray-400">{Array.isArray(s.likes) ? s.likes.length : 0} ❤️</span>
                    <button onClick={() => handleDeleteSubmission(s)} className="text-xs font-semibold text-rose-400 hover:text-rose-600 bg-rose-50 hover:bg-rose-100 px-2.5 py-1.5 rounded-lg transition">Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Status badge helper ────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = {
    active:  'text-emerald-700 bg-emerald-50 border-emerald-200',
    invited: 'text-amber-700 bg-amber-50 border-amber-200',
    blocked: 'text-rose-700 bg-rose-50 border-rose-200',
  };
  const label = { active: 'Active', invited: 'Invited', blocked: 'Blocked' };
  return (
    <span className={`text-xs font-semibold border px-2.5 py-0.5 rounded-full ${map[status] || map.active}`}>
      {label[status] || 'Active'}
    </span>
  );
}

// ── Add User Form ──────────────────────────────────────────────────────────────
function AddUserForm({ onSave, onCancel, saving, existingEmails }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    const trimmed = email.trim().toLowerCase();
    if (!trimmed.endsWith(`@${ALLOWED_DOMAIN}`)) {
      setError(`Only @${ALLOWED_DOMAIN} emails are allowed.`);
      return;
    }
    if (existingEmails.has(trimmed)) {
      setError('This user already exists.');
      return;
    }
    onSave(trimmed);
  };

  return (
    <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5">
      <p className="text-xs font-bold text-indigo-700 uppercase tracking-wide mb-3">Add New User</p>
      <form onSubmit={handleSubmit} className="flex items-center gap-3">
        <input
          type="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setError(''); }}
          placeholder={`name@${ALLOWED_DOMAIN}`}
          autoFocus
          className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
        />
        <button
          type="submit"
          disabled={saving || !email.trim()}
          className="flex items-center gap-1.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2.5 rounded-xl transition disabled:opacity-50"
        >
          {saving ? <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> : null}
          {saving ? 'Adding…' : 'Add User'}
        </button>
        <button type="button" onClick={onCancel} className="text-sm text-gray-500 hover:text-gray-800 px-3 py-2.5 rounded-xl hover:bg-gray-100 transition">Cancel</button>
      </form>
      {error && <p className="text-xs text-rose-600 mt-2">{error}</p>}
    </div>
  );
}

// ── Main UsersTab ──────────────────────────────────────────────────────────────
export default function UsersTab() {
  const [users,       setUsers]       = useState([]);
  const [weeks,       setWeeks]       = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [attendance,  setAttendance]  = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showAddForm,  setShowAddForm]  = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    let done = { users: false, weeks: false, subs: false, att: false };
    const check = () => { if (Object.values(done).every(Boolean)) setLoading(false); };

    const unsubUsers = onSnapshot(
      query(collection(db, 'users'), orderBy('createdAt', 'asc')),
      (snap) => {
        setUsers(snap.docs.map((d) => ({
          id: d.id, ...d.data(),
          lastSeen:  d.data().lastSeen?.toDate?.()  ?? null,
          createdAt: d.data().createdAt?.toDate?.() ?? null,
        })));
        done.users = true; check();
      }
    );
    const unsubWeeks = onSnapshot(
      query(collection(db, 'weeks'), orderBy('weekNumber', 'asc')),
      (snap) => { setWeeks(snap.docs.map((d) => ({ id: d.id, ...d.data() }))); done.weeks = true; check(); }
    );
    const unsubSubs = onSnapshot(collection(db, 'submissions'), (snap) => {
      setSubmissions(snap.docs.map((d) => ({
        id: d.id, ...d.data(), timestamp: d.data().timestamp?.toDate?.() ?? null,
      }))); done.subs = true; check();
    });
    const unsubAtt = onSnapshot(collection(db, 'attendance'), (snap) => {
      setAttendance(snap.docs.map((d) => ({
        id: d.id, ...d.data(), timestamp: d.data().timestamp?.toDate?.() ?? null,
      }))); done.att = true; check();
    });
    return () => { unsubUsers(); unsubWeeks(); unsubSubs(); unsubAtt(); };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg animate-pulse" />
          <p className="text-sm text-gray-400">Loading users…</p>
        </div>
      </div>
    );
  }

  const validWeekNumbers = new Set(weeks.map((w) => w.weekNumber));
  const validAttendance  = attendance.filter((a) => validWeekNumbers.has(a.week));
  const validSubmissions = submissions.filter((s) => validWeekNumbers.has(s.week));
  const existingEmails   = new Set(users.map((u) => u.email));

  const filteredUsers = filterStatus === 'all' ? users : users.filter((u) => u.status === filterStatus);

  const handleAddUser = async (email) => {
    setSaving(true);
    try {
      const name = email.split('@')[0].split('.').map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
      await addDoc(collection(db, 'users'), {
        email, name, uid: null, status: 'invited',
        addedByAdmin: true, createdAt: serverTimestamp(), lastSeen: null,
      });
      setShowAddForm(false);
    } catch (err) {
      console.error('Failed to add user:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleBlock = async (user) => {
    const newStatus = user.status === 'blocked' ? 'active' : 'blocked';
    const action    = newStatus === 'blocked' ? 'block' : 'restore';
    if (!window.confirm(`${action === 'block' ? 'Block' : 'Restore'} ${user.name}? ${action === 'block' ? 'They will be signed out and lose app access.' : 'They will regain access on next sign-in.'}`)) return;
    await updateDoc(doc(db, 'users', user.id), { status: newStatus });
    if (selectedUser?.id === user.id) setSelectedUser({ ...selectedUser, status: newStatus });
  };

  const handleDeleteUser = async (user) => {
    if (!window.confirm(`Permanently delete ${user.name} (${user.email})?\n\nThis removes their user record but does NOT delete their attendance or submissions.`)) return;
    await deleteDoc(doc(db, 'users', user.id));
    if (selectedUser?.id === user.id) setSelectedUser(null);
  };

  if (selectedUser) {
    const fresh = users.find((u) => u.id === selectedUser.id) || selectedUser;
    return (
      <UserDetail
        user={fresh}
        submissions={submissions}
        attendance={attendance}
        weeks={weeks}
        validWeekNumbers={validWeekNumbers}
        onBack={() => setSelectedUser(null)}
      />
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-sm text-gray-400 mt-1">
            {users.filter((u) => u.status !== 'blocked').length} active ·{' '}
            {users.filter((u) => u.status === 'blocked').length} blocked ·{' '}
            {users.filter((u) => u.status === 'invited').length} invited
          </p>
        </div>
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition"
          >
            + Add User
          </button>
        )}
      </div>

      {/* Add form */}
      {showAddForm && (
        <AddUserForm
          onSave={handleAddUser}
          onCancel={() => setShowAddForm(false)}
          saving={saving}
          existingEmails={existingEmails}
        />
      )}

      {/* Filter tabs */}
      <div className="flex items-center gap-2">
        {['all', 'active', 'invited', 'blocked'].map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition capitalize ${
              filterStatus === s
                ? 'bg-indigo-600 text-white'
                : 'text-gray-500 bg-gray-100 hover:bg-gray-200'
            }`}
          >
            {s === 'all' ? `All (${users.length})` : `${s.charAt(0).toUpperCase() + s.slice(1)} (${users.filter((u) => u.status === s).length})`}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {filteredUsers.length === 0 ? (
          <p className="text-sm text-gray-400 p-8 text-center">No users found.</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-widest px-6 py-3">User</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-widest px-6 py-3">Status</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-widest px-6 py-3">Days Present</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-widest px-6 py-3">Last Seen</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-widest px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => {
                const daysPresent = validAttendance.filter((a) => a.userId === user.uid).length;
                return (
                  <tr key={user.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                    <td className="px-6 py-3.5">
                      <div
                        className="flex items-center gap-3 cursor-pointer group"
                        onClick={() => user.status !== 'invited' && setSelectedUser(user)}
                      >
                        <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-indigo-600 text-xs font-bold">{user.name.charAt(0)}</span>
                        </div>
                        <div className="min-w-0">
                          <p className={`text-sm font-semibold ${user.status !== 'invited' ? 'text-gray-900 group-hover:text-indigo-700' : 'text-gray-500'}`}>
                            {user.name}
                          </p>
                          <p className="text-xs text-gray-400 truncate">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3.5"><StatusBadge status={user.status} /></td>
                    <td className="px-6 py-3.5">
                      {user.uid ? (
                        <span className="inline-flex items-center text-sm font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full">
                          {daysPresent}
                        </span>
                      ) : <span className="text-xs text-gray-300">—</span>}
                    </td>
                    <td className="px-6 py-3.5 text-xs text-gray-400">
                      {user.lastSeen ? format(user.lastSeen, 'MMM d, yyyy') : '—'}
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-1.5">
                        {user.status !== 'invited' && (
                          <button
                            onClick={() => setSelectedUser(user)}
                            className="text-xs font-semibold text-gray-500 hover:text-indigo-600 bg-gray-100 hover:bg-indigo-50 px-2.5 py-1.5 rounded-lg transition"
                          >
                            Manage
                          </button>
                        )}
                        <button
                          onClick={() => handleToggleBlock(user)}
                          className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg transition ${
                            user.status === 'blocked'
                              ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100'
                              : 'text-amber-600 bg-amber-50 hover:bg-amber-100'
                          }`}
                        >
                          {user.status === 'blocked' ? 'Restore' : 'Block'}
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user)}
                          className="text-xs font-semibold text-rose-400 hover:text-rose-600 bg-rose-50 hover:bg-rose-100 px-2.5 py-1.5 rounded-lg transition"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
