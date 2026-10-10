// Signaux de santé d'une école (calculés par l'API, cf. AdminDashboardController::schoolsHealth).
export const SCHOOL_ALERTS = {
  inactive: { label: 'Inactive', hint: 'aucune connexion depuis 14 jours', cls: 'bg-amber-50 text-amber-800 ring-amber-200' },
  onboarding: { label: 'Onboarding incomplet', hint: 'aucune classe ou aucun prof', cls: 'bg-gray-50 text-gray-700 ring-gray-200' },
  no_director: { label: 'Sans directeur', hint: 'aucun directeur en poste', cls: 'bg-red-50 text-red-700 ring-red-200' }
}

// Une école suspendue n'est plus « à surveiller » : elle est déjà traitée
export const needsAttention = (school) => school.access && school.alerts.length > 0

export const relativeDay = (date) => {
  if (!date) return 'Jamais'
  const days = Math.floor((Date.now() - new Date(date).getTime()) / 86400000)
  if (days <= 0) return "Aujourd'hui"
  if (days === 1) return 'Hier'
  if (days < 30) return `Il y a ${days} j`
  return new Date(date).toLocaleDateString('fr-FR')
}
