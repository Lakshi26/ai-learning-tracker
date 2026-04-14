// ─── Role helpers ─────────────────────────────────────────────────────────────
// Single source of truth for auth constants and role assignment.
// Import these instead of hardcoding email/domain strings elsewhere.

export const ADMIN_EMAIL    = 'lakshita.sethi@pw.live';
export const ALLOWED_DOMAIN = 'pw.live';

/**
 * Returns the roles for a given email address.
 *
 * lakshita.sethi@pw.live  →  ['admin', 'team']
 * *@pw.live               →  ['team']
 * anything else           →  []  (access denied)
 *
 * @param {string} email
 * @returns {string[]}
 */
export function getRoles(email) {
  if (!email) return [];
  if (email === ADMIN_EMAIL)               return ['admin', 'team'];
  if (email.endsWith(`@${ALLOWED_DOMAIN}`)) return ['team'];
  return [];
}

/** Convenience predicates */
export const isAdmin = (roles) => Array.isArray(roles) && roles.includes('admin');
export const isTeam  = (roles) => Array.isArray(roles) && roles.includes('team');
