import { calculateAward } from '../app/services/rewardPointsService'

describe('RewardPointsService', () => {
  describe('calculateAward', () => {
    const dueDate = '2026-04-20T23:59:00Z'

    it('returns base + streak for 2+ days early (base=15)', () => {
      const completedAt = '2026-04-18T10:00:00Z'
      expect(calculateAward(completedAt, dueDate, 0)).toBe(15)
      expect(calculateAward(completedAt, dueDate, 5)).toBe(20)
      expect(calculateAward(completedAt, dueDate, 15)).toBe(25) // streak capped at 10
    })

    it('returns base + streak for 1+ day early (base=10)', () => {
      const completedAt = '2026-04-19T12:00:00Z'
      expect(calculateAward(completedAt, dueDate, 0)).toBe(10)
      expect(calculateAward(completedAt, dueDate, 3)).toBe(13)
    })

    it('returns base + streak for on-time (base=5)', () => {
      const completedAt = '2026-04-20T20:00:00Z'
      expect(calculateAward(completedAt, dueDate, 0)).toBe(5)
      expect(calculateAward(completedAt, dueDate, 7)).toBe(12)
    })

    it('returns 0 for late submissions', () => {
      const completedAt = '2026-04-21T10:00:00Z'
      expect(calculateAward(completedAt, dueDate, 5)).toBe(0)
    })

    it('returns base + streak when no due date', () => {
      expect(calculateAward('2026-04-20T10:00:00Z', null, 0)).toBe(5)
      expect(calculateAward('2026-04-20T10:00:00Z', null, 4)).toBe(9)
    })
  })
})
