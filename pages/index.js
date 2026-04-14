import { useState, useEffect } from 'react';
import Head from 'next/head';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { getRoles, isAdmin, ALLOWED_DOMAIN } from '../lib/roles';
import HomeworkCard    from '../components/HomeworkCard';
import SubmitModal     from '../components/SubmitModal';
import AuthGate        from '../components/AuthGate';
import RecordingBanner from '../components/RecordingBanner';
import AdminLayout     from '../components/admin/AdminLayout';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function extractNameFromEmail(email) {
  const local = email.split('@')[0];
  return local.split('.').map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(' ');
}

function getInitials(name = '') {
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}

const AVATAR_COLORS = [
  'bg-indigo-100 text-indigo-700',
  'bg-violet-100 text-violet-700',
  'bg-sky-100 text-sky-700',
  'bg-emerald-100 text-emerald-700',
  'bg-rose-100 text-rose-700',
  'bg-amber-100 text-amber-700',
  'bg-teal-100 text-teal-700',
  'bg-pink-100 text-pink-700',
];

function getAvatarColor(name = '') {
  const idx = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}

// ─── Icons ────────────────────────────────────────────────────────────────────
function LightbulbIcon() {
  return (
    <svg className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function SpinnerIcon({ className = 'w-3.5 h-3.5' }) {
  return (
    <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

// ─── Loading screen ───────────────────────────────────────────────────────────
function LoadingScreen() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
          <SpinnerIcon className="w-5 h-5 text-white" />
        </div>
        <p className="text-xs text-gray-400 font-medium">Loading your workspace…</p>
      </div>
    </div>
  );
}

// ─── Skeleton card ────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4" style={{ boxShadow: 'var(--shadow-card)' }}>
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 skeleton rounded-xl flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-3 skeleton rounded-lg w-2/5" />
          <div className="h-2.5 skeleton rounded-lg w-1/4" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-2.5 skeleton rounded-lg w-full" />
        <div className="h-2.5 skeleton rounded-lg w-4/5" />
        <div className="h-2.5 skeleton rounded-lg w-2/3" />
      </div>
      <div className="pt-3 border-t border-gray-50 flex justify-between">
        <div className="h-3 skeleton rounded-lg w-16" />
        <div className="h-3 skeleton rounded-lg w-8" />
      </div>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyState({ onSubmit }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center animate-fade-in">
      <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-2xl mb-4 border border-indigo-100">
        📭
      </div>
      <h3 className="text-sm font-semibold text-gray-800 mb-1">No submissions yet</h3>
      <p className="text-sm text-gray-400 max-w-xs mb-5 leading-relaxed">
        Be the first to share your homework for this week&apos;s session.
      </p>
      <button
        onClick={onSubmit}
        className="inline-flex items-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-800 active:bg-gray-700 transition-all"
      >
        Submit Homework →
      </button>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function Home() {
  // Auth
  const [currentUser,  setCurrentUser]  = useState(null);
  const [roles,        setRoles]        = useState([]);
  const [currentView,  setCurrentView]  = useState('team');
  const [authLoading,  setAuthLoading]  = useState(true);
  const [authError,    setAuthError]    = useState('');

  // Data
  const [weeks,        setWeeks]        = useState([]);
  const [weeksLoading, setWeeksLoading] = useState(true);
  const [submissions,  setSubmissions]  = useState([]);
  const [attendance,   setAttendance]   = useState([]);
  const [recording,    setRecording]    = useState(null);
  const [dataLoading,  setDataLoading]  = useState(true);

  // UI
  const [selectedWeek,      setSelectedWeek]      = useState(null);
  const [filter,            setFilter]            = useState('all');
  const [showSubmitModal,   setShowSubmitModal]   = useState(false);
  const [editingSubmission, setEditingSubmission] = useState(null);
  const [markingPresent,    setMarkingPresent]    = useState(false);
  const [unmarkingPresent,  setUnmarkingPresent]  = useState(false);

  // ── Auth listener ──────────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        const userRoles = getRoles(fbUser.email);
        if (userRoles.length === 0) {
          await signOut(auth);
          setCurrentUser(null);
          setRoles([]);
        } else {
          setCurrentUser({ uid: fbUser.uid, email: fbUser.email, name: extractNameFromEmail(fbUser.email) });
          setRoles(userRoles);
          setAuthError('');
        }
      } else {
        setCurrentUser(null);
        setRoles([]);
        setCurrentView('team');
      }
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  // ── Weeks listener ─────────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, 'weeks'), orderBy('weekNumber', 'asc')),
      (snap) => {
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setWeeks(data);
        setWeeksLoading(false);
        setSelectedWeek((prev) => {
          if (prev !== null) return prev;
          return data.length > 0 ? data[data.length - 1].weekNumber : 1;
        });
      }
    );
    return () => unsub();
  }, []);

  // ── Per-week Firestore listeners ───────────────────────────────────────────
  useEffect(() => {
    if (!currentUser || selectedWeek === null) return;
    setDataLoading(true);

    const subUnsub = onSnapshot(
      query(collection(db, 'submissions'), where('week', '==', selectedWeek)),
      (snap) => {
        const data = snap.docs
          .map((d) => ({ id: d.id, ...d.data(), timestamp: d.data().timestamp?.toDate?.() ?? null }))
          .sort((a, b) => (b.timestamp?.getTime() ?? 0) - (a.timestamp?.getTime() ?? 0));
        setSubmissions(data);
        setDataLoading(false);
      }
    );

    const attUnsub = onSnapshot(
      query(collection(db, 'attendance'), where('week', '==', selectedWeek)),
      (snap) => setAttendance(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );

    const recUnsub = onSnapshot(
      query(collection(db, 'recordings'), where('week', '==', selectedWeek)),
      (snap) => {
        if (!snap.empty) { const d = snap.docs[0]; setRecording({ id: d.id, ...d.data() }); }
        else setRecording(null);
      }
    );

    return () => { subUnsub(); attUnsub(); recUnsub(); };
  }, [currentUser, selectedWeek]);

  // ── Derived ────────────────────────────────────────────────────────────────
  const isPresent    = attendance.some((a) => a.userId === currentUser?.uid);
  const hasSubmitted = submissions.some((s) => s.userId === currentUser?.uid);
  const presentIds   = new Set(attendance.map((a) => a.userId));
  const selectedSession = weeks.find((w) => w.weekNumber === selectedWeek)
    ?? weeks.at(-1)
    ?? { weekNumber: selectedWeek, topic: '', date: '', description: '', images: [] };
  const filteredSubmissions = filter === 'present'
    ? submissions.filter((s) => presentIds.has(s.userId))
    : submissions;
  const presentFilteredCount = submissions.filter((s) => presentIds.has(s.userId)).length;

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleMarkPresent = async () => {
    if (!currentUser || isPresent || markingPresent || !selectedWeek) return;
    setMarkingPresent(true);
    try {
      await addDoc(collection(db, 'attendance'), {
        userId: currentUser.uid, name: currentUser.name,
        week: selectedWeek, topic: selectedSession?.topic ?? '',
        timestamp: serverTimestamp(),
      });
    } finally { setMarkingPresent(false); }
  };

  const handleUnmarkPresent = async () => {
    if (!currentUser || !isPresent || unmarkingPresent) return;
    const attDoc = attendance.find((a) => a.userId === currentUser.uid);
    if (!attDoc) return;
    setUnmarkingPresent(true);
    try { await deleteDoc(doc(db, 'attendance', attDoc.id)); }
    finally { setUnmarkingPresent(false); }
  };

  const handleSubmitHomework = async ({ link, description }) => {
    if (!currentUser) return;
    const docRef = await addDoc(collection(db, 'submissions'), {
      userId: currentUser.uid, name: currentUser.name,
      week: selectedWeek, topic: selectedSession?.topic ?? '',
      link, description, likes: [], timestamp: serverTimestamp(),
    });
    setShowSubmitModal(false);
    generateAndStoreFeedback(docRef.id, description, link, selectedWeek, selectedSession?.topic ?? '');
  };

  const handleEditSubmission = async ({ link, description }) => {
    if (!editingSubmission) return;
    await updateDoc(doc(db, 'submissions', editingSubmission.id), { link, description, updatedAt: serverTimestamp() });
    setEditingSubmission(null);
  };

  const generateAndStoreFeedback = async (docId, description, link, week, topic) => {
    try {
      const res = await fetch('/api/generate-feedback', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description, link, week, topic }),
      });
      const data = await res.json();
      if (res.ok && data.feedback) {
        await updateDoc(doc(db, 'submissions', docId), { aiFeedback: data.feedback, feedbackGeneratedAt: serverTimestamp() });
      }
    } catch (err) { console.error('[Feedback] Failed:', err); }
  };

  const handleRegenerateFeedback = (id, description, link, week, topic) =>
    generateAndStoreFeedback(id, description, link, week, topic);

  const handleLike = async (submissionId, currentLikes) => {
    if (!currentUser) return;
    const safeList = Array.isArray(currentLikes) ? currentLikes : [];
    const hasLiked = safeList.some((l) => l.userId === currentUser.uid);
    await updateDoc(doc(db, 'submissions', submissionId), {
      likes: hasLiked
        ? safeList.filter((l) => l.userId !== currentUser.uid)
        : [...safeList, { userId: currentUser.uid, name: currentUser.name }],
    });
  };

  const handleSignOut = () => signOut(auth);

  // ── Render guards ──────────────────────────────────────────────────────────
  if (authLoading)                           return <LoadingScreen />;
  if (!currentUser)                          return <AuthGate authError={authError} />;
  if (weeksLoading || selectedWeek === null) return <LoadingScreen />;

  if (currentView === 'admin' && isAdmin(roles)) {
    return (
      <>
        <Head><title>Admin Portal — KUWA</title><meta name="robots" content="noindex" /></Head>
        <AdminLayout currentUser={currentUser} onSwitchToTeam={() => setCurrentView('team')} />
      </>
    );
  }

  // ── Main render ────────────────────────────────────────────────────────────
  return (
    <>
      <Head>
        <title>KUWA — AI Learning Sessions</title>
        <meta name="description" content="KUWA — weekly AI learning sessions for the design team" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>💡</text></svg>" />
      </Head>

      <div className="min-h-screen bg-white">

        {/* ══════════════════════════════════════════════════════════════
            TOP NAV — sticky, white, with logo · week tabs · user info
        ══════════════════════════════════════════════════════════════ */}
        <header className="sticky top-0 z-30 bg-white border-b border-gray-100">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 h-[56px] flex items-center gap-4">

            {/* Logo */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <LightbulbIcon />
              <span className="font-semibold text-gray-900 text-sm tracking-tight whitespace-nowrap">
                KUWA
              </span>
            </div>

            {/* Divider */}
            <div className="w-px h-5 bg-gray-200 flex-shrink-0" />

            {/* ── Week tabs ─────────────────────────────────────────── */}
            <div className="flex items-center gap-1 overflow-x-auto flex-1 hide-scrollbar">
              {weeksLoading ? (
                [...Array(4)].map((_, i) => (
                  <div key={i} className="flex-shrink-0 w-20 h-7 skeleton rounded-lg" />
                ))
              ) : weeks.map((w) => {
                const active = selectedWeek === w.weekNumber;
                return (
                  <button
                    key={w.weekNumber}
                    onClick={() => { setSelectedWeek(w.weekNumber); setFilter('all'); }}
                    title={w.topic}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                      active
                        ? 'bg-indigo-600 text-white'
                        : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    Week {w.weekNumber}
                  </button>
                );
              })}
            </div>

            {/* ── Right: avatar + name + Admin button ───────────────── */}
            <div className="flex items-center gap-2.5 flex-shrink-0">
              {/* Avatar */}
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${getAvatarColor(currentUser.name)}`}>
                {getInitials(currentUser.name)}
              </div>

              {/* Name */}
              <span className="hidden sm:block text-sm font-medium text-gray-700 max-w-[120px] truncate">
                {currentUser.name}
              </span>

              {/* Admin button — shown to admins */}
              {isAdmin(roles) && (
                <button
                  onClick={() => setCurrentView('admin')}
                  className="text-[11px] font-semibold text-gray-600 border border-gray-200 hover:border-indigo-300 hover:text-indigo-600 px-3 py-1 rounded-full transition-colors"
                >
                  Admin
                </button>
              )}

              {/* Sign out */}
              <button
                onClick={handleSignOut}
                title="Sign out"
                className="text-[11px] font-medium text-gray-400 hover:text-gray-600 transition-colors"
              >
                Sign out
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-4 sm:px-6">

          {/* ══════════════════════════════════════════════════════════════
              HERO — flat white, large title, watch recording, action CTAs
          ══════════════════════════════════════════════════════════════ */}
          <section className="py-10 sm:py-12">

            {/* Week pill */}
            <div className="mb-4">
              <span className="inline-flex items-center text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full">
                Week {selectedSession?.weekNumber ?? selectedWeek}
                {selectedSession?.date && (
                  <span className="text-indigo-400 font-normal ml-1.5">· {selectedSession.date}</span>
                )}
              </span>
            </div>

            {/* Title */}
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight mb-3 tracking-tight text-balance">
              {selectedSession?.topic || 'AI Learning Session'}
            </h1>

            {/* Subtitle / description */}
            {selectedSession?.description && (
              <p className="text-base text-gray-500 leading-relaxed mb-6 max-w-2xl">
                {selectedSession.description}
              </p>
            )}

            {/* Watch recording button */}
            {recording?.url && (
              <div className="mb-6">
                <a
                  href={recording.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-5 py-2.5 rounded-full transition-colors shadow-sm shadow-indigo-200 hover:shadow-md hover:shadow-indigo-200"
                >
                  <PlayIcon />
                  Watch Recording
                </a>
              </div>
            )}

            {/* Recording banner — admin-only management (hidden visually, keeps add/edit) */}
            {isAdmin(roles) && (
              <div className="mb-6">
                <RecordingBanner
                  recording={recording}
                  currentUser={currentUser}
                  selectedWeek={selectedWeek}
                  selectedSession={selectedSession}
                />
              </div>
            )}

            {/* Separator */}
            <hr className="border-gray-100 mb-6" />

            {/* Action buttons */}
            <div className="flex items-center flex-wrap gap-3">
              {/* Mark Present */}
              {isPresent ? (
                <button
                  onClick={handleUnmarkPresent}
                  disabled={unmarkingPresent}
                  className="group inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 text-gray-600 bg-white hover:border-rose-200 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-60 transition-all"
                >
                  {unmarkingPresent ? (
                    <><SpinnerIcon /> Removing…</>
                  ) : (
                    <><CheckIcon /><span className="group-hover:hidden">Marked Present</span><span className="hidden group-hover:inline">Unmark</span></>
                  )}
                </button>
              ) : (
                <button
                  onClick={handleMarkPresent}
                  disabled={markingPresent}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 text-gray-700 bg-white hover:border-gray-300 hover:bg-gray-50 disabled:opacity-60 disabled:cursor-wait transition-all"
                >
                  {markingPresent ? <><SpinnerIcon /> Marking…</> : '👋 Mark Present'}
                </button>
              )}

              {/* Submit Homework */}
              <button
                onClick={() => !hasSubmitted && setShowSubmitModal(true)}
                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  hasSubmitted
                    ? 'bg-gray-100 text-gray-400 cursor-default'
                    : 'bg-gray-900 text-white hover:bg-gray-800 active:bg-gray-700'
                }`}
              >
                {hasSubmitted ? '✓ Homework Submitted' : '📎 Submit Homework'}
              </button>

              {/* Attendance count */}
              {attendance.length > 0 && (
                <span className="text-xs text-gray-400 font-medium ml-1">
                  <span className="inline-flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                    {attendance.length} present
                  </span>
                </span>
              )}
            </div>
          </section>

          {/* ══════════════════════════════════════════════════════════════
              SESSION RESOURCES — images from admin
          ══════════════════════════════════════════════════════════════ */}
          {selectedSession?.images?.length > 0 && (
            <section className="mb-10 animate-fade-in">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-3">Session Resources</p>
              <div className="flex gap-3 overflow-x-auto pb-1 hide-scrollbar">
                {selectedSession.images.map((img, idx) => (
                  <a
                    key={idx}
                    href={img}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-shrink-0 w-44 h-28 rounded-xl overflow-hidden border border-gray-100 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-50/80 transition-all block group"
                  >
                    <img
                      src={img}
                      alt={`Resource ${idx + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </a>
                ))}
              </div>
            </section>
          )}

          {/* ══════════════════════════════════════════════════════════════
              ATTENDANCE — who's present
          ══════════════════════════════════════════════════════════════ */}
          {attendance.length > 0 && (
            <section className="mb-10 animate-fade-in">
              <div className="flex items-center gap-2 mb-3">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Attendance</p>
                <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded-full">{attendance.length}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {attendance.map((a) => {
                  const isMe = a.userId === currentUser.uid;
                  return (
                    <div
                      key={a.id}
                      className={`flex items-center gap-1.5 pl-1 pr-3 py-1 rounded-full border text-xs font-medium ${
                        isMe
                          ? 'bg-indigo-50 border-indigo-100 text-indigo-700'
                          : 'bg-gray-50 border-gray-100 text-gray-600'
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold ${getAvatarColor(a.name)}`}>
                        {getInitials(a.name)}
                      </div>
                      <span>{a.name}</span>
                      {isMe && <span className="text-[10px] text-indigo-400 font-bold">you</span>}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* ══════════════════════════════════════════════════════════════
              SUBMISSIONS — homework gallery
          ══════════════════════════════════════════════════════════════ */}
          <section className="pb-16">
            {/* Section header */}
            <div className="flex items-center justify-between mb-6 gap-3">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-gray-900">Submissions</h2>
                {!dataLoading && submissions.length > 0 && (
                  <span className="text-sm font-semibold text-gray-400">
                    {filteredSubmissions.length}
                  </span>
                )}
              </div>

              {/* Filter pills */}
              {submissions.length > 0 && (
                <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-0.5">
                  {[
                    { id: 'all',     label: 'All',     count: submissions.length },
                    { id: 'present', label: 'Present', count: presentFilteredCount },
                  ].map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setFilter(f.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        filter === f.id
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-500 hover:text-gray-800'
                      }`}
                    >
                      {f.label}
                      <span className={`text-[10px] font-bold ${filter === f.id ? 'text-indigo-500' : 'text-gray-400'}`}>
                        {f.count}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Cards */}
            {dataLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : filteredSubmissions.length === 0 ? (
              <div className="border border-dashed border-gray-200 rounded-2xl">
                <EmptyState onSubmit={() => setShowSubmitModal(true)} />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredSubmissions.map((sub, i) => (
                  <HomeworkCard
                    key={sub.id}
                    submission={sub}
                    currentUser={currentUser}
                    onLike={handleLike}
                    isPresent={presentIds.has(sub.userId)}
                    onRegenerateFeedback={handleRegenerateFeedback}
                    onEdit={setEditingSubmission}
                    index={i}
                  />
                ))}
              </div>
            )}
          </section>

        </main>
      </div>

      {/* Submit modal */}
      {showSubmitModal && (
        <SubmitModal
          currentUser={currentUser}
          onSubmit={handleSubmitHomework}
          onClose={() => setShowSubmitModal(false)}
        />
      )}

      {/* Edit modal */}
      {editingSubmission && (
        <SubmitModal
          currentUser={currentUser}
          mode="edit"
          initialValues={{ link: editingSubmission.link, description: editingSubmission.description }}
          onSubmit={handleEditSubmission}
          onClose={() => setEditingSubmission(null)}
        />
      )}
    </>
  );
}
