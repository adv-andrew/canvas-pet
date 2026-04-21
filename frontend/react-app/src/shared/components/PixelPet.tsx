import { useMemo } from 'react'

interface Props {
  happiness: number
  size?: number
  animate?: boolean
}

type PetMood = 'ecstatic' | 'happy' | 'neutral' | 'sad' | 'miserable'

function getMood(happiness: number): PetMood {
  if (happiness >= 80) return 'ecstatic'
  if (happiness >= 60) return 'happy'
  if (happiness >= 40) return 'neutral'
  if (happiness >= 20) return 'sad'
  return 'miserable'
}

const COLORS = {
  cheek: '#f472b6',
  eye: '#1e1b4b',
  eyeShine: '#ffffff',
  mouth: '#1e1b4b',
}

export function PixelPet({ happiness, size = 120, animate = true }: Props) {
  const mood = useMemo(() => getMood(happiness), [happiness])

  const eyeStyle = useMemo(() => {
    switch (mood) {
      case 'ecstatic': return { shape: 'arc', sparkle: true }
      case 'happy': return { shape: 'round', sparkle: true }
      case 'neutral': return { shape: 'round', sparkle: false }
      case 'sad': return { shape: 'round', sparkle: false, droopy: true }
      case 'miserable': return { shape: 'line', sparkle: false }
    }
  }, [mood])

  const mouthPath = useMemo(() => {
    switch (mood) {
      case 'ecstatic': return 'M 45 75 Q 60 95 75 75'
      case 'happy': return 'M 48 72 Q 60 82 72 72'
      case 'neutral': return 'M 50 74 L 70 74'
      case 'sad': return 'M 48 78 Q 60 70 72 78'
      case 'miserable': return 'M 45 82 Q 60 68 75 82'
    }
  }, [mood])

  return (
    <div
      className={`pixel-pet ${animate ? 'pixel-pet-animate' : ''} pixel-pet-${mood}`}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 120 120" width={size} height={size}>
        <defs>
          <filter id="pixelate">
            <feFlood x="4" y="4" height="2" width="2" />
            <feComposite width="8" height="8" />
            <feTile result="a" />
            <feComposite in="SourceGraphic" in2="a" operator="in" />
            <feMorphology operator="dilate" radius="2" />
          </filter>
        </defs>

        {/* Body */}
        <ellipse cx="60" cy="65" rx="42" ry="38" className="pet-body" />
        <ellipse cx="60" cy="60" rx="38" ry="34" className="pet-body-light" />

        {/* Ears */}
        <ellipse cx="28" cy="32" rx="12" ry="16" className="pet-body" />
        <ellipse cx="28" cy="30" rx="8" ry="12" className="pet-body-light" />
        <ellipse cx="92" cy="32" rx="12" ry="16" className="pet-body" />
        <ellipse cx="92" cy="30" rx="8" ry="12" className="pet-body-light" />

        {/* Cheeks */}
        <ellipse cx="30" cy="65" rx="10" ry="6" fill={COLORS.cheek} opacity="0.6" />
        <ellipse cx="90" cy="65" rx="10" ry="6" fill={COLORS.cheek} opacity="0.6" />

        {/* Eyes */}
        {eyeStyle.shape === 'arc' ? (
          <>
            <path d="M 38 52 Q 44 46 50 52" stroke={COLORS.eye} strokeWidth="3" fill="none" strokeLinecap="round" />
            <path d="M 70 52 Q 76 46 82 52" stroke={COLORS.eye} strokeWidth="3" fill="none" strokeLinecap="round" />
          </>
        ) : eyeStyle.shape === 'line' ? (
          <>
            <line x1="38" y1="52" x2="50" y2="56" stroke={COLORS.eye} strokeWidth="3" strokeLinecap="round" />
            <line x1="70" y1="56" x2="82" y2="52" stroke={COLORS.eye} strokeWidth="3" strokeLinecap="round" />
          </>
        ) : (
          <>
            <ellipse
              cx="44"
              cy={eyeStyle.droopy ? 54 : 52}
              rx="7"
              ry="8"
              fill={COLORS.eye}
            />
            <ellipse
              cx="76"
              cy={eyeStyle.droopy ? 54 : 52}
              rx="7"
              ry="8"
              fill={COLORS.eye}
            />
            {eyeStyle.sparkle && (
              <>
                <circle cx="46" cy="49" r="2.5" fill={COLORS.eyeShine} />
                <circle cx="78" cy="49" r="2.5" fill={COLORS.eyeShine} />
              </>
            )}
          </>
        )}

        {/* Mouth */}
        <path
          d={mouthPath}
          stroke={COLORS.mouth}
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />

        {/* Sparkles for ecstatic mood */}
        {mood === 'ecstatic' && (
          <>
            <text x="15" y="25" fontSize="12" className="sparkle sparkle-1">✦</text>
            <text x="98" y="20" fontSize="10" className="sparkle sparkle-2">✦</text>
            <text x="105" y="45" fontSize="8" className="sparkle sparkle-3">✦</text>
          </>
        )}

        {/* Sweat drop for sad/miserable */}
        {(mood === 'sad' || mood === 'miserable') && (
          <path
            d="M 95 42 Q 98 48 95 54 Q 92 48 95 42"
            fill="#60a5fa"
            className="sweat-drop"
          />
        )}
      </svg>
    </div>
  )
}
