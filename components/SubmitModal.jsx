import { useState, useEffect, useRef } from 'react';

function CloseIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

/**
 * SubmitModal — handles both new submissions and editing existing ones.
 *
 * Props:
 *   currentUser     – { name, uid, … }
 *   onSubmit        – async ({ link, description }) => void
 *   onClose         – () => void
 *   mode            – 'submit' (default) | 'edit'
 *   initialValues   – { link: '', description: '' }  (used in edit mode)
 */
export default function SubmitModal({
  currentUser,
  onSubmit,
  onClose,
  mode = 'submit',
  initialValues = { link: '', description: '' },
}) {
  const isEdit = mode === 'edit';

  const [form,    setForm]    = useState({ link: initialValues.link, description: initialValues.description });
  const [errors,  setErrors]  = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const linkRef               = useRef(null);

  // Auto-focus first field
  useEffect(() => { setTimeout(() => linkRef.current?.focus(), 50); }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const validate = () => {
    const errs = {};
    if (!form.link.trim())
      errs.link = 'A link is required.';
    else if (!/^https?:\/\/.+/.test(form.link.trim()))
      errs.link = 'Must start with https:// or http://';
    return errs;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
    if (errors[name]) setErrors((p) => ({ ...p, [name]: null }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setLoading(true);
    await onSubmit({ link: form.link.trim(), description: form.description.trim() });
    setLoading(false);
    setSuccess(true);
    setTimeout(onClose, 1200);
  };

  const MAX_DESC = 280;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-md rounded-2xl shadow-2xl shadow-black/10 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-0">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              {isEdit ? 'Edit Submission' : 'Submit Homework'}
            </h2>
            <p className="text-sm text-gray-400 mt-0.5">
              {isEdit ? 'Update your link or description' : 'Share your work with the team'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-300 hover:text-gray-500 transition-colors p-1 rounded-lg hover:bg-gray-50 -mt-1 -mr-1"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {success ? (
            <div className="flex flex-col items-center gap-3 py-6">
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
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>

              {/* Identity pill (read-only) */}
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

              {/* Link */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Link to Work <span className="text-rose-400">*</span>
                </label>
                <input
                  ref={linkRef}
                  type="url"
                  name="link"
                  value={form.link}
                  onChange={handleChange}
                  placeholder="https://figma.com/file/… or notion.so/…"
                  className={`w-full px-4 py-2.5 text-sm rounded-xl border placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition ${
                    errors.link ? 'border-rose-300 bg-rose-50' : 'border-gray-200'
                  }`}
                />
                {errors.link ? (
                  <p className="mt-1 text-xs text-rose-500">{errors.link}</p>
                ) : (
                  <p className="mt-1 text-xs text-gray-400">Figma, Notion, Google Drive, or any public URL</p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Short Description
                  <span className="ml-1 normal-case font-normal text-gray-400">(optional)</span>
                </label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="What did you explore? Any key learnings or design decisions?"
                  rows={3}
                  maxLength={MAX_DESC}
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition resize-none"
                />
                <p className={`text-right text-xs mt-1 ${form.description.length > MAX_DESC * 0.9 ? 'text-amber-500' : 'text-gray-300'}`}>
                  {form.description.length}/{MAX_DESC}
                </p>
              </div>

              {/* Action row */}
              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-500 border border-gray-200 hover:bg-gray-50 hover:text-gray-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 active:bg-indigo-800 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                      {isEdit ? 'Saving…' : 'Submitting…'}
                    </>
                  ) : isEdit ? 'Save Changes →' : 'Submit Homework →'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
