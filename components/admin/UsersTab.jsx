import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { format } from 'date-fns';

// ── User Detail View ──────────────────────────────────────────────────────────
function UserDetail({ user, submissions, attendance, onBack }) {
  const userAtt  = attendance.filter((a) => a.userId === user.userId).sort((a, b) => a.week - b.week);
  const userSubs = submissions.filter((s) => s.userId === user.userId).sort((a, b) => b.week - a.week);

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Back */}
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
        {/* Week badges */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Weeks Attended</p>
          <div className="flex flex-wrap gap-2">
            {[...user.weeksPresent].sort((a, b) => a - b).map((w) => (
              <span
                key={w}
                className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold px-2.5 py-1 rounded-full"
              >
                Week {w} ✓
              </span>
            ))}
            {user.weeksPresent.size === 0 && (
              <span className="text-xs text-gray-400">No attendance recorded</span>
            )}
          </div>
        </div>
      </div>

      {/* Attendance history */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Attendance History</h2>
        </div>
        {userAtt.length === 0 ? (
          <p className="text-sm text-gray-400 px-6 py-5">No attendance records found.</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-widest px-6 py-3">Week</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-widest px-6 py-3">Topic</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-widest px-6 py-3">Date</th>
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
                  <td className="px-6 py-3 text-sm text-gray-600">{a.topic}</td>
                  <td className="px-6 py-3 text-sm text-gray-400">
                    {a.timestamp ? format(a.timestamp, 'MMM d, yyyy') : '—'}
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
          <h2 className="text-sm font-semibold text-gray-900">Homework Submissions ({userSubs.length})</h2>
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
                    <p className="text-sm text-gray-700 mb-2">{s.description}</p>
                    <a
                      href={s.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-indigo-600 hover:underline break-all"
                    >
                      {s.link}
                    </a>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className="text-xs text-gray-400">
                      {s.timestamp ? format(s.timestamp, 'MMM d') : '—'}
                    </span>
                    <span className="text-xs text-gray-400">
                      {Array.isArray(s.likes) ? s.likes.length : 0} ❤️
                    </span>
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

// ── Users Table View ──────────────────────────────────────────────────────────
export default function UsersTab() {
  const [weeks,       setWeeks]       = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [attendance,  setAttendance]  = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    let weeksLoaded = false;
    let subLoaded   = false;
    let attLoaded   = false;
    const check = () => { if (weeksLoaded && subLoaded && attLoaded) setLoading(false); };

    const unsubWeeks = onSnapshot(
      query(collection(db, 'weeks'), orderBy('weekNumber', 'asc')),
      (snap) => { setWeeks(snap.docs.map((d) => ({ id: d.id, ...d.data() }))); weeksLoaded = true; check(); }
    );
    const unsubSubs = onSnapshot(collection(db, 'submissions'), (snap) => {
      setSubmissions(snap.docs.map((d) => ({
        id: d.id, ...d.data(),
        timestamp: d.data().timestamp?.toDate?.() ?? null,
      }))); subLoaded = true; check();
    });
    const unsubAtt = onSnapshot(collection(db, 'attendance'), (snap) => {
      setAttendance(snap.docs.map((d) => ({
        id: d.id, ...d.data(),
        timestamp: d.data().timestamp?.toDate?.() ?? null,
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

  // Only count weeks that were actually created by admin
  const validWeekNumbers = new Set(weeks.map((w) => w.weekNumber));

  // Build user map — only from real attendance records for valid weeks
  const userMap = {};
  const validAttendance = attendance.filter((a) => validWeekNumbers.has(a.week));
  const validSubmissions = submissions.filter((s) => validWeekNumbers.has(s.week));

  [...validAttendance, ...validSubmissions].forEach((item) => {
    if (!item.userId) return;
    if (!userMap[item.userId]) {
      userMap[item.userId] = {
        userId: item.userId,
        name: item.name || 'Unknown',
        weeksPresent: new Set(),
      };
    }
  });
  validAttendance.forEach((a) => {
    if (a.userId && userMap[a.userId]) userMap[a.userId].weeksPresent.add(a.week);
  });

  const users = Object.values(userMap).sort((a, b) => b.weeksPresent.size - a.weeksPresent.size);

  // Show detail view
  if (selectedUser) {
    return (
      <UserDetail
        user={selectedUser}
        submissions={submissions}
        attendance={attendance}
        onBack={() => setSelectedUser(null)}
      />
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Users</h1>
        <p className="text-sm text-gray-400 mt-1">{users.length} members tracked · click a row for details</p>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {users.length === 0 ? (
          <p className="text-sm text-gray-400 p-8 text-center">No users found. Data will appear once team members start using the app.</p>
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
                          <span
                            key={w}
                            className="bg-emerald-50 text-emerald-700 text-xs font-semibold px-1.5 py-0.5 rounded border border-emerald-100"
                          >
                            W{w}
                          </span>
                        ))}
                        {user.weeksPresent.size === 0 && (
                          <span className="text-xs text-gray-300">—</span>
                        )}
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
                        View →
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
