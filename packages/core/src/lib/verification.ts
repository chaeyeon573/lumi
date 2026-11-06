import type { User } from '@core/types';

/**
 * Student ID photo verification — the fallback when a school e-mail can't be used (alumni without an address, a code
 * that never arrives). Owner 2026-11-06: "메일로 인증하고, 안되면 그냥 학생증사진찍어달라고하셈".
 *
 * Shared by the server (server/idverify.ts — the rules are enforced there) and the app (banner, capture screen).
 * The photo itself never reaches a client other than the admin review page.
 */

/** true while the account waits for an approved student ID (no photo yet, in review, or rejected) */
export const awaitingVerification = (u?: Pick<User, 'verification'> | null): boolean => !!u?.verification && u.verification.status !== 'approved';

/** what the app should ask for next: a photo (none yet / rejected), patience (in review), or nothing */
export function verificationStep(u?: Pick<User, 'verification'> | null): 'none' | 'photo' | 'review' | 'retake' {
  const v = u?.verification;
  if (!v || v.status === 'approved') return 'none';
  if (v.status === 'rejected') return 'retake';
  return v.submittedAt ? 'review' : 'photo';
}

/** The longest side the app sends (px) and the largest file the server takes (bytes) */
export const ID_PHOTO_MAX_SIDE = 1600;
export const ID_PHOTO_MAX_BYTES = 1_500_000;
/** too small to read a name on the card */
export const ID_PHOTO_MIN_SIDE = 300;
/** a rejection reason the admin types — kept short, shown to the student as-is */
export const ID_REASON_MAX = 200;
