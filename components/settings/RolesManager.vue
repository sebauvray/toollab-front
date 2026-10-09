<script setup>
import { computed, onMounted, ref } from 'vue'
import rolesService from '~/services/roles'
import RoleFormModal from '~/components/modals/RoleFormModal.vue'
import ConfirmationModal from '~/components/modals/ConfirmationModal.vue'
import SaveButton from '~/components/form/SaveButton.vue'
import { getErrorMessage } from '~/utils/errors'

const emit = defineEmits(['changed'])

const roles = ref([])
const catalog = ref([])
const isLoading = ref(true)
const message = ref({ type: '', text: '' })

const isFormOpen = ref(false)
const editedRole = ref(null)
const roleToDelete = ref(null)

// Lignes du tableau : droits regroupés par domaine, dans l'ordre du catalogue.
const groups = computed(() => {
  const byGroup = new Map()
  catalog.value.forEach(permission => {
    if (!byGroup.has(permission.group)) byGroup.set(permission.group, [])
    byGroup.get(permission.group).push(permission)
  })
  return [...byGroup.entries()].map(([label, permissions]) => ({ label, permissions }))
})

const fetchRoles = async () => {
  try {
    isLoading.value = true
    const data = await rolesService.getRoles()
    roles.value = data.roles || []
    catalog.value = data.permissions || []
  } catch (e) {
    message.value = { type: 'error', text: getErrorMessage(e, 'Impossible de charger les rôles.') }
  } finally {
    isLoading.value = false
  }
}

const openCreate = () => {
  editedRole.value = null
  isFormOpen.value = true
}

const openEdit = (role) => {
  editedRole.value = role
  isFormOpen.value = true
}

const handleSaved = async (saved) => {
  const wasEdit = !!editedRole.value
  isFormOpen.value = false
  message.value = { type: 'success', text: wasEdit ? `Rôle « ${saved.name} » mis à jour.` : `Rôle « ${saved.name} » créé.` }
  await fetchRoles()
  emit('changed')
}

const confirmDelete = async () => {
  const role = roleToDelete.value
  roleToDelete.value = null
  try {
    await rolesService.deleteRole(role.id)
    message.value = { type: 'success', text: `Rôle « ${role.name} » supprimé.` }
    await fetchRoles()
    emit('changed')
  } catch (e) {
    message.value = { type: 'error', text: getErrorMessage(e, 'Le rôle n\'a pas pu être supprimé.') }
  }
}

const deleteBlockedReason = (role) => {
  if (role.is_locked) return 'Rôle verrouillé'
  if (role.is_default) return 'Rôle par défaut : il peut être modifié mais pas supprimé'
  if (role.users_count > 0) return 'Retirez d\'abord ce rôle aux personnes qui l\'ont'
  return ''
}

onMounted(fetchRoles)
</script>

<template>
  <div>
    <div class="flex items-start justify-between gap-3 mb-3">
      <div>
        <h2 class="text-sm font-semibold text-default font-montserrat">Rôles de l'établissement</h2>
        <p class="text-xs text-placeholder mt-0.5 max-w-2xl">
          Créez les rôles dont votre établissement a besoin et choisissez précisément leurs droits.
          Le rôle Directeur est verrouillé ; les rôles par défaut peuvent être ajustés mais pas supprimés.
        </p>
      </div>
      <SaveButton @click="openCreate">Nouveau rôle</SaveButton>
    </div>

    <div
        v-if="message.text"
        :class="['text-xs rounded-lg px-3 py-2 mb-3 ring-1', message.type === 'success' ? 'bg-green-50 text-green-700 ring-green-200' : 'bg-red-50 text-red-700 ring-red-200']"
    >
      {{ message.text }}
    </div>

    <div v-if="isLoading" class="flex justify-center py-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>

    <!-- Tableau croisé : une colonne par rôle, une ligne par droit. La première
         colonne reste visible au défilement horizontal (petits écrans, nombreux rôles). -->
    <div v-else class="bg-white rounded-2xl border overflow-x-auto">
      <table class="w-full text-xs border-collapse">
        <thead>
          <tr class="border-b border-[#E6EFF5]">
            <th class="sticky left-0 z-10 bg-white text-left font-normal p-3 min-w-56"></th>
            <th v-for="role in roles" :key="role.id" class="p-3 align-top text-left font-normal min-w-36 border-l border-[#E6EFF5]">
              <div class="font-semibold text-default font-montserrat text-sm leading-tight">{{ role.name }}</div>
              <div class="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-placeholder">
                <span v-if="role.is_locked" class="px-1.5 py-0.5 rounded ring-1 bg-purple-50 text-purple-700 ring-purple-200">Verrouillé</span>
                <span v-else-if="role.is_default" class="px-1.5 py-0.5 rounded ring-1 bg-gray-50 text-gray-600 ring-gray-200">Par défaut</span>
                <span>{{ role.users_count }} pers.</span>
              </div>
              <p v-if="role.description" class="mt-1 text-[11px] text-placeholder leading-snug">{{ role.description }}</p>
              <div v-if="!role.is_locked" class="mt-2 flex gap-1">
                <button
                    type="button"
                    class="px-2 py-1 text-[11px] rounded-md border border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
                    @click="openEdit(role)"
                >Modifier</button>
                <button
                    v-if="!role.is_default"
                    type="button"
                    class="px-2 py-1 text-[11px] rounded-md border border-red-200 text-red-700 bg-white hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    :disabled="!!deleteBlockedReason(role)"
                    :title="deleteBlockedReason(role) || 'Supprimer ce rôle'"
                    @click="roleToDelete = role"
                >Supprimer</button>
              </div>
            </th>
          </tr>
        </thead>
        <tbody v-for="group in groups" :key="group.label">
          <tr class="bg-gray-50/70">
            <th :colspan="roles.length + 1" class="sticky left-0 text-left px-3 py-1.5 text-[11px] uppercase tracking-wide text-placeholder font-montserrat font-normal">
              {{ group.label }}
            </th>
          </tr>
          <tr v-for="permission in group.permissions" :key="permission.key" class="border-t border-[#E6EFF5] hover:bg-gray-50/50">
            <td class="sticky left-0 z-10 bg-white px-3 py-2 text-default">{{ permission.label }}</td>
            <td v-for="role in roles" :key="role.id" class="px-3 py-2 text-center border-l border-[#E6EFF5]">
              <svg
                  v-if="role.permissions.includes(permission.key)"
                  class="size-4 mx-auto text-green-600"
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"
                  :aria-label="`${role.name} : ${permission.label}`"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span v-else class="text-gray-300" aria-hidden="true">—</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <RoleFormModal
        :is-open="isFormOpen"
        :role="editedRole"
        :catalog="catalog"
        @close="isFormOpen = false"
        @saved="handleSaved"
    />

    <ConfirmationModal
        :is-open="!!roleToDelete"
        title="Supprimer le rôle"
        :message="roleToDelete ? `Supprimer définitivement le rôle « ${roleToDelete.name} » ?` : ''"
        confirm-button-text="Supprimer"
        @confirm="confirmDelete"
        @cancel="roleToDelete = null"
    />
  </div>
</template>
