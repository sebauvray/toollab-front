<script setup>
import {ref, computed, watch} from 'vue'
import Cross from '~/components/Icons/Cross.vue'
import Trash from '~/components/Icons/Trash.vue'
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
  }
})

const emit = defineEmits(['close', 'save'])

const error = ref('')
const fieldErrors = ref({})
const isSubmitting = ref(false)

const newClass = ref({
  name: '',
  gender: '',
  size: '',
  levelId: null,
  telegram_link: '',
  schedules: []
})

const newSchedule = ref({
  day: '',
  start_time: '',
  end_time: '',
  teacher_id: null
})

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

const resetForm = () => {
  newClass.value = {
    name: '',
    gender: '',
    size: '',
    levelId: levelOptions.value[0]?.value ?? null,
    telegram_link: '',
    schedules: []
  }
  newSchedule.value = {
    day: '',
    start_time: '',
    end_time: '',
    teacher_id: null
  }
  mainTeacherId.value = null
  error.value = ''
  fieldErrors.value = {}
}

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

const levelOptions = computed(() => {
  return props.levels.map(level => ({
    value: level.id,
    label: level.name
  }))
})

const hasLevels = computed(() => levelOptions.value.length > 0)

watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    fetchTeachers()
    error.value = ''
    fieldErrors.value = {}
    newClass.value.levelId = levelOptions.value[0]?.value ?? null
  } else {
    resetForm()
  }
})

const distinctTeacherIds = computed(() => {
  const seen = []
  for (const s of newClass.value.schedules) {
    if (s.teacher_id && !seen.includes(s.teacher_id)) seen.push(s.teacher_id)
  }
  return seen
})

const mainTeacherOptions = computed(() => distinctTeacherIds.value.map(id => {
  const t = teacherById.value.get(id)
  return { value: id, label: t ? `${t.first_name} ${t.last_name}` : `Professeur #${id}` }
}))

watch(distinctTeacherIds, (ids) => {
  if (!ids.includes(mainTeacherId.value)) {
    mainTeacherId.value = ids[0] ?? null
  }
})

const dayOptions = [
  {value: 'Lundi', label: 'Lundi'},
  {value: 'Mardi', label: 'Mardi'},
  {value: 'Mercredi', label: 'Mercredi'},
  {value: 'Jeudi', label: 'Jeudi'},
  {value: 'Vendredi', label: 'Vendredi'},
  {value: 'Samedi', label: 'Samedi'},
  {value: 'Dimanche', label: 'Dimanche'}
]

const addSchedule = () => {
  fieldErrors.value = {}
  if (!newSchedule.value.day || !newSchedule.value.start_time || !newSchedule.value.end_time) {
    if (!newSchedule.value.day) setFieldError('schedule_day', 'Le jour est requis.')
    if (!newSchedule.value.start_time) setFieldError('schedule_start_time', 'L’heure de début est requise.')
    if (!newSchedule.value.end_time) setFieldError('schedule_end_time', 'L’heure de fin est requise.')
    error.value = 'Veuillez corriger les champs indiqués.'
    return
  }

  newClass.value.schedules.push({
    day: newSchedule.value.day,
    start_time: newSchedule.value.start_time,
    end_time: newSchedule.value.end_time,
    teacher_id: newSchedule.value.teacher_id
  })

  newSchedule.value = {
    day: '',
    start_time: '',
    end_time: '',
    teacher_id: null
  }
  error.value = ''
}

const removeSchedule = (index) => {
  newClass.value.schedules.splice(index, 1)
}

const getScheduleTeacherLabel = (schedule) => {
  if (schedule.teacher_id && teacherById.value.has(schedule.teacher_id)) {
    const t = teacherById.value.get(schedule.teacher_id)
    return `${t.first_name} ${t.last_name}`
  }
  return schedule.teacher_name || 'Aucun professeur'
}

