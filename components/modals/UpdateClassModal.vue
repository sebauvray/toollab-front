<template>
  <div v-if="isOpen" class="fixed inset-0 font-nunito bg-black/50 flex items-center justify-center z-50 p-3">
    <div class="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[88vh] flex flex-col">
      <div class="px-5 pt-4 pb-3 border-b border-[#E6EFF5] flex items-center justify-between shrink-0">
        <h2 class="text-base font-bold text-default font-montserrat">Modifier la classe</h2>
        <button
            @click="$emit('close')"
            class="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-50"
            aria-label="Fermer"
        >
          <Cross class="size-4"/>
        </button>
      </div>

      <div class="flex-1 overflow-y-auto px-5 py-4 space-y-5 min-h-[28rem]">
        <div v-if="error" class="bg-red-50 text-red-700 ring-1 ring-red-200 px-3 py-2 rounded-lg text-xs">
          {{ error }}
        </div>

        <div>
          <h3 class="text-xs font-montserrat font-semibold text-gray-500 mb-2">Informations</h3>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <InputText v-model="editClass.name" placeholder="Nom de la classe"/>
              <p v-if="firstError('name')" class="text-xs text-red-600 mt-1">{{ firstError('name') }}</p>
            </div>
            <div v-if="hasLevels">
              <InputSelect v-model="editClass.levelId" :options="levelOptions" placeholder="Niveau"/>
              <p v-if="firstError('level_id', 'levelId')" class="text-xs text-red-600 mt-1">{{ firstError('level_id', 'levelId') }}</p>
            </div>
            <div>
              <SelectGenre v-model="editClass.gender" placeholder="Genre"/>
              <p v-if="firstError('gender')" class="text-xs text-red-600 mt-1">{{ firstError('gender') }}</p>
            </div>
            <div>
              <InputNumber v-model="editClass.size" placeholder="Effectif maximum" :min="1" :max="100"/>
              <p v-if="firstError('size')" class="text-xs text-red-600 mt-1">{{ firstError('size') }}</p>
            </div>
            <div class="col-span-2">
              <InputText v-model="editClass.telegram_link" placeholder="Lien du groupe de classe"/>
              <p v-if="firstError('telegram_link')" class="text-xs text-red-600 mt-1">{{ firstError('telegram_link') }}</p>
            </div>
          </div>
        </div>

        <div>
          <h3 class="text-xs font-montserrat font-semibold text-gray-500 mb-2">Créneaux</h3>

          <div class="space-y-2">
            <div
                v-for="(schedule, index) in editClass.schedules"
                :key="schedule._uid"
                class="grid grid-cols-[1fr_1fr_auto_auto_auto] gap-2 items-start"
            >
              <div>
                <SelectDay v-model="schedule.day" placeholder="Jour"/>
                <p v-if="scheduleError(schedule, index, 'day')" class="text-xs text-red-600 mt-1">{{ scheduleError(schedule, index, 'day') }}</p>
              </div>
              <InputSelect v-model="schedule.teacher_id" :options="teacherOptions" placeholder="Professeur"/>
              <div>
                <input
                    v-model="schedule.start_time"
                    type="time"
                    title="Heure de début"
                    class="px-2 py-1.5 text-sm border border-input-stroke rounded-lg focus:outline-none focus:border-default"
                />
                <p v-if="scheduleError(schedule, index, 'start_time')" class="text-xs text-red-600 mt-1">{{ scheduleError(schedule, index, 'start_time') }}</p>
              </div>
              <div>
                <input
                    v-model="schedule.end_time"
                    type="time"
                    title="Heure de fin"
                    class="px-2 py-1.5 text-sm border border-input-stroke rounded-lg focus:outline-none focus:border-default"
                />
                <p v-if="scheduleError(schedule, index, 'end_time')" class="text-xs text-red-600 mt-1">{{ scheduleError(schedule, index, 'end_time') }}</p>
              </div>
              <div class="flex items-center gap-x-1.5 h-[34px]">
                <span
                    v-if="schedule.teacher_id && schedule.teacher_id === mainTeacherId"
                    class="inline-flex items-center px-1.5 py-0.5 text-[11px] rounded-full bg-amber-100 text-amber-700 ring-1 ring-amber-300 shrink-0"
                >Principal</span>
                <button
                    type="button"
                    @click="removeSchedule(index)"
                    :disabled="editClass.schedules.length === 1 && isScheduleRowEmpty(schedule)"
                    class="text-gray-400 hover:text-red-600 p-1 shrink-0 disabled:opacity-30 disabled:hover:text-gray-400 disabled:cursor-not-allowed"
                    title="Supprimer ce créneau"
                >
                  <Trash class="size-3.5"/>
                </button>
              </div>
            </div>
          </div>

          <button
              type="button"
              @click="addScheduleRow"
              class="mt-2 w-full inline-flex items-center justify-center gap-x-1.5 px-3 py-2 text-xs font-semibold text-placeholder border border-dashed border-input-stroke rounded-lg transition-colors hover:text-default hover:border-default hover:bg-gray-light"
          >
            <PlusLight class="size-3.5"/>
            <span>Ajouter un créneau</span>
          </button>
        </div>

        <div v-if="mainTeacherOptions.length >= 2">
          <h3 class="text-xs font-montserrat font-semibold text-gray-500 mb-1">Professeur principal</h3>
          <p class="text-xs text-gray-600 mb-2">
            Plusieurs professeurs interviennent : le principal est le seul à saisir les décisions de fin d'année.
          </p>
          <div class="max-w-xs">
            <InputSelect
                v-model="mainTeacherId"
                :options="mainTeacherOptions"
                placeholder="Professeur principal"
                drop-up
            />
          </div>
        </div>
      </div>

      <div class="shrink-0 border-t border-[#E6EFF5] px-5 py-3 flex justify-end gap-x-1.5">
        <button
            @click="$emit('close')"
            class="px-3 py-1.5 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
        >
          Annuler
        </button>
        <button
            @click="handleUpdate"
            :disabled="isSubmitting"
            class="px-4 py-1.5 text-sm bg-default text-white rounded-lg hover:opacity-90 disabled:opacity-50"
        >
          {{ isSubmitting ? 'Modification...' : 'Modifier la classe' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import {ref, computed, watch} from 'vue'
import Cross from '~/components/Icons/Cross.vue'
import Trash from '~/components/Icons/Trash.vue'
import PlusLight from '~/components/Icons/PlusLight.vue'
import InputText from '~/components/form/InputText.vue'
import InputSelect from '~/components/form/InputSelect.vue'
import InputNumber from '~/components/form/InputNumber.vue'
import SelectGenre from '~/components/form/SelectGenre.vue'
import SelectDay from "~/components/form/SelectDay.vue";
import userService from '~/services/user'
import { getErrorMessage } from '~/utils/errors'

const props = defineProps({
  isOpen: {
    type: Boolean,
    required: true
  },
  cursusName: {
    type: String,
    required: true
  },
  levels: {
    type: Array,
    default: () => []
  },
  classData: {
    type: Object,
    default: () => null
  }
})

const emit = defineEmits(['close', 'update'])

const error = ref('')
const fieldErrors = ref({})
const isSubmitting = ref(false)

let scheduleUid = 0

const createScheduleRow = () => ({
  _uid: ++scheduleUid,
  day: '',
  start_time: '',
  end_time: '',
  teacher_id: null
})

const editClass = ref({
  id: null,
  name: '',
  gender: '',
  size: '',
  levelId: null,
  telegram_link: '',
  schedules: []
})

const scheduleErrors = ref({})

const mainTeacherId = ref(null)

const teachers = ref([])

const teacherOptions = computed(() => [
  {value: null, label: 'Aucun professeur'},
  ...teachers.value.map(t => ({
    value: t.id,
    label: `${t.first_name} ${t.last_name}`
  }))
])

const teacherById = computed(() => {
  const map = new Map()
  teachers.value.forEach(t => map.set(t.id, t))
  return map
})

const fetchTeachers = async () => {
  try {
    const response = await userService.listTeachers()
    teachers.value = response.data || []
  } catch (e) {
    console.error('Erreur récupération profs:', e)
    teachers.value = []
  }
}

watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    fetchTeachers()
    error.value = ''
    fieldErrors.value = {}
  }
}, {immediate: true})

