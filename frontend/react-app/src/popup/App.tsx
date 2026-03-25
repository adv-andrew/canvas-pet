import { useCanvasData } from './hooks/useCanvasData'
import { NotOnCanvas } from './components/NotOnCanvas'
import { Dashboard } from './components/Dashboard'
import { linkGoogleAccount } from './lib/auth'

export function App() {
  const { assignments, announcements, loading, error, isOnCanvas, refetch, saveAssignment, unsaveAssignment } =
    useCanvasData()

  if (!isOnCanvas) {
    return <NotOnCanvas />
  }

  return (
    <Dashboard
      assignments={assignments}
      announcements={announcements}
      loading={loading}
      error={error}
      onSave={saveAssignment}
      onUnsave={unsaveAssignment}
      onRefresh={refetch}
      onLinkGoogle={linkGoogleAccount}
    />
  )
}
