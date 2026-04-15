import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';

export default function DashboardTab() {
  const [weeks,       setWeeks]       = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [attendance,  setAttendance]  = useState([]);
  const [loading,     setLoading]     = useState(true);

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
      setSubmissions(snap.docs.map((d) => ({ id: d.id, ...d.data() }))); subLoaded = true; check();
    });
    const unsubAtt = onSnapshot(collection(db, 'attendance'), (snap) => {
      setAttendance(snap.docs.map((d) => ({ id: d.id, ...d.data() }))); attLoaded = true; check();
    });

    return () => { unsubWeeks(); unsubSubs(); unsubAtt(); };
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

  // Build week data ONLY from admin-created weeks
  const validWeekNumbers = new Set(weeks.map((w) => w.weekNumber));

  const weekData = weeks.map((week) => {
    const subs        = submissions.filter((s) => s.week === week.weekNumber);
    const atts        = attendance.filter((a) => a.week === week.weekNumber);
    const uniqueAttendees = [...new Set(atts.map((a) => a.userId))].length;
    return {
      weekNumber:  week.weekNumber,
      topic:       week.topic || '—',
      date:        week.date  || '',
      submissions: subs.length,
      attendees:   uniqueAttendees,
    };
  });

  const maxAtt  = Math.max(...weekData.map((w) => w.attendees),  1);
  const maxSubs = Math.max(...weekData.map((w) => w.submissions), 1);

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
          <p className="text-sm text-gray-400 p-6">No weeks created yet. Add weeks from the Weeks tab.</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-widest px-6 py-3">Week</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-widest px-6 py-3">Topic</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-widest px-6 py-3">Date</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-widest px-6 py-3">Attendees</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-widest px-6 py-3">Submissions</th>
              </tr>
            </thead>
            <tbody>
              {weekData.map((row) => (
                <tr key={row.weekNumber} className="border-b border-gray-50 hover:bg-gray-50 transition">
                  <td className="px-6 py-3.5">
                    <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
                      Week {row.weekNumber}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-sm text-gray-600 max-w-[200px] truncate">{row.topic}</td>
                  <td className="px-6 py-3.5 text-xs text-gray-400">{row.date || '—'}</td>
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
