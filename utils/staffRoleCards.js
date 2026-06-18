import { markRaw } from 'vue'
import Setting from '~/components/Icons/Setting.vue'
import NotebookTLB from '~/components/Icons/Notebook-TLB.vue'
import TeacherTLB from '~/components/Icons/Teacher-TLB.vue'

// Définitions partagées des rôles attribuables au personnel.
// Utilisées à la fois par le formulaire de création (mono-rôle, indicateur radio)
// et par la modale de gestion des rôles d'un utilisateur existant (multi-rôles, cases à cocher).
export const STAFF_ROLE_CARDS = [
  {
    value: 'admin',
    label: 'Administrateur',
    shortLabel: 'Admin',
    tagline: 'Pilote l\'établissement au quotidien.',
    icon: markRaw(Setting),
    chipClass: 'bg-blue-50 text-blue-700 ring-blue-200',
    dotClass: 'bg-blue-500',
    ringActive: 'ring-blue-300 bg-blue-50/40',
    iconWrap: 'bg-blue-50 text-blue-600 ring-blue-100',
    checkClass: 'text-blue-500',
    permissions: [
      'Modifier les informations de l\'école',
      'Gérer le personnel et les rôles',
      'Accéder à la facturation et aux paiements'
    ]
  },
  {
    value: 'registar',
    label: 'Responsable des inscriptions',
    shortLabel: 'Inscriptions',
    tagline: 'Gère les familles, les élèves et leurs inscriptions.',
    icon: markRaw(NotebookTLB),
    chipClass: 'bg-green-50 text-green-700 ring-green-200',
    dotClass: 'bg-green-500',
    ringActive: 'ring-green-300 bg-green-50/40',
    iconWrap: 'bg-green-50 text-green-600 ring-green-100',
    checkClass: 'text-green-500',
    permissions: [
      'Inscrire un élève à un cursus',
      'Créer et éditer une fiche famille',
      'Suivre les paiements des familles'
    ]
  },
  {
    value: 'teacher',
    label: 'Professeur',
    shortLabel: 'Professeur',
    tagline: 'Accède à ses classes, son planning et ses émargements.',
    icon: markRaw(TeacherTLB),
    chipClass: 'bg-amber-50 text-amber-700 ring-amber-200',
    dotClass: 'bg-amber-500',
    ringActive: 'ring-amber-300 bg-amber-50/40',
    iconWrap: 'bg-amber-50 text-amber-600 ring-amber-100',
    checkClass: 'text-amber-500',
    permissions: [
      'Consulter ses classes',
      'Faire l\'appel et suivre les présences',
      'Saisir les décisions si professeur principal'
    ]
  }
]

export const STAFF_ROLE_CARD_BY_VALUE = Object.fromEntries(
  STAFF_ROLE_CARDS.map(role => [role.value, role])
)
