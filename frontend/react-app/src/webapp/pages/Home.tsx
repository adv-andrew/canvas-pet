import { PixelPet } from '../../shared/components/PixelPet'
import { usePetStats } from '../lib/petStatsContext'

export function Home() {
  const { stats } = usePetStats()

  const happiness = stats?.happiness_score ?? 50
  const streak = stats?.streak ?? 0
  const points = stats?.reward_points ?? 0

  return (
    <div className="page-content home-page">
      <div className="pet-container">
        <PixelPet happiness={happiness} size={180} />
        <div className="pet-mood-label">{getMoodLabel(happiness)}</div>
      </div>

      <div className="stats-grid">
        <div className="stat-card stat-happiness">
          <div className="stat-icon">❤️</div>
          <div className="stat-info">
            <div className="stat-value">{happiness}%</div>
            <div className="stat-label">Happiness</div>
          </div>
          <div className="stat-bar">
            <div className="stat-bar-fill" style={{ width: `${happiness}%` }} />
          </div>
        </div>

        <div className="stat-card stat-streak">
          <div className="stat-icon">🔥</div>
          <div className="stat-info">
            <div className="stat-value">{streak}</div>
            <div className="stat-label">Day Streak</div>
          </div>
        </div>

        <div className="stat-card stat-points">
          <div className="stat-icon">⭐</div>
          <div className="stat-info">
            <div className="stat-value">{points}</div>
            <div className="stat-label">Reward Points</div>
          </div>
        </div>
      </div>

      <div className="home-tips">
        <h3>Keep your pet happy!</h3>
        <ul>
          <li>Complete assignments on time to earn points</li>
          <li>Submit early for bonus rewards</li>
          <li>Build a streak by completing work daily</li>
          <li>Spend points in the shop for cool items</li>
        </ul>
      </div>
    </div>
  )
}

function getMoodLabel(happiness: number): string {
  if (happiness >= 80) return 'Ecstatic!'
  if (happiness >= 60) return 'Happy'
  if (happiness >= 40) return 'Okay'
  if (happiness >= 20) return 'Sad'
  return 'Miserable'
}
