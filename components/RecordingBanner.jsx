import { useState } from 'react';
import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

// ── Helpers ───────────────────────────────────────────────────────────────────
function detectPlatform(url) {
  if (!url) return null;
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'YouTube';
  if (url.includes('loom.com'))  return 'Loom';
  if (url.includes('drive.google.com')) return 'Google Drive';
  if (url.includes('vimeo.com')) return 'Vimeo';
  return 'Recording';
}

// ── Modal ─────────────────────────────────────────────────────────────────────
function RecordingModal({ existing, onSave, onClose, saving }) {
  const [link, setLink] = useState(existing?.recordingLink || '');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!link.trim()) return;
    onSave(link.trim());
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <span className="text-lg">🎥</span>
            <h2 className="text-sm font-bold text-gray-900">
              {existing ? 'Edit Recording' : 'Add Session Recording'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center transition"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1.5">
              Recording Link
            </label>
            <input
              type="url"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://drive.google.com/... or YouTube / Loom link"
              required
              autoFocus
              className="w-full text-sm border border-gray-200 rounded-xl px-3.5 py-2.5 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition"
            />
            <p className="text-xs text-gray-400 mt-1.5">
              Supports Google Drive, YouTube, Loom, Vimeo, or any URL
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2.5 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !link.trim()}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Saving…
                </>
              ) : existing ? 'Save Changes' : 'Add Recording'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Recording Banner ──────────────────────────────────────────────────────────
export default function RecordingBanner({ recording, currentUser, selectedWeek, selectedSession }) {
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving]       = useState(false);

  const isCreator = recording && recording.userId === currentUser?.uid;
  const platform  = detectPlatform(recording?.recordingLink);

  const handleSave = async (link) => {
    if (!currentUser) return;
    setSaving(true);
    try {
      if (recording) {
        // Edit — only creator can reach here
        await updateDoc(doc(db, 'recordings', recording.id), {
          recordingLink: link,
          timestamp: serverTimestamp(),
        });
      } else {
        // Add new recording
        await addDoc(collection(db, 'recordings'), {
          week:          selectedWeek,
          topic:         selectedSession?.topic || '',
          recordingLink: link,
          userId:        currentUser.uid,
          name:          currentUser.name,
          timestamp:     serverTimestamp(),
        });
      }
      setShowModal(false);
    } finally {
      setSaving(false);
    }
  };

  // ── No recording yet ────────────────────────────────────────────────────
  if (!recording) {
    return (
      <>
        <div className="flex items-center justify-between bg-white border border-gray-200 rounded-2xl px-5 py-3.5">
          <div className="flex items-center gap-2.5 text-gray-400">
            <span className="text-base">🎥</span>
            <span className="text-sm">No recording added for this week yet</span>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition"
          >
            + Add Recording
          </button>
        </div>

        {showModal && (
          <RecordingModal
            existing={null}
            onSave={handleSave}
            onClose={() => setShowModal(false)}
            saving={saving}
          />
        )}
      </>
    );
  }

  // ── Recording exists ────────────────────────────────────────────────────
  return (
    <>
      <div className="flex items-center justify-between bg-indigo-50 border border-indigo-100 rounded-2xl px-5 py-3.5 gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 bg-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0 text-base">
            🎥
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-indigo-400 uppercase tracking-widest mb-0.5">
              Session Recording
            </p>
            <a
              href={recording.recordingLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-semibold text-indigo-700 hover:text-indigo-900 hover:underline flex items-center gap-1.5 truncate"
            >
              Watch {platform}
              <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Added by */}
          <span className="text-xs text-indigo-400 hidden sm:block">
            Added by <span className="font-semibold">{recording.name}</span>
          </span>

          {/* Edit button — only for creator */}
          {isCreator && (
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-white hover:bg-indigo-100 border border-indigo-200 px-3 py-1.5 rounded-lg transition"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              Edit
            </button>
          )}
        </div>
      </div>

      {showModal && (
        <RecordingModal
          existing={recording}
          onSave={handleSave}
          onClose={() => setShowModal(false)}
          saving={saving}
        />
      )}
    </>
  );
}
