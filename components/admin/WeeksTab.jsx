import { useState, useEffect, useRef, useCallback } from 'react';
import {
  collection, onSnapshot, addDoc, updateDoc,
  doc, serverTimestamp, query, orderBy, where, getDocs,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../lib/firebase';

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyWeeks({ onAdd }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-3xl mb-4">📅</div>
      <h3 className="text-base font-semibold text-gray-700 mb-1">No weeks created yet</h3>
      <p className="text-sm text-gray-400 mb-6">Create your first week to get started</p>
      <button
        onClick={onAdd}
        className="inline-flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition"
      >
        + Create First Week
      </button>
    </div>
  );
}

// ── Date helpers ──────────────────────────────────────────────────────────────
function toDateInputValue(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0]; // YYYY-MM-DD
}

function formatDateDisplay(raw) {
  if (!raw) return '';
  const d = new Date(raw + 'T00:00:00');
  if (isNaN(d.getTime())) return raw;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ── Week Form (create / edit) ─────────────────────────────────────────────────
function WeekForm({ initial, initialRecordingLink, onSave, onCancel, saving, currentUser }) {
  const datePickerRef = useRef(null);
  const [form, setForm] = useState({
    weekNumber:    initial?.weekNumber  ?? '',
    topic:         initial?.topic       ?? '',
    description:   initial?.description ?? '',
    date:          initial?.date        ?? '',
    dateRaw:       toDateInputValue(initial?.date ?? ''),
    images:        initial?.images      ?? [],
    recordingLink: initialRecordingLink ?? '',
  });
  const [imageUrl,   setImageUrl]   = useState('');
  const [uploading,  setUploading]  = useState(false);
  const [uploadErr,  setUploadErr]  = useState('');
  const fileRef = useRef(null);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const addImageUrl = () => {
    if (!imageUrl.trim()) return;
    set('images', [...form.images, imageUrl.trim()]);
    setImageUrl('');
  };

  const removeImage = (i) =>
    set('images', form.images.filter((_, idx) => idx !== i));

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadErr('');
    try {
      const storageRef = ref(storage, `weeks/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      set('images', [...form.images, url]);
    } catch (err) {
      console.error('Upload failed:', err);
      setUploadErr('Upload failed. Try pasting an image URL instead.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.weekNumber || !form.topic) return;
    onSave(form);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
      <h2 className="text-sm font-bold text-gray-900">
        {initial ? `Editing Week ${initial.weekNumber}` : 'Create New Week'}
      </h2>

      {/* Row 1: Week number + date */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-semibold text-gray-600 block mb-1.5">Week Number *</label>
          <input
            type="number" min="1" required
            value={form.weekNumber}
            onChange={(e) => set('weekNumber', e.target.value)}
            placeholder="e.g. 8"
            className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 block mb-1.5">Date</label>
          <div className="relative">
            <input
              type="text"
              readOnly
              value={form.date}
              placeholder="Pick a date"
              onClick={() => datePickerRef.current?.showPicker?.()}
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-indigo-400 cursor-pointer bg-white"
            />
            <input
              ref={datePickerRef}
              type="date"
              value={form.dateRaw}
              onChange={(e) => {
                const raw = e.target.value;
                set('dateRaw', raw);
                set('date', formatDateDisplay(raw));
              }}
              className="absolute inset-0 opacity-0 w-full cursor-pointer"
            />
            <button
              type="button"
              onClick={() => datePickerRef.current?.showPicker?.()}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-indigo-600 transition pointer-events-auto z-10"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Topic */}
      <div>
        <label className="text-xs font-semibold text-gray-600 block mb-1.5">Topic Title *</label>
        <input
          type="text" required
          value={form.topic}
          onChange={(e) => set('topic', e.target.value)}
          placeholder="e.g. Prompt Engineering Deep Dive"
          className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
      </div>

      {/* Description */}
      <div>
        <label className="text-xs font-semibold text-gray-600 block mb-1.5">
          Description <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <textarea
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
          placeholder="Brief description of what will be covered this week…"
          rows={2}
          className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
        />
      </div>

      {/* Images */}
      <div>
        <label className="text-xs font-semibold text-gray-600 block mb-1.5">
          Images <span className="text-gray-400 font-normal">(optional)</span>
        </label>

        {/* Paste URL */}
        <div className="flex gap-2 mb-2">
          <input
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addImageUrl())}
            placeholder="Paste image URL and press Add"
            className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <button
            type="button"
            onClick={addImageUrl}
            disabled={!imageUrl.trim()}
            className="text-sm font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3 py-2 rounded-xl transition disabled:opacity-40"
          >
            Add URL
          </button>
        </div>

        {/* Upload from computer */}
        <div className="flex items-center gap-2 mb-3">
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-xl transition disabled:opacity-40"
          >
            {uploading ? (
              <>
                <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Uploading…
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Upload from Computer
              </>
            )}
          </button>
          {uploadErr && <p className="text-xs text-rose-500">{uploadErr}</p>}
        </div>

        {/* Preview */}
        {form.images.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {form.images.map((url, i) => (
              <div key={i} className="relative group rounded-xl overflow-hidden aspect-video bg-gray-100">
                <img src={url} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  className="absolute top-1 right-1 w-5 h-5 bg-black/60 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recording Link */}
      <div>
        <label className="text-xs font-semibold text-gray-600 block mb-1.5">
          Recording Link <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base pointer-events-none">🎧</span>
          <input
            type="url"
            value={form.recordingLink}
            onChange={(e) => set('recordingLink', e.target.value)}
            placeholder="Paste audio / video URL (Drive, Loom, YouTube…)"
            className="w-full text-sm border border-gray-200 rounded-xl pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving || !form.weekNumber || !form.topic}
          className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Saving…
            </>
          ) : initial ? 'Save Changes' : 'Create Week'}
        </button>
      </div>
    </form>
  );
}

// ── Main WeeksTab ─────────────────────────────────────────────────────────────
export default function WeeksTab({ currentUser }) {
  const [weeks,               setWeeks]              = useState([]);
  const [recordings,          setRecordings]         = useState({});
  const [loading,             setLoading]            = useState(true);
  const [showForm,            setShowForm]           = useState(false);
  const [editingWeek,         setEditingWeek]        = useState(null);
  const [editingRecordingLink, setEditingRecordingLink] = useState('');
  const [saving,              setSaving]             = useState(false);
  const [lightbox,            setLightbox]           = useState(null);

  useEffect(() => {
    const unsubWeeks = onSnapshot(
      query(collection(db, 'weeks'), orderBy('weekNumber', 'asc')),
      (snap) => {
        setWeeks(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      }
    );
    const unsubRecs = onSnapshot(collection(db, 'recordings'), (snap) => {
      const map = {};
      snap.docs.forEach((d) => { const data = { id: d.id, ...d.data() }; map[data.week] = data; });
      setRecordings(map);
    });
    return () => { unsubWeeks(); unsubRecs(); };
  }, []);

  const handleSave = async (form) => {
    setSaving(true);
    try {
      const weekNum = Number(form.weekNumber);
      const data = {
        weekNumber:  weekNum,
        topic:       form.topic.trim(),
        description: form.description.trim(),
        date:        form.date.trim(),
        images:      form.images,
      };
      if (editingWeek) {
        await updateDoc(doc(db, 'weeks', editingWeek.id), { ...data, updatedAt: serverTimestamp() });
      } else {
        await addDoc(collection(db, 'weeks'), { ...data, createdBy: currentUser.uid, createdAt: serverTimestamp() });
      }
      // Save recording if provided
      if (form.recordingLink?.trim()) {
        const existing = recordings[weekNum];
        if (existing) {
          await updateDoc(doc(db, 'recordings', existing.id), {
            recordingLink: form.recordingLink.trim(), updatedAt: serverTimestamp(),
          });
        } else {
          await addDoc(collection(db, 'recordings'), {
            week: weekNum, topic: form.topic.trim(),
            recordingLink: form.recordingLink.trim(),
            createdBy: currentUser.uid, createdByName: currentUser.name,
            updatedAt: serverTimestamp(),
          });
        }
      }
      setShowForm(false);
      setEditingWeek(null);
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (week) => {
    setEditingWeek(week);
    setEditingRecordingLink(recordings[week.weekNumber]?.recordingLink ?? '');
    setShowForm(true);
  };

  const openCreate = () => {
    setEditingWeek(null);
    setEditingRecordingLink('');
    setShowForm(true);
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingWeek(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 bg-indigo-600 rounded-lg animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Weeks</h1>
          <p className="text-sm text-gray-400 mt-1">{weeks.length} sessions configured</p>
        </div>
        {!showForm && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition"
          >
            + Create New Week
          </button>
        )}
      </div>

      {/* Create / Edit form */}
      {showForm && (
        <WeekForm
          initial={editingWeek}
          initialRecordingLink={editingRecordingLink}
          onSave={handleSave}
          onCancel={cancelForm}
          saving={saving}
          currentUser={currentUser}
        />
      )}

      {/* Weeks list */}
      {weeks.length === 0 && !showForm ? (
        <EmptyWeeks onAdd={openCreate} />
      ) : (
        <div className="space-y-3">
          {weeks.map((week) => (
            <div
              key={week.id}
              className="bg-white rounded-2xl border border-gray-100 p-5 hover:border-indigo-200 transition"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
                    <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
                      Week {week.weekNumber}
                    </span>
                    {week.date && (
                      <span className="text-xs text-gray-400">{week.date}</span>
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-gray-900 mb-1">{week.topic}</h3>
                  {week.description && (
                    <p className="text-xs text-gray-500 line-clamp-2 mb-1">{week.description}</p>
                  )}
                  {recordings[week.weekNumber]?.recordingLink && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-xs">🎧</span>
                      <a
                        href={recordings[week.weekNumber].recordingLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs text-indigo-500 hover:underline truncate max-w-xs"
                      >
                        Recording added
                      </a>
                    </div>
                  )}
                  {/* Image thumbnails */}
                  {week.images?.length > 0 && (
                    <div className="flex gap-2 mt-3 flex-wrap">
                      {week.images.map((url, i) => (
                        <button
                          key={i}
                          onClick={() => setLightbox(url)}
                          className="w-16 h-10 rounded-lg overflow-hidden border border-gray-100 hover:border-indigo-300 transition"
                        >
                          <img src={url} alt="" className="w-full h-full object-cover" />
                        </button>
                      ))}
                      <span className="text-xs text-gray-400 self-center">
                        {week.images.length} image{week.images.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => openEdit(week)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-indigo-600 bg-gray-100 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition flex-shrink-0"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <img
            src={lightbox}
            alt=""
            className="max-w-3xl max-h-[80vh] rounded-2xl object-contain shadow-2xl"
          />
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 text-white bg-white/10 hover:bg-white/20 w-10 h-10 rounded-full flex items-center justify-center text-xl transition"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
