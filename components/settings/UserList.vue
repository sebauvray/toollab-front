<script setup>
import { ref, computed, nextTick, onMounted, onBeforeUnmount, defineProps, defineEmits } from 'vue'
import staffService from '~/services/staff'
import ConfirmationModal from "~/components/modals/ConfirmationModal.vue";
import RoleCard from "~/components/settings/RoleCard.vue";
import Cross from "~/components/Icons/Cross.vue";
import { STAFF_ROLE_CARD_BY_VALUE } from "~/utils/staffRoleCards";

const props = defineProps({
  schoolId: {
    type: Number,
    required: true
  },
  assignableRoles: {
    type: Array,
    default: () => []
  },
  currentUserId: {
    type: Number,
    default: null
  }
})

const emit = defineEmits(['update'])

const users = ref([])
const isLoading = ref(true)
const message = ref({ type: '', text: '' })
const showConfirmModal = ref(false)
const selectedUserForRemoval = ref(null)
const addingRoleKey = ref('')

const isBrowser = ref(false)
const showManageModal = ref(false)
const managingUserId = ref(null)
const showRemoveFromSchoolModal = ref(false)
const isRemovingFromSchool = ref(false)

const roleLabels = {
  'director': 'Directeur',
  'admin': 'Administrateur',
  'registar': 'Responsable des inscriptions',
  'teacher': 'Professeur',
  'student': 'Élève',
  'responsible': 'Responsable'
}

const roleChip = {
  director: 'bg-purple-50 text-purple-700 ring-purple-200',
  admin: 'bg-blue-50 text-blue-700 ring-blue-200',
  registar: 'bg-green-50 text-green-700 ring-green-200',
  teacher: 'bg-amber-50 text-amber-700 ring-amber-200'
}
const roleDot = {
  director: 'bg-purple-500',
  admin: 'bg-blue-500',
  registar: 'bg-green-500',
  teacher: 'bg-amber-500'
}

// Cartes de rôle proposées à la gestion (intersection assignableRoles ∩ définitions partagées).
const manageableRoleCards = computed(() =>
    props.assignableRoles
        .map(role => STAFF_ROLE_CARD_BY_VALUE[role])
        .filter(Boolean)
)

const managingUser = computed(() =>
    users.value.find(u => u.user.id === managingUserId.value) || null
)

const fetchUsers = async () => {
  try {
    isLoading.value = true
    const response = await staffService.getSchoolUsers(props.schoolId)

    const filteredData = response.filter(item =>
        ['director', 'admin', 'registar', 'teacher'].includes(item.role)
    )

    const userMap = new Map()

    filteredData.forEach(item => {
      const userId = item.user.id
      if (userMap.has(userId)) {
        userMap.get(userId).roles.push(item.role)
      } else {
        userMap.set(userId, {
          user: item.user,
          roles: [item.role]
        })
      }
    })

    users.value = Array.from(userMap.values())
  } catch (error) {
    console.error('Erreur lors de la récupération des utilisateurs:', error)
    message.value = {
      type: 'error',
      text: 'Une erreur est survenue lors de la récupération des utilisateurs'
    }
  } finally {
    isLoading.value = false
  }
}

const canRemoveRole = (user, role) =>
    user.user.id !== props.currentUserId
    && props.assignableRoles.includes(role)

// Dans la modale : une carte cochée (rôle détenu) n'est désactivable que si on peut retirer le rôle.
// On ne peut pas retirer son propre rôle ; un rôle non encore détenu reste toujours attribuable.
const isRoleCardDisabled = (user, role) =>
    user.roles.includes(role) && !canRemoveRole(user, role)

const openManageModal = (user) => {
  managingUserId.value = user.user.id
  showManageModal.value = true
  message.value = { type: '', text: '' }
  updateOverflow()
}

const closeManageModal = () => {
  showManageModal.value = false
  managingUserId.value = null
  updateOverflow()
}

const toggleRole = (user, role) => {
  if (user.roles.includes(role)) {
    openRemoveRoleModal(user.user.id, role)
  } else {
    addRole(user, role)
  }
}

const canRemoveFromSchool = computed(() =>
    !!managingUser.value && managingUser.value.user.id !== props.currentUserId
)

const openRemoveFromSchoolModal = () => {
  showRemoveFromSchoolModal.value = true
}

