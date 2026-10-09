<script setup>
import { computed, ref, watch } from 'vue'
import Cross from '~/components/Icons/Cross.vue'
import InputText from '~/components/form/InputText.vue'
import SaveButton from '~/components/form/SaveButton.vue'
import CancelButton from '~/components/form/CancelButton.vue'
import rolesService from '~/services/roles'
import { getErrorMessage } from '~/utils/errors'

const props = defineProps({
  isOpen: {
    type: Boolean,
    required: true
  },
  // null : création ; sinon le rôle de l'API à modifier.
  role: {
    type: Object,
    default: () => null
  },
  catalog: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['close', 'saved'])

const name = ref('')
const description = ref('')
const selected = ref([])
const error = ref('')
const fieldErrors = ref({})
const isSubmitting = ref(false)

const isEdit = computed(() => !!props.role)
const firstError = (field) => fieldErrors.value[field]?.[0] || ''

// Catalogue regroupé par domaine, dans l'ordre fourni par l'API.
const groups = computed(() => {
  const byGroup = new Map()
  props.catalog.forEach(permission => {
    if (!byGroup.has(permission.group)) byGroup.set(permission.group, [])
    byGroup.get(permission.group).push(permission)
  })
  return [...byGroup.entries()].map(([label, permissions]) => ({ label, permissions }))
})

const resetForm = () => {
  name.value = props.role?.name || ''
  description.value = props.role?.description || ''
  selected.value = [...(props.role?.permissions || [])]
  error.value = ''
  fieldErrors.value = {}
}

watch(() => props.isOpen, (open) => {
  if (open) resetForm()
})

const toggle = (key) => {
  selected.value = selected.value.includes(key)
    ? selected.value.filter(item => item !== key)
    : [...selected.value, key]
}

const handleSave = async () => {
  error.value = ''
  fieldErrors.value = {}
  if (!name.value.trim()) {
    fieldErrors.value = { name: ['Le nom du rôle est obligatoire.'] }
    return
  }

  isSubmitting.value = true
  const payload = {
    name: name.value.trim(),
    description: description.value.trim() || null,
    permissions: selected.value
  }

  try {
    const saved = isEdit.value
      ? await rolesService.updateRole(props.role.id, payload)
      : await rolesService.createRole(payload)
    emit('saved', saved)
  } catch (e) {
    fieldErrors.value = e?.response?.data?.errors || {}
    error.value = getErrorMessage(e, 'Le rôle n\'a pas pu être enregistré.')
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 font-nunito bg-black/50 flex items-center justify-center z-50 p-3" @click.self="$emit('close')">
    <div class="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
      <div class="px-5 pt-4 pb-3 border-b border-[#E6EFF5] flex items-center justify-between">
        <h2 class="text-base font-bold text-default font-montserrat">
          {{ isEdit ? `Modifier le rôle « ${role.name} »` : 'Nouveau rôle' }}
        </h2>
        <button
            @click="$emit('close')"
            class="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-50"
            aria-label="Fermer"
        >
          <Cross class="size-4" />
        </button>
      </div>

      <div class="px-5 py-4 space-y-4 overflow-y-auto">
        <div v-if="error" class="bg-red-50 text-red-700 ring-1 ring-red-200 px-3 py-2 rounded-lg text-xs">
          {{ error }}
        </div>

        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <h3 class="text-xs font-montserrat font-semibold text-gray-500 mb-2">Nom du rôle</h3>
            <InputText v-model="name" placeholder="Ex. Trésorier" required />
            <p v-if="firstError('name')" class="text-xs text-red-600 mt-1">{{ firstError('name') }}</p>
          </div>
          <div>
            <h3 class="text-xs font-montserrat font-semibold text-gray-500 mb-2">Description (facultative)</h3>
            <InputText v-model="description" placeholder="Ex. Suit les paiements des familles" />
            <p v-if="firstError('description')" class="text-xs text-red-600 mt-1">{{ firstError('description') }}</p>
          </div>
        </div>

        <div>
          <h3 class="text-xs font-montserrat font-semibold text-gray-500 mb-1">Droits accordés</h3>
          <p class="text-[11px] text-placeholder mb-3">
            Cochez ce que les personnes ayant ce rôle peuvent faire dans l'établissement.
          </p>
          <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
            <fieldset v-for="group in groups" :key="group.label" class="rounded-xl border border-[#E6EFF5] p-3">
              <legend class="px-1 text-[11px] uppercase tracking-wide text-placeholder font-montserrat">{{ group.label }}</legend>
              <label
                  v-for="permission in group.permissions"
                  :key="permission.key"
                  class="flex items-start gap-2 py-1 text-xs text-default cursor-pointer"
              >
                <input
                    type="checkbox"
                    class="mt-0.5 rounded border-gray-300 text-primary focus:ring-primary"
                    :checked="selected.includes(permission.key)"
                    @change="toggle(permission.key)"
                />
                <span>{{ permission.label }}</span>
              </label>
            </fieldset>
          </div>
        </div>
      </div>

      <div class="px-5 py-3 border-t border-[#E6EFF5] flex justify-end gap-x-1.5">
        <CancelButton @click="$emit('close')" :disabled="isSubmitting">Annuler</CancelButton>
        <SaveButton @click="handleSave" :disabled="isSubmitting">
          {{ isSubmitting ? 'Enregistrement...' : 'Enregistrer' }}
        </SaveButton>
      </div>
    </div>
  </div>
</template>
