import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';

// ─── Avatar helpers ───────────────────────────────────────────────────────────
const AVATAR_COLORS = [
  'bg-indigo-100 text-indigo-700',
  'bg-violet-100 text-violet-700',
  'bg-sky-100    text-sky-700',
  'bg-teal-100   text-teal-700',
  'bg-emerald-100 text-emerald-700',
  'bg-rose-100   text-rose-700',
  'bg-orange-100 text-orange-700',
  'bg-pink-100   text-pink-700',
];

function getAvatarColor(name = '') {
  const idx = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}

function getInitials(name = '') {
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}

// ─── Icons ────────────────────────────────────────────────────────────────────
function ExternalLinkIcon() {
  return (
    <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  );
}

function HeartIcon({ filled }) {
  return (
    <svg className="w-3.5 h-3.5 flex-shrink-0 transition-transform group-hover:scale-110"
      fill={filled ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
  );
}

function ChevronIcon({ open }) {
  return (
    <svg className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

// ─── AI Feedback section ──────────────────────────────────────────────────────
function AIFeedback({ feedback, isOwner, onRegenerate, regenerating }) {
  const [expanded, setExpanded] = useState(false);
  if (!feedback && !regenerating) return null;

  return (
    <div className="rounded-xl border border-violet-100 bg-gradient-to-b from-violet-50/80 to-violet-50/40 overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-3.5 py-2.5 text-left hover:bg-violet-100/30 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base leading-none">🤖</span>
          <span className="text-xs font-semibold text-violet-700">AI Feedback</span>
          {regenerating && (
            <span className="text-[10px] text-violet-400 font-medium animate-pulse">Generating…</span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {isOwner && !regenerating && (
            <button
              onClick={(e) => { e.stopPropagation(); onRegenerate(); }}
              className="flex items-center gap-1 text-[10px] font-semibold text-violet-500 hover:text-violet-700 bg-white hover:bg-violet-100 border border-violet-200 px-2 py-0.5 rounded-lg transition-all"
            >
              <RefreshIcon /> Regenerate
            </button>
          )}
          <span className="text-violet-400"><ChevronIcon open={expanded} /></span>
        </div>
      </button>

      {expanded && (
        <div className="px-3.5 pb-3.5 animate-fade-in">
          {regenerating ? (
            <div className="space-y-2 pt-1">
              {[100, 85, 65].map((w, i) => (
                <div key={i} className="h-2.5 bg-violet-200/80 rounded-lg animate-pulse" style={{ width: `${w}%` }} />
              ))}
            </div>
          ) : (
            <p className="text-xs text-violet-900/80 leading-relaxed whitespace-pre-line pt-0.5">
              {feedback}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Image gallery ────────────────────────────────────────────────────────────
function ImageGallery({ images }) {
  const [lightbox, setLightbox] = useState(null);

  if (!images || images.length === 0) return null;

  return (
    <>
      <div className={`grid gap-1.5 ${images.length === 1 ? 'grid-cols-1' : images.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
        {images.slice(0, 3).map((img, i) => (
          <div key={i} className="relative group">
            <button
              onClick={() => setLightbox(img.url)}
              className="w-full aspect-video rounded-lg overflow-hidden border border-gray-100 hover:border-indigo-200 transition-all block"
            >
              <img
                src={img.url}
                alt={img.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
              />
              {/* Overlay for 3+ images */}
              {i === 2 && images.length > 3 && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                  <span className="text-white text-sm font-bold">+{images.length - 3}</span>
                </div>
              )}
            </button>
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setLightbox(null)}
        >
          <img
            src={lightbox}
            alt="Preview"
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 text-white/70 hover:text-white text-2xl font-bold"
          >
            ✕
          </button>
        </div>
      )}
    </>
  );
}

// ─── Video player ─────────────────────────────────────────────────────────────
function VideoPlayer({ video }) {
  const [playing, setPlaying] = useState(false);

  if (!video) return null;

  return (
    <div className="rounded-xl overflow-hidden border border-gray-100 bg-gray-900 relative group">
      {!playing ? (
        <div className="relative">
          <video
            src={video.url}
            className="w-full max-h-48 object-cover opacity-60"
            preload="metadata"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <button
              onClick={() => setPlaying(true)}
              className="w-12 h-12 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-105"
            >
              <PlayIcon />
            </button>
          </div>
          <div className="absolute bottom-2 left-2">
            <p className="text-[10px] text-white/70 font-medium truncate max-w-[150px]">{video.name}</p>
          </div>
        </div>
      ) : (
        <video
          src={video.url}
          className="w-full max-h-48"
          controls
          autoPlay
          preload="auto"
        />
      )}
    </div>
  );
}

// ─── Document list ────────────────────────────────────────────────────────────
function DocumentList({ documents }) {
  if (!documents || documents.length === 0) return null;

  const getDocIcon = (mimeType) => {
    if (mimeType === 'application/pdf') return '📄';
    if (mimeType?.includes('word'))     return '📝';
    if (mimeType?.includes('powerpoint') || mimeType?.includes('presentation')) return '📊';
    if (mimeType === 'text/plain')      return '📃';
    return '📎';
  };

  const formatSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-1.5">
      {documents.map((doc, i) => (
        <a
          key={i}
          href={doc.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2.5 p-2.5 rounded-xl border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/50 transition-all group"
        >
          <span className="text-base leading-none flex-shrink-0">{getDocIcon(doc.type)}</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-gray-700 truncate group-hover:text-indigo-700">{doc.name}</p>
            {doc.size && <p className="text-[10px] text-gray-400">{formatSize(doc.size)}</p>}
          </div>
          <DownloadIcon />
        </a>
      ))}
    </div>
  );
}

// ─── Long text section ────────────────────────────────────────────────────────
function TextContent({ text }) {
  const [expanded, setExpanded] = useState(false);
  if (!text) return null;

  const isLong    = text.length > 200;
  const displayed = isLong && !expanded ? text.slice(0, 200) + '…' : text;

  return (
    <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-100">
      <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-line">{displayed}</p>
      {isLong && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-1.5 text-[10px] font-semibold text-indigo-500 hover:text-indigo-700 transition-colors"
        >
          {expanded ? 'Show less ↑' : 'Read more ↓'}
        </button>
      )}
    </div>
  );
}

// ─── Main card ────────────────────────────────────────────────────────────────
export default function HomeworkCard({
  submission,
  currentUser,
  onLike,
  isPresent,
  onRegenerateFeedback,
  onEdit,
  index = 0,
}) {
  const {
    id, userId, name, description, link, text,
    files = [], timestamp, likes = [], aiFeedback,
  } = submission;

  const [showLikers,   setShowLikers]   = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const safeList   = Array.isArray(likes) ? likes : [];
  const hasLiked   = currentUser && safeList.some((l) => l.userId === currentUser.uid);
  const likeCount  = safeList.length;
  const likerNames = safeList.map((l) => l.name);
  const isOwnCard  = currentUser && userId === currentUser.uid;

  const relativeTime = timestamp
    ? formatDistanceToNow(timestamp instanceof Date ? timestamp : timestamp.toDate(), { addSuffix: true })
    : 'just now';

  const displayDomain = link
    ? link.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]
    : '';

  const animationDelay = Math.min(index * 50, 200);

  // Separate file types
  const safeFiles   = Array.isArray(files) ? files : [];
  const imageFiles  = safeFiles.filter((f) => f.kind === 'image');
  const videoFiles  = safeFiles.filter((f) => f.kind === 'video');
  const docFiles    = safeFiles.filter((f) => f.kind === 'document');
  const hasMedia    = imageFiles.length > 0 || videoFiles.length > 0 || docFiles.length > 0;

  const handleRegenerate = async () => {
    if (!onRegenerateFeedback) return;
    setRegenerating(true);
    try { await onRegenerateFeedback(id, description, link, submission.week, submission.topic); }
    finally { setRegenerating(false); }
  };

  return (
    <article
      className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col gap-4 transition-all duration-200 animate-fade-in group"
      style={{
        boxShadow: 'var(--shadow-card)',
        animationDelay: `${animationDelay}ms`,
      }}
      onMouseEnter={(e) => e.currentTarget.style.setProperty('box-shadow', 'var(--shadow-card-hover)')}
      onMouseLeave={(e) => e.currentTarget.style.setProperty('box-shadow', 'var(--shadow-card)')}
    >

      {/* ── Header: avatar + name + badges ──────────────────────────── */}
      <div className="flex items-start gap-3">
        <div className={`w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center font-semibold text-sm ${getAvatarColor(name)}`}>
          {getInitials(name)}
        </div>

        <div className="flex-1 min-w-0 pt-0.5">
          <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
            <p className="text-sm font-semibold text-gray-900 leading-tight truncate">{name}</p>
            {isOwnCard && (
              <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-1.5 py-px rounded-full leading-none">
                you
              </span>
            )}
          </div>
          <p className="text-[11px] text-gray-400 font-medium">{relativeTime}</p>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {isPresent && (
            <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-lg">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
              Present
            </span>
          )}
          {isOwnCard && onEdit && (
            <button
              onClick={() => onEdit(submission)}
              title="Edit your submission"
              className="flex items-center gap-1 text-[11px] font-semibold text-gray-400 hover:text-indigo-600 bg-gray-50 hover:bg-indigo-50 border border-gray-100 hover:border-indigo-200 px-2 py-1 rounded-lg transition-all"
            >
              <EditIcon /> Edit
            </button>
          )}
        </div>
      </div>

      {/* ── Short description ────────────────────────────────────────── */}
      {description && (
        <p className="text-sm text-gray-600 leading-relaxed line-clamp-3">{description}</p>
      )}
      {!description && !text && !hasMedia && !link && (
        <p className="text-sm text-gray-300 italic">No content provided.</p>
      )}

      {/* ── Detailed text write-up ───────────────────────────────────── */}
      <TextContent text={text} />

      {/* ── Image gallery ────────────────────────────────────────────── */}
      {imageFiles.length > 0 && (
        <ImageGallery images={imageFiles} />
      )}

      {/* ── Video player ─────────────────────────────────────────────── */}
      {videoFiles.length > 0 && (
        <VideoPlayer video={videoFiles[0]} />
      )}

      {/* ── Document list ─────────────────────────────────────────────── */}
      {docFiles.length > 0 && (
        <DocumentList documents={docFiles} />
      )}

      {/* ── AI Feedback ─────────────────────────────────────────────── */}
      <AIFeedback
        feedback={aiFeedback}
        isOwner={isOwnCard}
        onRegenerate={handleRegenerate}
        regenerating={regenerating}
      />

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between pt-3.5 border-t border-gray-50 mt-auto gap-2">

        {/* View Work link — only if URL provided */}
        {link ? (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            title={link}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            View Work <ExternalLinkIcon />
          </a>
        ) : (
          /* Content type badges when no link */
          <div className="flex items-center gap-1.5 flex-wrap">
            {imageFiles.length > 0  && <span className="text-[10px] font-medium text-gray-400 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-full">{imageFiles.length} image{imageFiles.length > 1 ? 's' : ''}</span>}
            {videoFiles.length > 0  && <span className="text-[10px] font-medium text-gray-400 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-full">{videoFiles.length} video{videoFiles.length > 1 ? 's' : ''}</span>}
            {docFiles.length > 0    && <span className="text-[10px] font-medium text-gray-400 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-full">{docFiles.length} doc{docFiles.length > 1 ? 's' : ''}</span>}
            {text && !imageFiles.length && !videoFiles.length && !docFiles.length && (
              <span className="text-[10px] font-medium text-gray-400 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-full">write-up</span>
            )}
          </div>
        )}

        <div className="flex items-center gap-2">
          {/* Domain pill */}
          {displayDomain && (
            <span className="text-[11px] text-gray-300 hidden sm:block truncate max-w-[80px]">
              {displayDomain}
            </span>
          )}

          {/* Like button */}
          <div
            className="relative"
            onMouseEnter={() => likeCount > 0 && setShowLikers(true)}
            onMouseLeave={() => setShowLikers(false)}
          >
            <button
              onClick={() => onLike(id, safeList)}
              title={hasLiked ? 'Unlike' : 'Like'}
              className={`group flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-all border ${
                hasLiked
                  ? 'text-rose-500 bg-rose-50 border-rose-100 hover:bg-rose-100'
                  : 'text-gray-400 hover:text-rose-500 bg-transparent hover:bg-rose-50 border-transparent hover:border-rose-100'
              }`}
            >
              <HeartIcon filled={hasLiked} />
              {likeCount > 0 && <span>{likeCount}</span>}
            </button>

            {/* Likers tooltip */}
            {showLikers && likeCount > 0 && (
              <div className="absolute bottom-full right-0 mb-2 z-40 pointer-events-none animate-fade-in">
                <div className="bg-gray-900 text-white text-xs rounded-xl px-3 py-2 min-w-[120px] max-w-[200px] shadow-xl">
                  <p className="text-[10px] font-semibold text-white/50 uppercase tracking-wide mb-1.5">Liked by</p>
                  <div className="space-y-1">
                    {likerNames.map((n, i) => (
                      <p key={i} className="truncate font-medium">
                        {n}
                        {currentUser && safeList[i]?.userId === currentUser.uid && (
                          <span className="text-indigo-300 ml-1 font-normal">(you)</span>
                        )}
                      </p>
                    ))}
                  </div>
                  <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-900" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