const closeRemoveFromSchoolModal = () => {
  showRemoveFromSchoolModal.value = false
  nextTick(updateOverflow)
}

const removeFromSchool = async () => {
  if (!managingUser.value) return
  const userId = managingUser.value.user.id

  try {
    isRemovingFromSchool.value = true
    await staffService.removeUserFromSchool({
      user_id: userId,
      school_id: props.schoolId
    })

    await fetchUsers()
    emit('update')

    const { setFlashMessage } = useFlashMessage()
    setFlashMessage({
      type: 'success',
      message: 'L\'utilisateur a été retiré de l\'établissement'
    })

    closeManageModal()
  } catch (error) {
    console.error('Erreur lors du retrait de l\'utilisateur:', error)
    message.value = {
      type: 'error',
      text: error.response?.data?.message || 'Une erreur est survenue lors du retrait de l\'utilisateur'
    }
    // On ferme la modale de gestion pour rendre visible la bannière d'erreur (ex. accès refusé).
    closeManageModal()
  } finally {
    isRemovingFromSchool.value = false
    showRemoveFromSchoolModal.value = false
    nextTick(updateOverflow)
  }
}

const addRole = async (user, role) => {
  const key = `${user.user.id}:${role}`
  addingRoleKey.value = key
  message.value = {type: '', text: ''}

  try {
    const response = await staffService.addUserRole({
      user_id: user.user.id,
      school_id: props.schoolId,
      role
    })

    await fetchUsers()
    emit('update')

    const {setFlashMessage} = useFlashMessage()
    setFlashMessage({
      type: 'success',
      message: response.message || 'Le rôle a été ajouté avec succès'
    })
  } catch (error) {
    console.error('Erreur lors de l’ajout du rôle:', error)
    message.value = {
      type: 'error',
      text: error.response?.data?.message || 'Une erreur est survenue lors de l’ajout du rôle'
    }
  } finally {
    addingRoleKey.value = ''
  }
}

const openRemoveRoleModal = (userId, roleName) => {
  selectedUserForRemoval.value = { userId, roleName };
  showConfirmModal.value = true;
}

const closeConfirmModal = () => {
  showConfirmModal.value = false;
  selectedUserForRemoval.value = null;
  // La ConfirmationModal réinitialise le scroll du body en se fermant : on le re-verrouille
  // si la modale de gestion des rôles est toujours ouverte derrière.
  nextTick(updateOverflow)
}

