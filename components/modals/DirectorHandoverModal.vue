<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import Cross from '~/components/Icons/Cross.vue'
import InputText from '~/components/form/InputText.vue'
import SaveButton from '~/components/form/SaveButton.vue'
import CancelButton from '~/components/form/CancelButton.vue'
import { getErrorMessage } from '~/utils/errors'

const props = defineProps({
  isOpen: {
    type: Boolean,
    required: true
  },
  isTeacher: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close', 'save'])

const outgoingOptions = [
  {
    value: 'admin',
    label: 'Administrateur',
    description: 'Vous conservez l\'administration courante : familles, classes, tarifs, statistiques et personnel.'
  },
  {
    value: 'registar',
    label: 'Responsable des inscriptions',
    description: 'Vous gérez les familles, les inscriptions et les paiements.'
  },
  {
    value: 'none',
    label: 'Quitter l\'établissement',
    teacherLabel: 'Quitter la direction',
    description: 'Vous perdez tout accès à cet établissement. Votre compte Toollab est conservé.',
    teacherDescription: 'Vous quittez l\'administration de l\'établissement et ne gardez que votre rôle de professeur.'
  }
]

const emptyForm = () => ({ email: '', outgoing_role: 'admin', remove_teacher_role: false })

const keepsTeacherRole = computed(() => props.isTeacher && !form.value.remove_teacher_role)
const optionLabel = (option) => option.teacherLabel && keepsTeacherRole.value ? option.teacherLabel : option.label

const optionDescription = (option) =>
    option.teacherDescription && keepsTeacherRole.value
        ? option.teacherDescription
        : option.description

const keepsNoRole = computed(() => form.value.outgoing_role === 'none' && (!props.isTeacher || form.value.remove_teacher_role))

const form = ref(emptyForm())
const error = ref('')
const fieldErrors = ref({})
const isSubmitting = ref(false)
const body = ref(null)

const firstError = (field) => fieldErrors.value[field]?.[0] || ''

watch(() => form.value.email, () => {
  error.value = ''
  if (fieldErrors.value.email) {
    const { email, ...rest } = fieldErrors.value
    fieldErrors.value = rest
  }
})

watch(() => props.isOpen, (open) => {
  if (open) {
    form.value = emptyForm()
    error.value = ''
    fieldErrors.value = {}
  }
})

const close = () => {
  if (!isSubmitting.value) emit('close')
}

const handleSave = async () => {
  error.value = ''
  fieldErrors.value = {}

  const email = form.value.email.trim()
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    fieldErrors.value = { email: ['Saisissez une adresse e-mail valide.'] }
    nextTick(() => body.value?.scrollTo({ top: 0, behavior: 'smooth' }))
    return
  }

  try {
    isSubmitting.value = true
    await new Promise((resolve, reject) => {
      emit('save', {
        email,
        outgoing_role: form.value.outgoing_role,
        remove_teacher_role: props.isTeacher && form.value.remove_teacher_role
      }, { resolve, reject })
    })
    emit('close')
  } catch (err) {
    fieldErrors.value = err?.response?.data?.errors || {}
    if (!Object.keys(fieldErrors.value).length) {
      error.value = getErrorMessage(err, 'Une erreur est survenue lors de l\'envoi de l\'invitation.')
    }
    nextTick(() => body.value?.scrollTo({ top: 0, behavior: 'smooth' }))
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div v-if="isOpen"
       class="fixed inset-0 z-50 font-nunito bg-black/50 flex items-center justify-center p-3"
       @click.self="close">
    <div class="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[88vh] flex flex-col">
      <div class="shrink-0 px-5 pt-4 pb-3 border-b border-[#E6EFF5] flex items-center justify-between">
        <h2 class="text-base font-bold text-default font-montserrat">Transférer la direction</h2>
        <button @click="close" aria-label="Fermer"
                class="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-50">
          <Cross class="size-4" />
        </button>
      </div>

      <form ref="body" novalidate class="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-4" @submit.prevent="handleSave">
        <div v-if="error" class="bg-red-50 text-red-700 ring-1 ring-red-200 px-3 py-2 rounded-lg text-xs">
          {{ error }}
        </div>

        <div>
          <h3 class="text-xs font-montserrat font-semibold text-gray-500 mb-2">Nouveau directeur</h3>
          <InputText v-model="form.email" type="email" placeholder="Adresse e-mail" :error="firstError('email')" required />
          <p v-if="!firstError('email')" class="text-[11px] text-placeholder mt-1.5">
            Une invitation lui sera envoyée par e-mail. Si cette personne n'a pas de compte Toollab, elle le créera en acceptant.
          </p>
        </div>

        <div>
          <h3 class="text-xs font-montserrat font-semibold text-gray-500 mb-2">Votre rôle après la passation</h3>
          <div class="rounded-lg border border-input-stroke divide-y divide-[#E6EFF5]">
            <label
                v-for="option in outgoingOptions"
                :key="option.value"
                class="flex items-start gap-3 px-3 py-2.5 cursor-pointer hover:bg-gray-50 transition-colors"
            >
              <input
                  v-model="form.outgoing_role"
                  type="radio"
                  name="outgoing_role"
                  :value="option.value"
                  class="mt-0.5 accent-default"
              />
              <span class="flex-1 min-w-0">
                <span class="block text-sm font-medium" :class="option.value === 'none' && keepsNoRole ? 'text-red-600' : 'text-default'">{{ optionLabel(option) }}</span>
                <span class="block text-[11px] text-placeholder leading-snug">{{ optionDescription(option) }}</span>
              </span>
            </label>
          </div>
          <p v-if="firstError('outgoing_role')" class="text-xs text-red-600 mt-1">{{ firstError('outgoing_role') }}</p>
        </div>

        <div v-if="isTeacher">
          <h3 class="text-xs font-montserrat font-semibold text-gray-500 mb-2">Votre rôle de professeur</h3>
          <p class="text-[11px] text-placeholder mb-2 leading-snug">
            Vous êtes aussi professeur dans cet établissement. Ce rôle est conservé par défaut, avec vos classes et votre planning.
          </p>
          <div class="inline-flex rounded-lg border border-input-stroke divide-x divide-input-stroke overflow-hidden">
            <button
                type="button"
                @click="form.remove_teacher_role = false"
                :class="!form.remove_teacher_role ? 'bg-default text-white' : 'bg-white text-gray-700 hover:bg-gray-50'"
                class="px-3 py-1.5 text-xs transition-colors"
            >Conserver</button>
            <button
                type="button"
                @click="form.remove_teacher_role = true"
                :class="form.remove_teacher_role ? 'bg-default text-white' : 'bg-white text-gray-700 hover:bg-gray-50'"
                class="px-3 py-1.5 text-xs transition-colors"
            >Retirer</button>
          </div>
          <p v-if="form.remove_teacher_role" class="text-[11px] text-red-600 mt-2 leading-snug">
            Vous n'aurez plus accès à vos classes. Elles resteront affectées à votre nom jusqu'à ce que la direction les réattribue.
          </p>
          <p v-if="firstError('remove_teacher_role')" class="text-xs text-red-600 mt-1">{{ firstError('remove_teacher_role') }}</p>
        </div>

        <div class="bg-amber-50 text-amber-800 ring-1 ring-amber-200 rounded-lg px-3 py-2 text-xs leading-relaxed">
          Vous restez directeur jusqu'à l'acceptation de l'invitation, et pouvez l'annuler d'ici là.
          Une fois acceptée, la passation est immédiate et vous ne pourrez pas revenir en arrière vous-même.
        </div>
      </form>

      <div class="shrink-0 px-5 py-3 border-t border-[#E6EFF5] flex justify-end gap-x-1.5">
        <CancelButton @click="close" :disabled="isSubmitting">Annuler</CancelButton>
        <SaveButton @click="handleSave" :disabled="isSubmitting">
          {{ isSubmitting ? 'Envoi…' : 'Envoyer l\'invitation' }}
        </SaveButton>
      </div>
    </div>
  </div>
</template>
