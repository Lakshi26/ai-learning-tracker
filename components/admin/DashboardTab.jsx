import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';

function StatCard({ label, value, color }) {
  const colors = {
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    violet: 'bg-violet-50 text-violet-600 border-violet-100',
  };
  return (
    <div className={`rounded-2xl border p-5 ${colors[color]}`}>
      <p className="text-xs font-semibold uppercase tracking-widest opacity-70 mb-1">{label}</p>
      <p className="text-4xl font-bold">{value}</p>
    </div>
  );
}

export default function DashboardTab() {
  const [submissions, setSubmissions] = useState([]);
  const [attendance, setAttendance]   = useState([]);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    async function fetchData() {
      const [subSnap, attSnap] = await Promise.all([
        getDocs(collection(db, 'submissions')),
        getDocs(collection(db, 'attendance')),
      ]);
      setSubmissions(subSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setAttendance(attSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg animate-pulse" />
          <p className="text-sm text-gray-400">Loading data…</p>
        </div>
      </div>
    );
  }

  // Aggregate weeks
  const allWeeks = [...new Set([
    ...submissions.map((s) => s.week),
    ...attendance.map((a) => a.week),
  ])].filter(Boolean).sort((a, b) => a - b);

  const weekData = allWeeks.map((week) => {
    const subs = submissions.filter((s) => s.week === week);
    const atts = attendance.filter((a) => a.week === week);
    const uniqueAttendees = [...new Set(atts.map((a) => a.userId))].length;
    const topic = subs[0]?.topic || atts[0]?.topic || '—';
    return { week, topic, submissions: subs.length, attendees: uniqueAttendees };
  });

  const maxSubs = Math.max(...weekData.map((w) => w.submissions), 1);
  const maxAtt  = Math.max(...weekData.map((w) => w.attendees), 1);
  const totalUniqueUsers = [...new Set(attendance.map((a) => a.userId))].length;

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-400 mt-1">Overview of all AI learning sessions</p>
      </div>


      {/* Weekly breakdown table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Weekly Breakdown</h2>
          <p className="text-xs text-gray-400 mt-0.5">Attendance and submissions per session</p>
        </div>
        {weekData.length === 0 ? (
          <p className="text-sm text-gray-400 p-6">No data yet.</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-widest px-6 py-3">Week</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-widest px-6 py-3">Topic</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-widest px-6 py-3">Attendees</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-widest px-6 py-3">Submissions</th>
              </tr>
            </thead>
            <tbody>
              {weekData.map((row) => (
                <tr key={row.week} className="border-b border-gray-50 hover:bg-gray-50 transition">
                  <td className="px-6 py-3.5">
                    <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
                      Week {row.week}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-sm text-gray-600 max-w-[220px] truncate">{row.topic}</td>
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-24 bg-gray-100 rounded-full h-1.5">
                        <div
                          className="bg-emerald-500 h-1.5 rounded-full transition-all"
                          style={{ width: `${(row.attendees / maxAtt) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-semibold text-gray-800 w-5 text-right">{row.attendees}</span>
                    </div>
                  </td>
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-24 bg-gray-100 rounded-full h-1.5">
                        <div
                          className="bg-indigo-500 h-1.5 rounded-full transition-all"
                          style={{ width: `${(row.submissions / maxSubs) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-semibold text-gray-800 w-5 text-right">{row.submissions}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
