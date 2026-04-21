import { calculateHappinessDelta } from '../app/services/happinessService'

describe('HappinessService', () => {
  describe('calculateHappinessDelta', () => {
    const dueDate = new Date('2026-04-20T23:59:00Z')

    it('returns +15 for submission 2+ days early', () => {
      const completedAt = new Date('2026-04-18T10:00:00Z')
      expect(calculateHappinessDelta(completedAt, dueDate)).toBe(15)
    })

    it('returns +10 for submission 1+ day early', () => {
      const completedAt = new Date('2026-04-19T12:00:00Z')
      expect(calculateHappinessDelta(completedAt, dueDate)).toBe(10)
    })

    it('returns +5 for on-time submission', () => {
      const completedAt = new Date('2026-04-20T20:00:00Z')
      expect(calculateHappinessDelta(completedAt, dueDate)).toBe(5)
    })

    it('returns -5 for submission up to 1 day late', () => {
      const completedAt = new Date('2026-04-21T12:00:00Z')
      expect(calculateHappinessDelta(completedAt, dueDate)).toBe(-5)
    })

    it('returns -10 for submission up to 3 days late', () => {
      const completedAt = new Date('2026-04-22T23:00:00Z')
      expect(calculateHappinessDelta(completedAt, dueDate)).toBe(-10)
    })

    it('returns -15 for submission more than 3 days late', () => {
      const completedAt = new Date('2026-04-25T10:00:00Z')
      expect(calculateHappinessDelta(completedAt, dueDate)).toBe(-15)
    })
  })
})
