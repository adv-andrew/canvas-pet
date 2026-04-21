import { createContext, useContext } from 'react'
import type { PetStats } from '../../shared/lib/apiClient'

interface PetStatsContextValue {
  stats: PetStats | null
  refresh: () => Promise<void>
  updateStats: (stats: PetStats) => void
}

const PetStatsContext = createContext<PetStatsContextValue>({
  stats: null,
  refresh: async () => {},
  updateStats: () => {},
})

export { PetStatsContext as RefreshPetStatsContext }
export const usePetStats = () => useContext(PetStatsContext)
export const useRefreshPetStats = () => useContext(PetStatsContext).refresh
