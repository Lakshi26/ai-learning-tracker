import { useState, useEffect } from 'react';
import {
  collection, onSnapshot, query, orderBy,
  updateDoc, deleteDoc, doc, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { format } from 'date-fns';

// ── Inline edit form ───────────────────────────────────────────────────────────
function EditForm({ submission, onSave, onCancel, saving }) {
  const [description, setDescription] = useState(submission.description || '');
  const [link, setLink] = useState(submission.link || '');

  return (
    <tr className="bg-indigo-50/60 border-b border-indigo-100">
      <td colSpan={6} className="px-6 py-4">
        <div className="flex flex-col gap-3 max-w-2xl">
          <p className="text-xs font-bold text-indigo-700 uppercase tracking-wide">
            Editing submission — {submission.name} · Week {submission.week}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Description</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What did they build?"
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Link</label>
              <input
                type="url"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="https://..."
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => onSave({ description, link })}
              disabled={saving}
              className="flex items-center gap-1.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-xl transition disabled:opacity-50"
            >
              {saving ? (
                <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
              ) : null}
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
            <button
              onClick={onCancel}
              className="text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-xl transition"
            >
              Cancel
            </button>
          </div>
        </div>
      </td>
    </tr>
  );
}

// ── Main Tab ───────────────────────────────────────────────────────────────────
export default function SubmissionsTab() {
  const [weeks,       setWeeks]       = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [filterWeek,  setFilterWeek]  = useState('all');
  const [filterUser,  setFilterUser]  = useState('all');
  const [editingId,   setEditingId]   = useState(null);
  const [saving,      setSaving]      = useState(false);

  useEffect(() => {
    let weeksLoaded = false;
    let subLoaded   = false;
    const check = () => { if (weeksLoaded && subLoaded) setLoading(false); };

    const unsubWeeks = onSnapshot(
      query(collection(db, 'weeks'), orderBy('weekNumber', 'asc')),
      (snap) => { setWeeks(snap.docs.map((d) => ({ id: d.id, ...d.data() }))); weeksLoaded = true; check(); }
    );
    const unsubSubs = onSnapshot(collection(db, 'submissions'), (snap) => {
      const data = snap.docs
        .map((d) => ({ id: d.id, ...d.data(), timestamp: d.data().timestamp?.toDate?.() ?? null }))
        .sort((a, b) => (b.timestamp?.getTime() ?? 0) - (a.timestamp?.getTime() ?? 0));
      setSubmissions(data);
      subLoaded = true;
      check();
    });
    return () => { unsubWeeks(); unsubSubs(); };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg animate-pulse" />
          <p className="text-sm text-gray-400">Loading submissions…</p>
        </div>
      </div>
    );
  }

  const validWeekNumbers = new Set(weeks.map((w) => w.weekNumber));
  const validSubmissions = submissions.filter((s) => validWeekNumbers.has(s.week));

  const users = [
    ...new Map(
      validSubmissions.filter((s) => s.userId && s.name).map((s) => [s.userId, s.name])
    ).entries(),
  ].map(([userId, name]) => ({ userId, name })).sort((a, b) => a.name.localeCompare(b.name));

  const filtered = validSubmissions.filter((s) => {
    if (filterWeek !== 'all' && s.week !== Number(filterWeek)) return false;
    if (filterUser !== 'all' && s.userId !== filterUser) return false;
    return true;
  });

  const handleSave = async (submission, { description, link }) => {
    setSaving(true);
    try {
      await updateDoc(doc(db, 'submissions', submission.id), {
        description: description.trim(),
        link: link.trim(),
        updatedAt: serverTimestamp(),
      });
      setEditingId(null);
    } catch (err) {
      console.error('Failed to update submission:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (submission) => {
    if (!window.confirm(`Delete ${submission.name}'s submission for Week ${submission.week}? This cannot be undone.`)) return;
    try {
      await deleteDoc(doc(db, 'submissions', submission.id));
      if (editingId === submission.id) setEditingId(null);
    } catch (err) {
      console.error('Failed to delete submission:', err);
    }
  };

  const hasFilters = filterWeek !== 'all' || filterUser !== 'all';

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Submissions</h1>
        <p className="text-sm text-gray-400 mt-1">
          Showing {filtered.length} of {validSubmissions.length} submissions
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={filterWeek}
          onChange={(e) => setFilterWeek(e.target.value)}
          className="text-sm border border-gray-200 rounded-xl px-3 py-2 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
        >
          <option value="all">All Weeks</option>
          {weeks.map((w) => (
            <option key={w.weekNumber} value={w.weekNumber}>Week {w.weekNumber}</option>
          ))}
        </select>
        <select
          value={filterUser}
          onChange={(e) => setFilterUser(e.target.value)}
          className="text-sm border border-gray-200 rounded-xl px-3 py-2 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
        >
          <option value="all">All Users</option>
          {users.map((u) => (
            <option key={u.userId} value={u.userId}>{u.name}</option>
          ))}
        </select>
        {hasFilters && (
          <button
            onClick={() => { setFilterWeek('all'); setFilterUser('all'); }}
            className="text-sm text-gray-500 hover:text-gray-800 px-3 py-2 rounded-xl hover:bg-gray-100 transition"
          >
            Clear filters ✕
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="text-3xl mb-3">📭</div>
            <p className="text-sm font-semibold text-gray-700">No submissions found</p>
            <p className="text-xs text-gray-400 mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-widest px-6 py-3">User</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-widest px-6 py-3">Week</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-widest px-6 py-3">Description</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-widest px-6 py-3">Link</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-widest px-6 py-3">Submitted</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-widest px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <>
                    <tr key={s.id} className={`border-b border-gray-50 transition ${editingId === s.id ? 'bg-indigo-50/30' : 'hover:bg-gray-50'}`}>
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-indigo-600 text-xs font-bold">{s.name?.charAt(0)}</span>
                          </div>
                          <span className="text-sm font-medium text-gray-900 whitespace-nowrap">{s.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3.5">
                        <span className="bg-indigo-50 text-indigo-700 text-xs font-bold px-2 py-0.5 rounded-full">
                          W{s.week}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 max-w-[180px]">
                        <p className="text-sm text-gray-600 line-clamp-2">{s.description || '—'}</p>
                      </td>
                      <td className="px-6 py-3.5 max-w-[160px]">
                        {s.link ? (
                          <a href={s.link} target="_blank" rel="noopener noreferrer"
                            className="text-xs text-indigo-600 hover:underline block truncate">
                            {s.link.replace(/^https?:\/\//, '')}
                          </a>
                        ) : '—'}
                      </td>
                      <td className="px-6 py-3.5 text-xs text-gray-400 whitespace-nowrap">
                        {s.timestamp ? format(s.timestamp, 'MMM d, yyyy') : '—'}
                      </td>
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setEditingId(editingId === s.id ? null : s.id)}
                            className="text-xs font-semibold text-gray-500 hover:text-indigo-600 bg-gray-100 hover:bg-indigo-50 px-2.5 py-1.5 rounded-lg transition"
                          >
                            {editingId === s.id ? 'Cancel' : 'Edit'}
                          </button>
                          <button
                            onClick={() => handleDelete(s)}
                            className="text-xs font-semibold text-rose-400 hover:text-rose-600 bg-rose-50 hover:bg-rose-100 px-2.5 py-1.5 rounded-lg transition"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                    {editingId === s.id && (
                      <EditForm
                        key={`edit-${s.id}`}
                        submission={s}
                        saving={saving}
                        onSave={(vals) => handleSave(s, vals)}
                        onCancel={() => setEditingId(null)}
                      />
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
