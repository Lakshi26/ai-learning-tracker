import { useState, useEffect, useRef, useCallback } from 'react';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../lib/firebase';

// ─── Icons ────────────────────────────────────────────────────────────────────
function CloseIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
  );
}

// ─── File type helpers ────────────────────────────────────────────────────────
const ACCEPT_IMAGE    = ['image/jpeg','image/png','image/gif','image/webp','image/svg+xml'];
const ACCEPT_VIDEO    = ['video/mp4','video/webm','video/quicktime','video/ogg'];
const ACCEPT_DOCUMENT = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
];
const ALL_ACCEPT = [...ACCEPT_IMAGE, ...ACCEPT_VIDEO, ...ACCEPT_DOCUMENT];

function getFileKind(mimeType) {
  if (ACCEPT_IMAGE.includes(mimeType))    return 'image';
  if (ACCEPT_VIDEO.includes(mimeType))    return 'video';
  if (ACCEPT_DOCUMENT.includes(mimeType)) return 'document';
  return 'other';
}

function fileKindIcon(kind) {
  const icons = {
    image:    '🖼️',
    video:    '🎬',
    document: '📄',
    other:    '📎',
  };
  return icons[kind] ?? '📎';
}

function formatBytes(bytes) {
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Single file upload item ──────────────────────────────────────────────────
function FileItem({ file, progress, onRemove }) {
  const kind    = getFileKind(file.type);
  const preview = kind === 'image' ? URL.createObjectURL(file) : null;
  const done    = progress === 100;
  const uploading = progress > 0 && progress < 100;

  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
      {/* Preview / icon */}
      {preview ? (
        <img
          src={preview}
          alt={file.name}
          className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-gray-100"
        />
      ) : (
        <div className="w-10 h-10 rounded-lg bg-white border border-gray-100 flex items-center justify-center text-lg flex-shrink-0">
          {fileKindIcon(kind)}
        </div>
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-gray-700 truncate">{file.name}</p>
        <p className="text-[10px] text-gray-400">{formatBytes(file.size)}</p>
        {/* Progress bar */}
        {(uploading || done) && (
          <div className="mt-1 h-1 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${done ? 'bg-emerald-400' : 'bg-indigo-500'}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>

      {/* Status / remove */}
      {done ? (
        <span className="text-emerald-500 text-xs font-bold flex-shrink-0">✓</span>
      ) : uploading ? (
        <span className="text-indigo-400 text-[10px] font-semibold flex-shrink-0">{Math.round(progress)}%</span>
      ) : (
        <button
          type="button"
          onClick={onRemove}
          className="text-gray-300 hover:text-rose-400 transition-colors flex-shrink-0 p-1 rounded-lg hover:bg-rose-50"
        >
          <TrashIcon />
        </button>
      )}
    </div>
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────
/**
 * SubmitModal — supports link, text, and file uploads (image / video / document).
 *
 * Props:
 *   currentUser     – { name, uid, … }
 *   selectedWeek    – week number (used for storage path)
 *   onSubmit        – async ({ link, description, text, files }) => void
 *                     files = [{ url, name, type, kind, size }]
 *   onClose         – () => void
 *   mode            – 'submit' | 'edit'
 *   initialValues   – { link, description, text, files }
 */
export default function SubmitModal({
  currentUser,
  selectedWeek = 1,
  onSubmit,
  onClose,
  mode = 'submit',
  initialValues = { link: '', description: '', text: '', files: [] },
}) {
  const isEdit = mode === 'edit';

  const [form, setForm] = useState({
    link:        initialValues.link        ?? '',
    description: initialValues.description ?? '',
    text:        initialValues.text        ?? '',
  });
  const [errors,   setErrors]   = useState({});
  const [loading,  setLoading]  = useState(false);
  const [success,  setSuccess]  = useState(false);
  const [dragging, setDragging] = useState(false);

  // Files: { file: File, progress: 0–100, url: string|null, error: string|null }
  const [pendingFiles, setPendingFiles] = useState([]);
  // Already-uploaded files (edit mode)
  const [existingFiles, setExistingFiles] = useState(initialValues.files ?? []);

  const fileInputRef = useRef(null);
  const linkRef      = useRef(null);

  useEffect(() => { setTimeout(() => linkRef.current?.focus(), 50); }, []);
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // ── Validation ──────────────────────────────────────────────────────────────
  const validate = () => {
    const errs = {};
    const hasLink  = form.link.trim().length > 0;
    const hasText  = form.text.trim().length > 0;
    const hasFiles = pendingFiles.length > 0 || existingFiles.length > 0;

    if (hasLink && !/^https?:\/\/.+/.test(form.link.trim())) {
      errs.link = 'Must start with https:// or http://';
    }

    if (!hasLink && !hasText && !hasFiles) {
      errs.general = 'Add a link, text, or upload at least one file.';
    }

    const stillUploading = pendingFiles.some((f) => f.progress > 0 && f.progress < 100);
    if (stillUploading) errs.general = 'Please wait for all uploads to finish.';

    const failed = pendingFiles.some((f) => f.error);
    if (failed) errs.general = 'Some files failed to upload. Remove them and try again.';

    return errs;
  };

  // ── File handling ───────────────────────────────────────────────────────────
  const addFiles = useCallback((fileList) => {
    const newFiles = Array.from(fileList)
      .filter((f) => ALL_ACCEPT.includes(f.type) || f.type.startsWith('image/') || f.type.startsWith('video/'))
      .filter((f) => f.size <= 50 * 1024 * 1024) // 50 MB max
      .map((f) => ({ file: f, progress: 0, url: null, error: null, id: `${Date.now()}_${Math.random()}` }));

    if (newFiles.length === 0) return;

    setPendingFiles((prev) => {
      const combined = [...prev, ...newFiles];
      // Kick off uploads for newly added files
      newFiles.forEach((item) => uploadFile(item, combined.length));
      return combined;
    });
  }, [currentUser, selectedWeek]);

  const uploadFile = (item, _) => {
    const path = `submissions/week${selectedWeek}/${currentUser.uid}/${Date.now()}_${item.file.name}`;
    const storageRef = ref(storage, path);
    const task = uploadBytesResumable(storageRef, item.file);

    task.on(
      'state_changed',
      (snap) => {
        const pct = (snap.bytesTransferred / snap.totalBytes) * 100;
        setPendingFiles((prev) =>
          prev.map((f) => (f.id === item.id ? { ...f, progress: pct } : f))
        );
      },
      (err) => {
        console.error('[Upload] failed:', err);
        setPendingFiles((prev) =>
          prev.map((f) => (f.id === item.id ? { ...f, error: err.message } : f))
        );
      },
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        setPendingFiles((prev) =>
          prev.map((f) =>
            f.id === item.id ? { ...f, progress: 100, url } : f
          )
        );
      }
    );
  };

  const removeFile = (id) => setPendingFiles((prev) => prev.filter((f) => f.id !== id));
  const removeExistingFile = (url) => setExistingFiles((prev) => prev.filter((f) => f.url !== url));

  // ── Drag & drop ─────────────────────────────────────────────────────────────
  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  };

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setLoading(true);

    // Collect uploaded file metadata
    const uploadedFiles = pendingFiles
      .filter((f) => f.url)
      .map((f) => ({
        url:  f.url,
        name: f.file.name,
        type: f.file.type,
        kind: getFileKind(f.file.type),
        size: f.file.size,
      }));

    const allFiles = [...existingFiles, ...uploadedFiles];

    await onSubmit({
      link:        form.link.trim(),
      description: form.description.trim(),
      text:        form.text.trim(),
      files:       allFiles,
    });

    setLoading(false);
    setSuccess(true);
    setTimeout(onClose, 1400);
  };

  const MAX_DESC = 280;
  const MAX_TEXT = 2000;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl shadow-black/10 animate-slide-up flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between p-5 pb-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              {isEdit ? 'Edit Submission' : 'Submit Homework'}
            </h2>
            <p className="text-sm text-gray-400 mt-0.5">
              {isEdit ? 'Update your work' : 'Share your work with the team'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-300 hover:text-gray-500 transition-colors p-1 rounded-lg hover:bg-gray-50 -mt-1 -mr-1"
          >
            <CloseIcon />
          </button>
        </div>

        {/* ── Scrollable body ─────────────────────────────────────────── */}
        <div className="overflow-y-auto flex-1 p-5">
          {success ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-2xl">
                {isEdit ? '✏️' : '🎉'}
              </div>
              <p className="text-sm font-semibold text-gray-800">
                {isEdit ? 'Submission updated!' : 'Homework submitted!'}
              </p>
              <p className="text-xs text-gray-400">
                {isEdit ? 'Your changes are live.' : "It's live in the gallery now."}
              </p>
            </div>
          ) : (
            <form id="submit-form" onSubmit={handleSubmit} className="space-y-5" noValidate>

              {/* Identity pill */}
              <div className="flex items-center gap-2.5 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
                <div className="w-7 h-7 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-indigo-600 text-xs font-semibold">
                    {currentUser?.name?.charAt(0) ?? '?'}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-400 leading-tight">
                    {isEdit ? 'Editing as' : 'Submitting as'}
                  </p>
                  <p className="text-sm font-semibold text-gray-800 truncate">{currentUser?.name}</p>
                </div>
              </div>

              {/* General error */}
              {errors.general && (
                <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-100 rounded-xl">
                  <span className="text-rose-400 text-sm">⚠️</span>
                  <p className="text-xs text-rose-600 font-medium">{errors.general}</p>
                </div>
              )}

              {/* ── Section 1: Link ─────────────────────────────────────── */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Link <span className="normal-case font-normal text-gray-400">(optional)</span>
                </label>
                <input
                  ref={linkRef}
                  type="url"
                  name="link"
                  value={form.link}
                  onChange={(e) => {
                    setForm((p) => ({ ...p, link: e.target.value }));
                    if (errors.link) setErrors((p) => ({ ...p, link: null, general: null }));
                  }}
                  placeholder="https://figma.com/file/… or notion.so/…"
                  className={`w-full px-4 py-2.5 text-sm rounded-xl border placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition ${
                    errors.link ? 'border-rose-300 bg-rose-50' : 'border-gray-200'
                  }`}
                />
                {errors.link ? (
                  <p className="mt-1 text-xs text-rose-500">{errors.link}</p>
                ) : (
                  <p className="mt-1 text-xs text-gray-400">Figma, Notion, Google Drive, Behance, or any public URL</p>
                )}
              </div>

              {/* ── Section 2: Short note ───────────────────────────────── */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Short Note <span className="normal-case font-normal text-gray-400">(optional)</span>
                </label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={(e) => {
                    setForm((p) => ({ ...p, description: e.target.value }));
                    setErrors((p) => ({ ...p, general: null }));
                  }}
                  placeholder="Key takeaways, design decisions, what you explored…"
                  rows={2}
                  maxLength={MAX_DESC}
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition resize-none"
                />
                <p className={`text-right text-xs mt-0.5 ${form.description.length > MAX_DESC * 0.9 ? 'text-amber-500' : 'text-gray-300'}`}>
                  {form.description.length}/{MAX_DESC}
                </p>
              </div>

              {/* ── Section 3: Long text ────────────────────────────────── */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Detailed Write-up <span className="normal-case font-normal text-gray-400">(optional)</span>
                </label>
                <textarea
                  name="text"
                  value={form.text}
                  onChange={(e) => {
                    setForm((p) => ({ ...p, text: e.target.value }));
                    setErrors((p) => ({ ...p, general: null }));
                  }}
                  placeholder="Go deeper — explain your process, reflections, experiments…"
                  rows={4}
                  maxLength={MAX_TEXT}
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition resize-none"
                />
                <p className={`text-right text-xs mt-0.5 ${form.text.length > MAX_TEXT * 0.9 ? 'text-amber-500' : 'text-gray-300'}`}>
                  {form.text.length}/{MAX_TEXT}
                </p>
              </div>

              {/* ── Section 4: File upload ──────────────────────────────── */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Upload Files <span className="normal-case font-normal text-gray-400">(optional — images, videos, PDFs)</span>
                </label>

                {/* Drop zone */}
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${
                    dragging
                      ? 'border-indigo-400 bg-indigo-50'
                      : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
                  }`}
                >
                  <UploadIcon />
                  <p className="text-sm font-medium text-gray-500">
                    {dragging ? 'Drop files here' : 'Click or drag files here'}
                  </p>
                  <p className="text-xs text-gray-400">Images, videos, PDFs, Word docs · Max 50 MB each</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept={ALL_ACCEPT.join(',')}
                    className="hidden"
                    onChange={(e) => addFiles(e.target.files)}
                  />
                </div>

                {/* Existing files (edit mode) */}
                {existingFiles.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {existingFiles.map((f) => (
                      <div key={f.url} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                        <div className="w-10 h-10 rounded-lg bg-white border border-gray-100 flex items-center justify-center text-lg flex-shrink-0">
                          {fileKindIcon(f.kind)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-700 truncate">{f.name}</p>
                          <p className="text-[10px] text-gray-400">{f.kind} · already uploaded</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeExistingFile(f.url)}
                          className="text-gray-300 hover:text-rose-400 transition-colors flex-shrink-0 p-1 rounded-lg hover:bg-rose-50"
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Pending file list */}
                {pendingFiles.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {pendingFiles.map((item) => (
                      <FileItem
                        key={item.id}
                        file={item.file}
                        progress={item.progress}
                        onRemove={() => removeFile(item.id)}
                      />
                    ))}
                  </div>
                )}
              </div>

            </form>
          )}
        </div>

        {/* ── Footer actions ───────────────────────────────────────────── */}
        {!success && (
          <div className="flex gap-2.5 p-5 pt-4 border-t border-gray-100 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-500 border border-gray-200 hover:bg-gray-50 hover:text-gray-700 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="submit-form"
              disabled={loading}
              className="flex-1 bg-gray-900 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-800 active:bg-gray-700 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <><SpinnerIcon />{isEdit ? 'Saving…' : 'Submitting…'}</>
              ) : isEdit ? 'Save Changes →' : 'Submit →'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
