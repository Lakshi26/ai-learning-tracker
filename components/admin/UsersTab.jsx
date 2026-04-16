import { useState, useEffect } from 'react';
import {
  collection, onSnapshot, query, orderBy,
  addDoc, deleteDoc, doc, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { format } from 'date-fns';

// ── User Detail View ───────────────────────────────────────────────────────────
function UserDetail({ user, submissions, attendance, weeks, validWeekNumbers, onBack }) {
  const userAtt  = attendance.filter((a) => a.userId === user.userId && validWeekNumbers.has(a.week)).sort((a, b) => a.week - b.week);
  const userSubs = submissions.filter((s) => s.userId === user.userId && validWeekNumbers.has(s.week)).sort((a, b) => b.week - a.week);

  const [addingAtt,   setAddingAtt]   = useState(false);
  const [attWeek,     setAttWeek]     = useState('');
  const [savingAtt,   setSavingAtt]   = useState(false);
  const [attError,    setAttError]    = useState('');

  // Weeks the user hasn't attended yet
  const attendedWeeks = new Set(userAtt.map((a) => a.week));
  const availableWeeks = weeks.filter((w) => !attendedWeeks.has(w.weekNumber));

  const handleAddAttendance = async () => {
    if (!attWeek) return;
    setAttError('');
    setSavingAtt(true);
    const week = weeks.find((w) => w.weekNumber === Number(attWeek));
    try {
      await addDoc(collection(db, 'attendance'), {
        userId:    user.userId,
        name:      user.name,
        week:      Number(attWeek),
        topic:     week?.topic || '',
        timestamp: serverTimestamp(),
        addedByAdmin: true,
      });
      setAddingAtt(false);
      setAttWeek('');
    } catch (err) {
      setAttError('Failed to add attendance. Try again.');
      console.error(err);
    } finally {
      setSavingAtt(false);
    }
  };

  const handleDeleteAttendance = async (record) => {
    if (!window.confirm(`Remove ${user.name}'s attendance for Week ${record.week}?`)) return;
    try {
      await deleteDoc(doc(db, 'attendance', record.id));
    } catch (err) {
      console.error('Failed to delete attendance:', err);
    }
  };

  const handleDeleteSubmission = async (sub) => {
    if (!window.confirm(`Delete ${user.name}'s submission for Week ${sub.week}? This cannot be undone.`)) return;
    try {
      await deleteDoc(doc(db, 'submissions', sub.id));
    } catch (err) {
      console.error('Failed to delete submission:', err);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition"
      >
        ← Back to Users
      </button>

      {/* User card */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-center gap-4 mb-5">
          <div className="w-14 h-14 bg-indigo-100 rounded-2xl flex items-center justify-center flex-shrink-0">
            <span className="text-indigo-600 text-xl font-bold">{user.name.charAt(0)}</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{user.name}</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {userAtt.length} sessions attended · {userSubs.length} submissions
            </p>
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Weeks Attended</p>
          <div className="flex flex-wrap gap-2">
            {[...attendedWeeks].sort((a, b) => a - b).map((w) => (
              <span key={w} className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold px-2.5 py-1 rounded-full">
                Week {w} ✓
              </span>
            ))}
            {attendedWeeks.size === 0 && <span className="text-xs text-gray-400">No attendance recorded</span>}
          </div>
        </div>
      </div>

      {/* Attendance history */}
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

        {/* Add attendance form */}
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
                    <option key={w.weekNumber} value={w.weekNumber}>
                      Week {w.weekNumber}{w.topic ? ` — ${w.topic}` : ''}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleAddAttendance}
                  disabled={!attWeek || savingAtt}
                  className="flex items-center gap-1.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-xl transition disabled:opacity-50"
                >
                  {savingAtt ? (
                    <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                  ) : null}
                  {savingAtt ? 'Saving…' : 'Confirm'}
                </button>
                <button
                  onClick={() => { setAddingAtt(false); setAttError(''); }}
                  className="text-sm text-gray-500 hover:text-gray-800 px-3 py-2 rounded-xl hover:bg-gray-100 transition"
                >
                  Cancel
                </button>
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
                  <td className="px-6 py-3">
                    <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
                      Week {a.week}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-600">{a.topic || '—'}</td>
                  <td className="px-6 py-3 text-sm text-gray-400">
                    {a.timestamp ? format(a.timestamp, 'MMM d, yyyy') : '—'}
                  </td>
                  <td className="px-6 py-3">
                    {a.addedByAdmin ? (
                      <span className="text-xs text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full font-semibold">Admin</span>
                    ) : (
                      <span className="text-xs text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full font-semibold">Self</span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-right">
                    <button
                      onClick={() => handleDeleteAttendance(a)}
                      className="text-xs font-semibold text-rose-400 hover:text-rose-600 bg-rose-50 hover:bg-rose-100 px-2.5 py-1.5 rounded-lg transition"
                    >
                      Remove
                    </button>
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
                      <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                        Week {s.week}
                      </span>
                      <span className="text-xs text-gray-400">{s.topic}</span>
                    </div>
                    <p className="text-sm text-gray-700 mb-2">{s.description || '—'}</p>
                    {s.link && (
                      <a href={s.link} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-indigo-600 hover:underline break-all">
                        {s.link}
                      </a>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <span className="text-xs text-gray-400">
                      {s.timestamp ? format(s.timestamp, 'MMM d') : '—'}
                    </span>
                    <span className="text-xs text-gray-400">{Array.isArray(s.likes) ? s.likes.length : 0} ❤️</span>
                    <button
                      onClick={() => handleDeleteSubmission(s)}
                      className="text-xs font-semibold text-rose-400 hover:text-rose-600 bg-rose-50 hover:bg-rose-100 px-2.5 py-1.5 rounded-lg transition"
                    >
                      Delete
                    </button>
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

// ── Users Table View ───────────────────────────────────────────────────────────
export default function UsersTab() {
  const [weeks,       setWeeks]       = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [attendance,  setAttendance]  = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    let weeksLoaded = false, subLoaded = false, attLoaded = false;
    const check = () => { if (weeksLoaded && subLoaded && attLoaded) setLoading(false); };

    const unsubWeeks = onSnapshot(
      query(collection(db, 'weeks'), orderBy('weekNumber', 'asc')),
      (snap) => { setWeeks(snap.docs.map((d) => ({ id: d.id, ...d.data() }))); weeksLoaded = true; check(); }
    );
    const unsubSubs = onSnapshot(collection(db, 'submissions'), (snap) => {
      setSubmissions(snap.docs.map((d) => ({
        id: d.id, ...d.data(), timestamp: d.data().timestamp?.toDate?.() ?? null,
      }))); subLoaded = true; check();
    });
    const unsubAtt = onSnapshot(collection(db, 'attendance'), (snap) => {
      setAttendance(snap.docs.map((d) => ({
        id: d.id, ...d.data(), timestamp: d.data().timestamp?.toDate?.() ?? null,
      }))); attLoaded = true; check();
    });
    return () => { unsubWeeks(); unsubSubs(); unsubAtt(); };
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

  const userMap = {};
  [...validAttendance, ...validSubmissions].forEach((item) => {
    if (!item.userId) return;
    if (!userMap[item.userId]) {
      userMap[item.userId] = { userId: item.userId, name: item.name || 'Unknown', weeksPresent: new Set() };
    }
  });
  validAttendance.forEach((a) => {
    if (a.userId && userMap[a.userId]) userMap[a.userId].weeksPresent.add(a.week);
  });

  const users = Object.values(userMap).sort((a, b) => b.weeksPresent.size - a.weeksPresent.size);

  if (selectedUser) {
    return (
      <UserDetail
        user={selectedUser}
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Users</h1>
        <p className="text-sm text-gray-400 mt-1">{users.length} members · click a row to manage</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {users.length === 0 ? (
          <p className="text-sm text-gray-400 p-8 text-center">No users yet. Data appears once team members start using the app.</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-widest px-6 py-3">Name</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-widest px-6 py-3">Weeks Present</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-widest px-6 py-3">Total Days Present</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-widest px-6 py-3">Submissions</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const subCount = validSubmissions.filter((s) => s.userId === user.userId).length;
                return (
                  <tr
                    key={user.userId}
                    onClick={() => setSelectedUser(user)}
                    className="border-b border-gray-50 hover:bg-indigo-50/40 transition cursor-pointer group"
                  >
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-indigo-600 text-xs font-bold">{user.name.charAt(0)}</span>
                        </div>
                        <span className="text-sm font-semibold text-gray-900">{user.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="flex gap-1 flex-wrap">
                        {[...user.weeksPresent].sort((a, b) => a - b).map((w) => (
                          <span key={w} className="bg-emerald-50 text-emerald-700 text-xs font-semibold px-1.5 py-0.5 rounded border border-emerald-100">
                            W{w}
                          </span>
                        ))}
                        {user.weeksPresent.size === 0 && <span className="text-xs text-gray-300">—</span>}
                      </div>
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full">
                        {validAttendance.filter((a) => a.userId === user.userId).length}
                      </span>
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="text-sm text-gray-600">{subCount}</span>
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <span className="text-xs text-indigo-500 font-semibold group-hover:text-indigo-700 transition">
                        Manage →
                      </span>
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
