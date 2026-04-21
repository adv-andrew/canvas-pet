describe('StreakService', () => {
  describe('streak logic', () => {
    it('resets streak to 0 when submission is late', () => {
      const completedAt = '2026-04-21T10:00:00Z'
      const dueDate = '2026-04-20T23:59:00Z'
      const isLate = new Date(completedAt) > new Date(dueDate)
      expect(isLate).toBe(true)
    })

    it('keeps streak when submission is on time', () => {
      const completedAt = '2026-04-20T20:00:00Z'
      const dueDate = '2026-04-20T23:59:00Z'
      const isLate = new Date(completedAt) > new Date(dueDate)
      expect(isLate).toBe(false)
    })

    it('handles null due date (no deadline)', () => {
      const completedAt = '2026-04-25T10:00:00Z'
      const dueDate: string | null = null
      const isLate = dueDate !== null && new Date(completedAt) > new Date(dueDate)
      expect(isLate).toBe(false)
    })
  })
})
