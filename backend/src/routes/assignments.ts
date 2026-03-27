// Re-exports assignment service functions so non-Next.js consumers (tests, CLI tools)
// can import business logic without pulling in any Next.js-specific code.
export { fetchSavedAssignments, saveAssignment, unsaveAssignment } from '../services/assignmentService'