const levelOptions = computed(() => {
  return props.levels.map(level => ({
    value: level.id,
    label: level.name
  }))
})

const hasLevels = computed(() => levelOptions.value.length > 0)

watch(() => props.classData, (newClassData) => {
  if (newClassData && props.isOpen) {
    editClass.value = {
      id: newClassData.id,
      name: newClassData.name || '',
      gender: newClassData.gender || '',
      size: newClassData.size ? newClassData.size.toString() : '',
      levelId: newClassData.level?.id || newClassData.level_id || levelOptions.value[0]?.value || null,
      telegram_link: newClassData.telegram_link || '',
      schedules: (newClassData.schedules || []).map(s => ({...s, _uid: ++scheduleUid}))
    }
    if (editClass.value.schedules.length === 0) {
      editClass.value.schedules.push(createScheduleRow())
    }
    mainTeacherId.value = newClassData.main_teacher_id || null
    error.value = ''
    fieldErrors.value = {}
    scheduleErrors.value = {}
  }
}, { immediate: true })

const setFieldError = (field, message) => {
  fieldErrors.value = {
    ...fieldErrors.value,
    [field]: [message]
  }
}

const firstError = (...fields) => {
  for (const field of fields) {
    const message = fieldErrors.value[field]?.[0]
    if (message) return message
  }
  return ''
}

