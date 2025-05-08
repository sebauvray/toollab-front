<script setup>
import { ref, onMounted, defineProps, defineEmits } from 'vue'
import staffService from '~/services/staff'
import Trash from "~/components/Icons/Trash.vue"

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

// Dictionnaire de traduction
const roleLabels = {
  'director': 'Directeur',
  'admin': 'Administrateur',
  'registar': 'Responsable des inscriptions', // Notez la faute dans le slug 'registar'
  'teacher': 'Enseignant',
  'student': 'Élève',
  'responsible': 'Responsable'
}

const fetchUsers = async () => {
  try {
    isLoading.value = true
    const response = await staffService.getSchoolUsers(props.schoolId)

    // Filtrer les rôles concernés avec les slugs
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
        :class="[
      'p-4 mb-6 rounded text-white',
      message.type === 'success' ? 'bg-green-500' : 'bg-red-500'
    ]"
    >
      {{ message.text }}
    </div>

    <div v-if="isLoading" class="flex justify-center py-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>

    <div v-else-if="users.length === 0" class="py-8 text-center text-gray-500">
      Aucun membre du personnel n'a été ajouté.
    </div>

    <div v-else class="overflow-x-auto">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
        <tr>
          <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Nom
          </th>
          <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Email
          </th>
          <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Rôles
          </th>
        </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
        <tr v-for="user in users" :key="user.user.id">
          <td class="px-6 py-4 whitespace-nowrap">
            <div class="text-sm font-medium text-gray-900">
              {{ user.user.first_name }} {{ user.user.last_name }}
            </div>
          </td>
          <td class="px-6 py-4 whitespace-nowrap">
            <div class="text-sm text-gray-500">
              {{ user.user.email }}
            </div>
          </td>
          <td class="px-6 py-4">
            <div class="flex flex-wrap gap-2">
              <div
                  v-for="role in user.roles"
                  :key="role"
                  class="px-2 py-1 inline-flex items-center text-xs leading-5 font-semibold rounded-full group"
                  :class="{
                  'bg-purple-100 text-purple-800': role === 'director',
                  'bg-blue-100 text-blue-800': role === 'admin',
                  'bg-green-100 text-green-800': role === 'registar'
                }">
                <span>{{ roleLabels[role] }}</span>
                <button
                    v-if="role !== 'director'"
                    @click="openRemoveRoleModal(user.user.id, role)"
                    class="ml-1.5 text-gray-400 hover:text-red-600 focus:outline-none transition-colors"
                    title="Supprimer ce rôle">
                  <Trash class="size-3.5" />
                </button>
              </div>
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