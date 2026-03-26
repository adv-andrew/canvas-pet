function daysBetween(from: Date, to: Date): number {
  const fromDay = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  const toDay = new Date(to.getFullYear(), to.getMonth(), to.getDate())
  return Math.round((toDay.getTime() - fromDay.getTime()) / (1000 * 60 * 60 * 24))
}

export function formatDueDate(dateStr: string | null): string {
  if (!dateStr) return 'No due date'
  const d = new Date(dateStr)
  const diff = daysBetween(new Date(), d)
  if (diff < 0) return `Due ${Math.abs(diff)}d ago`
  if (diff === 0) return 'Due today'
  if (diff === 1) return 'Due tomorrow'
  return `Due ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
}

export function formatPostedDate(dateStr: string): string {
  const d = new Date(dateStr)
  const diff = daysBetween(d, new Date())
  if (diff === 0) return 'Posted today'
  if (diff === 1) return 'Posted yesterday'
  if (diff < 7) return `Posted ${diff}d ago`
  return `Posted ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
}