const distinctTeacherIds = computed(() => {
  const seen = []
  for (const s of editClass.value.schedules) {
    if (s.teacher_id && !seen.includes(s.teacher_id)) seen.push(s.teacher_id)
  }
  return seen
})

const mainTeacherOptions = computed(() => distinctTeacherIds.value.map(id => {
  const known = teacherById.value.get(id)
  if (known) return { value: id, label: `${known.first_name} ${known.last_name}` }
  const s = editClass.value.schedules.find(sc => sc.teacher_id === id)
  const label = s?.teacher?.first_name
      ? `${s.teacher.first_name} ${s.teacher.last_name}`
      : (s?.teacher_name || `Professeur #${id}`)
  return { value: id, label }
}))

watch(distinctTeacherIds, (ids) => {
  if (!ids.includes(mainTeacherId.value)) {
    mainTeacherId.value = ids[0] ?? null
  }
})

const isScheduleRowEmpty = (schedule) =>
  !schedule.day && !schedule.start_time && !schedule.end_time && !schedule.teacher_id

const addScheduleRow = () => {
  editClass.value.schedules.push(createScheduleRow())
}

const removeSchedule = (index) => {
  const [removed] = editClass.value.schedules.splice(index, 1)
  if (removed) delete scheduleErrors.value[removed._uid]
  if (editClass.value.schedules.length === 0) {
    editClass.value.schedules.push(createScheduleRow())
  }
}

const validateSchedules = () => {
  const errors = {}

  editClass.value.schedules.forEach((schedule) => {
    if (isScheduleRowEmpty(schedule)) return

    const rowErrors = {}
    if (!schedule.day) rowErrors.day = 'Jour requis.'
    if (!schedule.start_time) rowErrors.start_time = 'Début requis.'
    if (!schedule.end_time) rowErrors.end_time = 'Fin requise.'
    if (schedule.start_time && schedule.end_time && schedule.end_time <= schedule.start_time) {
      rowErrors.end_time = 'La fin doit être après le début.'
    }

    if (Object.keys(rowErrors).length) errors[schedule._uid] = rowErrors
  })

  scheduleErrors.value = errors
  return Object.keys(errors).length === 0
}

const scheduleError = (schedule, index, field) =>
  scheduleErrors.value[schedule._uid]?.[field]
  || fieldErrors.value[`schedules.${index}.${field}`]?.[0]
  || ''

const handleUpdate = async () => {
  error.value = ''
  fieldErrors.value = {}

  if (!editClass.value.name) setFieldError('name', 'Le nom de la classe est requis.')
  if (!editClass.value.gender) setFieldError('gender', 'Le genre est requis.')
  if (!editClass.value.size) setFieldError('size', 'L’effectif maximum est requis.')

  const schedulesAreValid = validateSchedules()

  if (Object.keys(fieldErrors.value).length || !schedulesAreValid) {
    error.value = 'Veuillez corriger les champs indiqués.'
    return
  }

  // Les lignes restées vides ne sont pas des créneaux : on les retire du modèle
  // pour que les index correspondent à ceux renvoyés par l'API en cas d'erreur.
  editClass.value.schedules = editClass.value.schedules.filter(s => !isScheduleRowEmpty(s))

  try {
    isSubmitting.value = true

    const classData = {
      ...editClass.value,
      size: parseInt(editClass.value.size),
      main_teacher_id: mainTeacherId.value,
      schedules: editClass.value.schedules.map(({_uid, ...schedule}) => schedule)
    }

    await new Promise((resolve, reject) => {
      emit('update', classData, { resolve, reject })
    })
  } catch (err) {
    console.error('Erreur lors de la modification de la classe:', err)
    fieldErrors.value = err.response?.data?.errors || {}
    error.value = Object.keys(fieldErrors.value).length
        ? 'Veuillez corriger les champs indiqués.'
        : getErrorMessage(err, 'Une erreur est survenue lors de la modification de la classe')
  } finally {
    isSubmitting.value = false
  }
}
</script>
