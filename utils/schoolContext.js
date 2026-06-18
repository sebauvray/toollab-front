export const missingSchoolMessage = 'Aucune école sélectionnée.'

export function getCurrentSchoolId() {
  if (!process.client) {
    throw new Error(missingSchoolMessage)
  }

  const schoolId = localStorage.getItem('current_school_id')

  if (!schoolId || Number.parseInt(schoolId, 10) <= 0) {
    throw new Error(missingSchoolMessage)
  }

  return schoolId
}