const handleSave = async () => {
  error.value = ''
  fieldErrors.value = {}

  if (!newClass.value.name || !newClass.value.gender || !newClass.value.size) {
    if (!newClass.value.name) setFieldError('name', 'Le nom de la classe est requis.')
    if (!newClass.value.gender) setFieldError('gender', 'Le genre est requis.')
    if (!newClass.value.size) setFieldError('size', 'L’effectif maximum est requis.')
    error.value = 'Veuillez corriger les champs indiqués.'
    return
  }

  try {
    isSubmitting.value = true

    const classData = {
      ...newClass.value,
      size: parseInt(newClass.value.size),
      main_teacher_id: mainTeacherId.value
    }

    await new Promise((resolve, reject) => {
      emit('save', classData, { resolve, reject })
    })

    resetForm()
    emit('close')
  } catch (err) {
    console.error('Erreur lors de la création de la classe:', err)
    fieldErrors.value = err.response?.data?.errors || {}
    error.value = Object.keys(fieldErrors.value).length
      ? 'Veuillez corriger les champs indiqués.'
      : getErrorMessage(err, 'Une erreur est survenue lors de la création de la classe')
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 font-nunito bg-black/50 flex items-center justify-center z-50 p-3">
    <div class="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[88vh] flex flex-col">
      <div class="px-5 pt-4 pb-3 border-b border-[#E6EFF5] flex items-center justify-between shrink-0">
        <h2 class="text-base font-bold text-default font-montserrat">Ajouter une classe</h2>
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
              <InputText v-model="newClass.name" placeholder="Nom de la classe"/>
              <p v-if="firstError('name')" class="text-xs text-red-600 mt-1">{{ firstError('name') }}</p>
            </div>
            <div v-if="hasLevels">
              <InputSelect v-model="newClass.levelId" :options="levelOptions" placeholder="Niveau"/>
              <p v-if="firstError('level_id', 'levelId')" class="text-xs text-red-600 mt-1">{{ firstError('level_id', 'levelId') }}</p>
            </div>
            <div>
              <SelectGenre v-model="newClass.gender" placeholder="Genre"/>
              <p v-if="firstError('gender')" class="text-xs text-red-600 mt-1">{{ firstError('gender') }}</p>
            </div>
            <div>
              <InputNumber v-model="newClass.size" placeholder="Effectif maximum" :min="1" :max="100"/>
              <p v-if="firstError('size')" class="text-xs text-red-600 mt-1">{{ firstError('size') }}</p>
            </div>
            <div class="col-span-2">
              <InputText v-model="newClass.telegram_link" placeholder="Lien du groupe de classe"/>
              <p v-if="firstError('telegram_link')" class="text-xs text-red-600 mt-1">{{ firstError('telegram_link') }}</p>
            </div>
          </div>
        </div>

        <div>
          <h3 class="text-xs font-montserrat font-semibold text-gray-500 mb-2">Créneaux</h3>
          <div class="grid grid-cols-[1fr_1fr_auto_auto_auto] gap-2 items-center">
            <div>
              <SelectDay v-model="newSchedule.day" placeholder="Jour"/>
              <p v-if="firstError('schedule_day')" class="text-xs text-red-600 mt-1">{{ firstError('schedule_day') }}</p>
            </div>
            <InputSelect v-model="newSchedule.teacher_id" :options="teacherOptions" placeholder="Professeur"/>
            <div>
              <input
                v-model="newSchedule.start_time"
                type="time"
                title="Heure de début"
                class="px-2 py-1.5 text-sm border border-input-stroke rounded-lg focus:outline-none focus:border-default"
              />
              <p v-if="firstError('schedule_start_time')" class="text-xs text-red-600 mt-1">{{ firstError('schedule_start_time') }}</p>
            </div>
            <div>
              <input
                v-model="newSchedule.end_time"
                type="time"
                title="Heure de fin"
                class="px-2 py-1.5 text-sm border border-input-stroke rounded-lg focus:outline-none focus:border-default"
              />
              <p v-if="firstError('schedule_end_time')" class="text-xs text-red-600 mt-1">{{ firstError('schedule_end_time') }}</p>
            </div>
            <button
                @click="addSchedule"
                class="px-3 py-1.5 text-xs bg-default text-white rounded-lg hover:opacity-90"
            >
              Ajouter
            </button>
          </div>

          <div v-if="newClass.schedules.length > 0" class="mt-3 border border-[#E6EFF5] rounded-lg divide-y divide-[#E6EFF5]">
            <div
                v-for="(schedule, index) in newClass.schedules"
                :key="index"
                class="flex items-center gap-x-3 px-3 py-1.5 text-xs"
            >
              <span class="font-medium w-20">{{ schedule.day }}</span>
              <span class="text-gray-600 tabular-nums">{{ schedule.start_time }}–{{ schedule.end_time }}</span>
              <span class="text-gray-600 flex-1 min-w-0 truncate">{{ getScheduleTeacherLabel(schedule) }}</span>
              <span
                  v-if="schedule.teacher_id && schedule.teacher_id === mainTeacherId"
                  class="inline-flex items-center px-1.5 py-0.5 text-[11px] rounded-full bg-amber-100 text-amber-700 ring-1 ring-amber-300 shrink-0"
              >Principal</span>
              <button
                  @click="removeSchedule(index)"
                  class="text-gray-400 hover:text-red-600 p-1 shrink-0"
                  title="Supprimer ce créneau"
              >
                <Trash class="size-3.5"/>
              </button>
            </div>
          </div>
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
            @click="handleSave"
            :disabled="isSubmitting"
            class="px-4 py-1.5 text-sm bg-default text-white rounded-lg hover:opacity-90 disabled:opacity-50"
        >
          {{ isSubmitting ? 'Création...' : 'Créer la classe' }}
        </button>
      </div>
    </div>
  </div>
</template>
