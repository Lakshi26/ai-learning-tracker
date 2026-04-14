import { useState, useEffect } from 'react';
import {
  collection, query, orderBy, onSnapshot,
  addDoc, updateDoc, doc, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';

function MicIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
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

function EditIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

// ── Inline edit form ──────────────────────────────────────────────────────────
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
        className="flex-1 text-sm border border-gray-200 rounded-xl px-3.5 py-2 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition"
      />
      <button
        onClick={() => onSave(link.trim())}
        disabled={saving || !link.trim()}
        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
      >
        {saving ? <SpinnerIcon /> : null}
        {saving ? 'Saving…' : existing ? 'Update' : 'Add'}
      </button>
      <button
        onClick={onCancel}
        className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition"
      >
        Cancel
      </button>
    </div>
  );
}

// ── Main tab ──────────────────────────────────────────────────────────────────
export default function RecordingsTab({ currentUser }) {
  const [weeks,      setWeeks]      = useState([]);
  const [recordings, setRecordings] = useState({});
  const [editingWeek, setEditingWeek] = useState(null);
  const [saving,     setSaving]     = useState(false);
  const [loading,    setLoading]    = useState(true);

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
        await updateDoc(doc(db, 'recordings', existing.id), {
          recordingLink: link,
          updatedAt: serverTimestamp(),
        });
      } else {
        await addDoc(collection(db, 'recordings'), {
          week:          week.weekNumber,
          topic:         week.topic || '',
          recordingLink: link,
          createdBy:     currentUser.uid,
          createdByName: currentUser.name,
          updatedAt:     serverTimestamp(),
        });
      }
      setEditingWeek(null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Session Recordings</h1>
        <p className="text-sm text-gray-500">
          Add or update the audio/video recording for each week. Recordings are instantly visible to all team members.
        </p>
      </div>

      {/* Week list */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : weeks.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">
          No weeks found. Add weeks first from the Weeks tab.
        </div>
      ) : (
        <div className="space-y-3">
          {weeks.map((week) => {
            const rec = recordings[week.weekNumber];
            const isEditing = editingWeek === week.weekNumber;

            return (
              <div
                key={week.weekNumber}
                className={`bg-white rounded-2xl border p-5 transition-all ${
                  isEditing ? 'border-indigo-200 shadow-sm shadow-indigo-50' : 'border-gray-100'
                }`}
              >
                {/* Week header row */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Week badge */}
                    <span className="flex-shrink-0 text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-full">
                      Week {week.weekNumber}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{week.topic || '—'}</p>
                      {week.date && <p className="text-xs text-gray-400">{week.date}</p>}
                    </div>
                  </div>

                  {/* Action */}
                  {!isEditing && (
                    <button
                      onClick={() => { setEditingWeek(week.weekNumber); }}
                      className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                        rec
                          ? 'text-gray-600 bg-gray-100 hover:bg-gray-200'
                          : 'text-white bg-indigo-600 hover:bg-indigo-700'
                      }`}
                    >
                      {rec ? <><EditIcon /> Edit</> : <>+ Add Recording</>}
                    </button>
                  )}
                </div>

                {/* Existing recording preview */}
                {rec && !isEditing && (
                  <div className="mt-3 flex items-center gap-2 pl-1">
                    <span className="text-base">🎧</span>
                    <a
                      href={rec.recordingLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1 font-medium truncate max-w-xs"
                    >
                      {rec.recordingLink}
                      <LinkIcon />
                    </a>
                  </div>
                )}

                {/* Inline edit form */}
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
