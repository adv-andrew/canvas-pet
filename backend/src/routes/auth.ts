// Re-exports auth service functions so non-Next.js consumers (tests, CLI tools)
// can import business logic without pulling in any Next.js-specific code.
export { upsertCanvasUser, getCanvasUserIdForAuthUser } from '../services/authService'
