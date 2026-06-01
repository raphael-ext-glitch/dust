// Make token expires after 7 days
export const INVITATION_EXPIRATION_TIME_SEC = 60 * 60 * 24 * 7;
export const INVITATION_EXPIRATION_TIME_MS =
  INVITATION_EXPIRATION_TIME_SEC * 1000;

type InvitationTokenValidityFields = {
  createdAt: Date | number;
  reminderSentAt: Date | number | null;
};

// After a reminder is sent, the token is re-anchored on reminderSentAt so the recipient gets a fresh 7-day window.
export function getMembershipInvitationTokenValidityStartMs({
  createdAt,
  reminderSentAt,
}: InvitationTokenValidityFields): number {
  const createdAtMs =
    createdAt instanceof Date ? createdAt.getTime() : createdAt;
  const reminderSentAtMs =
    reminderSentAt instanceof Date ? reminderSentAt.getTime() : reminderSentAt;
  return reminderSentAtMs ?? createdAtMs;
}
