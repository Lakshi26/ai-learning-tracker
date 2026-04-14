import { useState, useEffect, useRef } from 'react';

function CloseIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

export default function MarkPresentModal({ defaultName, alreadyPresent, onSubmit, onClose }) {
  const [name, setName]       = useState(defaultName || '');
  const [loading, setLoading] = useState(false);
  const inputRef              = useRef(null);

  // Auto-focus name input
  useEffect(() => {
    if (!alreadyPresent) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [alreadyPresent]);

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    await onSubmit(name.trim());
    setLoading(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-sm rounded-2xl shadow-2xl shadow-black/10 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-0">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Mark Attendance</h2>
            <p className="text-sm text-gray-400 mt-0.5">
              {alreadyPresent ? "You're already marked present!" : "Let the team know you're here 👋"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-300 hover:text-gray-500 transition-colors -mt-1 -mr-1 p-1 rounded-lg hover:bg-gray-50"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {alreadyPresent ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center text-2xl">
                ✓
              </div>
              <p className="text-sm text-emerald-700 font-medium">
                You&apos;re marked present as <strong>{defaultName}</strong>
              </p>
              <button
                onClick={onClose}
                className="mt-2 w-full bg-gray-900 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-gray-700 transition"
              >
                Got it
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Your Name
                </label>
                <input
                  ref={inputRef}
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Priya Sharma"
                  maxLength={60}
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder:text-gray-300 transition"
                />
              </div>
              <button
                type="submit"
                disabled={!name.trim() || loading}
                className="w-full bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 active:bg-indigo-800 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Marking...
                  </>
                ) : (
                  '✓ Mark as Present'
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