const removeRole = async () => {
  if (!selectedUserForRemoval.value) return;

  try {
    await staffService.removeUserRole({
      user_id: selectedUserForRemoval.value.userId,
      school_id: props.schoolId,
      role_name: selectedUserForRemoval.value.roleName
    });

    await fetchUsers();
    emit('update');

    const { setFlashMessage } = useFlashMessage();
    setFlashMessage({
      type: 'success',
      message: 'Le rôle de l\'utilisateur a été supprimé avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la suppression du rôle:', error);
    message.value = {
      type: 'error',
      text: error.response?.data?.message || 'Une erreur est survenue lors de la suppression du rôle'
    };
  } finally {
    closeConfirmModal();
  }
}

const updateOverflow = () => {
  if (!isBrowser.value) return
  document.body.style.overflow = showManageModal.value ? 'hidden' : 'auto'
}

onMounted(() => {
  isBrowser.value = true
  fetchUsers()
})

onBeforeUnmount(() => {
  if (isBrowser.value) {
    document.body.style.overflow = 'auto'
  }
})

defineExpose({
  refreshUsers: fetchUsers
})
</script>

<template>
  <div>
    <div
        v-if="message.text"
        :class="['text-xs rounded-lg px-3 py-2 mb-4 ring-1', message.type === 'success' ? 'bg-green-50 text-green-700 ring-green-200' : 'bg-red-50 text-red-700 ring-red-200']"
    >
      {{ message.text }}
    </div>

    <div v-if="isLoading" class="flex justify-center py-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>

    <div v-else-if="users.length === 0" class="bg-white rounded-2xl border py-8 text-center text-xs text-placeholder">
      Aucun membre du personnel n'a été ajouté.
    </div>

    <div v-else class="bg-white rounded-2xl border overflow-hidden font-nunito">
        <table class="min-w-full text-xs">
          <thead class="bg-gray-50 border-b border-[#E6EFF5] font-montserrat">
            <tr>
              <th class="px-4 py-2 text-left font-semibold text-gray-600">Nom</th>
              <th class="px-4 py-2 text-left font-semibold text-gray-600">Email</th>
              <th class="px-4 py-2 text-left font-semibold text-gray-600">Rôles</th>
              <th class="px-4 py-2 text-right font-semibold text-gray-600"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#E6EFF5]">
            <tr v-for="user in users" :key="user.user.id" class="hover:bg-gray-50">
              <td class="px-4 py-2.5 font-medium text-gray-900 whitespace-nowrap">
                {{ user.user.first_name }} {{ user.user.last_name }}
              </td>
              <td class="px-4 py-2.5 text-gray-600">
                {{ user.user.email }}
              </td>
              <td class="px-4 py-2.5">
                <div class="flex flex-wrap gap-1.5">
                  <span
                      v-for="role in user.roles"
                      :key="role"
                      :class="['inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium ring-1', roleChip[role] || 'bg-gray-50 text-gray-600 ring-gray-200']"
                  >
                    <span class="h-1.5 w-1.5 rounded-full" :class="roleDot[role] || 'bg-gray-400'"></span>
                    {{ roleLabels[role] }}
                  </span>
                </div>
              </td>
              <td class="px-4 py-2.5 text-right whitespace-nowrap">
                <button
                    v-if="manageableRoleCards.length"
                    type="button"
                    class="inline-flex items-center px-2.5 py-1 rounded-lg border border-gray-200 bg-white text-[11px] text-gray-600 hover:border-default hover:text-default transition-colors"
                    @click="openManageModal(user)"
                >
                  Gérer les rôles
                </button>
              </td>
            </tr>
          </tbody>
        </table>
    </div>

    <!-- Modale de gestion des rôles (multi-sélection, cartes iso création) -->
    <Teleport to="body" v-if="isBrowser && showManageModal && managingUser">
      <div class="fixed inset-0 z-40 bg-black/50 flex items-center justify-center p-3" @click.self="closeManageModal">
        <div
            class="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col font-nunito"
            role="dialog"
            aria-modal="true"
        >
          <div class="px-5 pt-4 pb-3 border-b border-[#E6EFF5] flex items-center justify-between">
            <h3 class="text-base font-bold text-default font-montserrat">
              Gérer les rôles — {{ managingUser.user.first_name }} {{ managingUser.user.last_name }}
            </h3>
            <button
                @click="closeManageModal"
                class="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-50"
                aria-label="Fermer"
            >
              <Cross class="size-4" />
            </button>
          </div>

          <div class="px-5 py-4 overflow-y-auto">
            <p class="text-xs text-placeholder mb-4">
              Cochez les rôles à attribuer à cet utilisateur. Le retrait d'un rôle demande une confirmation.
            </p>
            <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
              <RoleCard
                  v-for="role in manageableRoleCards"
                  :key="role.value"
                  :role="role"
                  :selected="managingUser.roles.includes(role.value)"
                  :disabled="isRoleCardDisabled(managingUser, role.value) || addingRoleKey === `${managingUser.user.id}:${role.value}`"
                  indicator="check"
                  @select="toggleRole(managingUser, role.value)"
              />
            </div>
          </div>

          <div class="px-5 py-3 border-t border-[#E6EFF5] flex items-center justify-between gap-2">
            <button
                v-if="canRemoveFromSchool"
                type="button"
                @click="openRemoveFromSchoolModal"
                class="px-3 py-1.5 text-xs rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
            >
              Retirer de l'établissement
            </button>
            <span v-else></span>
            <button
                @click="closeManageModal"
                class="px-3 py-1.5 text-xs rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <ConfirmationModal
        :is-open="showConfirmModal"
        title="Supprimer le rôle"
        message="Êtes-vous sûr de vouloir supprimer ce rôle pour cet utilisateur ?"
        confirm-button-text="Supprimer"
        @confirm="removeRole"
        @cancel="closeConfirmModal"
    />

    <ConfirmationModal
        :is-open="showRemoveFromSchoolModal"
        title="Retirer de l'établissement"
        message="Retirer cet utilisateur de l'établissement ? Il perdra tous ses rôles ici, mais son compte ne sera pas supprimé."
        confirm-button-text="Retirer"
        @confirm="removeFromSchool"
        @cancel="closeRemoveFromSchoolModal"
    />
  </div>
</template>
