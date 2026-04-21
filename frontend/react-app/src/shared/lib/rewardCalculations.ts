// Preview calculations that mirror backend rewardPointsService.calculateAward
// and happinessService.calculateHappinessDelta. Uses Date.now() as the
// effective completion time since the user hasn't completed yet.

export function previewRP(dueDate: string | null, streak: number): number {
  let base = 5
  if (dueDate) {
    const daysEarly = (new Date(dueDate).getTime() - Date.now()) / (24 * 60 * 60 * 1000)
    if (daysEarly < 0) return 0
    if (daysEarly >= 2) base = 15
    else if (daysEarly >= 1) base = 10
  }
  return base + Math.min(streak, 10)
}

// Returns the happiness delta the backend will apply on completion.
// Returns 0 for late assignments (backend applies a penalty, but the badge is
// suppressed rather than showing a confusing negative preview).
export function previewHappinessDelta(dueDate: string | null): number {
  if (!dueDate) return 5
  const hoursEarly = (new Date(dueDate).getTime() - Date.now()) / (1000 * 60 * 60)
  if (hoursEarly >= 48) return 15
  if (hoursEarly >= 24) return 10
  if (hoursEarly >= 0) return 5
  return 0
}
