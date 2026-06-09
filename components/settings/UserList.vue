<script setup>
import { ref, onMounted, defineProps, defineEmits } from 'vue'
import staffService from '~/services/staff'
import Trash from "~/components/Icons/Trash.vue"
import ConfirmationModal from "~/components/modals/ConfirmationModal.vue";

const props = defineProps({
  schoolId: {
    type: Number,
    required: true
  }
})

const emit = defineEmits(['update'])

const users = ref([])
const isLoading = ref(true)
const message = ref({ type: '', text: '' })
const showConfirmModal = ref(false)
const selectedUserForRemoval = ref(null)

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

const fetchUsers = async () => {
  try {
    isLoading.value = true
    const response = await staffService.getSchoolUsers(props.schoolId)

    const filteredData = response.filter(item =>
        ['director', 'admin', 'registar'].includes(item.role)
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

const openRemoveRoleModal = (userId, roleName) => {
  selectedUserForRemoval.value = { userId, roleName };
  showConfirmModal.value = true;
}

const closeConfirmModal = () => {
  showConfirmModal.value = false;
  selectedUserForRemoval.value = null;
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

onMounted(() => {
  fetchUsers()
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
                    <button
                        v-if="role !== 'director'"
                        @click="openRemoveRoleModal(user.user.id, role)"
                        class="ml-0.5 opacity-60 hover:opacity-100 hover:text-red-600 focus:outline-none transition-opacity"
                        title="Supprimer ce rôle"
                    >
                      <Trash class="size-3" />
                    </button>
                  </span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
    </div>

    <ConfirmationModal
        :is-open="showConfirmModal"
        title="Supprimer le rôle"
        message="Êtes-vous sûr de vouloir supprimer ce rôle pour cet utilisateur ?"
        confirm-button-text="Supprimer"
        @confirm="removeRole"
        @cancel="closeConfirmModal"
    />
  </div>
</template>