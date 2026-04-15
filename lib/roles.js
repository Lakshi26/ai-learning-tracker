// ─── Role helpers ─────────────────────────────────────────────────────────────
// SUPER_ADMIN is a permanent admin who can never be removed.
// All other admins are managed dynamically via the `admins` Firestore collection.

export const SUPER_ADMIN_EMAIL = 'lakshita.sethi@pw.live';
export const ALLOWED_DOMAIN    = 'pw.live';

// Keep legacy export so existing imports don't break
export const ADMIN_EMAIL = SUPER_ADMIN_EMAIL;

/**
 * Returns static roles based on email only (used as a fallback / initial check).
 * Dynamic admin status is resolved separately via the `admins` Firestore collection.
 */
export function getRoles(email) {
  if (!email) return [];
  if (email.endsWith(`@${ALLOWED_DOMAIN}`)) return ['team'];
  return [];
}

/**
 * Returns true if the given email has admin rights.
 * Checks both the permanent super-admin and the dynamic admins list.
 *
 * @param {string}   email
 * @param {string[]} dynamicAdminEmails  — list of emails from the `admins` collection
 */
export function isAdminEmail(email, dynamicAdminEmails = []) {
  if (!email) return false;
  if (email === SUPER_ADMIN_EMAIL) return true;
  return dynamicAdminEmails.includes(email);
}

/** Convenience predicates */
export const isAdmin = (roles) => Array.isArray(roles) && roles.includes('admin');
export const isTeam  = (roles) => Array.isArray(roles) && roles.includes('team');
