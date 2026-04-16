import { useState, useEffect } from 'react';
import {
  collection, query, orderBy, onSnapshot,
  addDoc, updateDoc, deleteDoc, doc, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';

function EditIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  );
}

function RecordingForm({ existing, onSave, onCancel, saving }) {
  const [link, setLink] = useState(existing?.recordingLink || '');
  return (
    <div className="mt-3 flex items-center gap-2">
      <input
        type="url"
        value={link}
        onChange={(e) => setLink(e.target.value)}
        placeholder="Paste audio / video URL (Drive, Loom, YouTube…)"
        autoFocus
        className="flex-1 text-sm border border-gray-200 rounded-xl px-3.5 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
      />
      <button
        onClick={() => onSave(link.trim())}
        disabled={saving || !link.trim()}
        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition"
      >
        {saving ? (
          <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
        ) : null}
        {saving ? 'Saving…' : existing ? 'Update' : 'Add'}
      </button>
      <button onClick={onCancel} className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition">
        Cancel
      </button>
    </div>
  );
}

export default function RecordingsTab({ currentUser }) {
  const [weeks,       setWeeks]       = useState([]);
  const [recordings,  setRecordings]  = useState({});
  const [editingWeek, setEditingWeek] = useState(null);
  const [saving,      setSaving]      = useState(false);
  const [loading,     setLoading]     = useState(true);

  useEffect(() => {
    const unsubWeeks = onSnapshot(
      query(collection(db, 'weeks'), orderBy('weekNumber', 'asc')),
      (snap) => { setWeeks(snap.docs.map((d) => ({ id: d.id, ...d.data() }))); setLoading(false); }
    );
    const unsubRecs = onSnapshot(collection(db, 'recordings'), (snap) => {
      const map = {};
      snap.docs.forEach((d) => { const data = { id: d.id, ...d.data() }; map[data.week] = data; });
      setRecordings(map);
    });
    return () => { unsubWeeks(); unsubRecs(); };
  }, []);

  const handleSave = async (week, link) => {
    if (!link) return;
    setSaving(true);
    try {
      const existing = recordings[week.weekNumber];
      if (existing) {
        await updateDoc(doc(db, 'recordings', existing.id), { recordingLink: link, updatedAt: serverTimestamp() });
      } else {
        await addDoc(collection(db, 'recordings'), {
          week: week.weekNumber, topic: week.topic || '',
          recordingLink: link,
          createdBy: currentUser.uid, createdByName: currentUser.name,
          updatedAt: serverTimestamp(),
        });
      }
      setEditingWeek(null);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (week) => {
    const rec = recordings[week.weekNumber];
    if (!rec) return;
    if (!window.confirm(`Delete the recording for Week ${week.weekNumber}? This cannot be undone.`)) return;
    try {
      await deleteDoc(doc(db, 'recordings', rec.id));
    } catch (err) {
      console.error('Failed to delete recording:', err);
    }
  };

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Session Recordings</h1>
        <p className="text-sm text-gray-500">Add, update, or remove audio/video recordings for each week.</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : weeks.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">No weeks found. Add weeks from the Weeks tab first.</div>
      ) : (
        <div className="space-y-3">
          {weeks.map((week) => {
            const rec = recordings[week.weekNumber];
            const isEditing = editingWeek === week.weekNumber;

            return (
              <div
                key={week.weekNumber}
                className={`bg-white rounded-2xl border p-5 transition-all ${isEditing ? 'border-indigo-200 shadow-sm' : 'border-gray-100'}`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="flex-shrink-0 text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-full">
                      Week {week.weekNumber}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{week.topic || '—'}</p>
                      {week.date && <p className="text-xs text-gray-400">{week.date}</p>}
                    </div>
                  </div>

                  {!isEditing && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => setEditingWeek(week.weekNumber)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                          rec ? 'text-gray-600 bg-gray-100 hover:bg-gray-200' : 'text-white bg-indigo-600 hover:bg-indigo-700'
                        }`}
                      >
                        {rec ? <><EditIcon /> Edit</> : '+ Add Recording'}
                      </button>
                      {rec && (
                        <button
                          onClick={() => handleDelete(week)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-400 hover:text-rose-600 bg-rose-50 hover:bg-rose-100 transition"
                        >
                          <TrashIcon /> Delete
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {rec && !isEditing && (
                  <div className="mt-3 flex items-center gap-2 pl-1">
                    <span className="text-base">🎧</span>
                    <a
                      href={rec.recordingLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-indigo-600 hover:underline flex items-center gap-1 font-medium truncate max-w-sm"
                    >
                      {rec.recordingLink}
                      <LinkIcon />
                    </a>
                  </div>
                )}

                {isEditing && (
                  <RecordingForm
                    existing={rec}
                    saving={saving}
                    onSave={(link) => handleSave(week, link)}
                    onCancel={() => setEditingWeek(null)}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
