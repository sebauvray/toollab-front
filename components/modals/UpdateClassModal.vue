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
            <InputText v-model="editClass.name" placeholder="Nom de la classe"/>
            <InputSelect v-if="hasLevels" v-model="editClass.levelId" :options="levelOptions" placeholder="Niveau"/>
            <SelectGenre v-model="editClass.gender" placeholder="Genre"/>
            <InputNumber v-model="editClass.size" placeholder="Effectif maximum" :min="1" :max="100"/>
            <div class="col-span-2">
              <InputText v-model="editClass.telegram_link" placeholder="Lien du groupe de classe"/>
            </div>
          </div>
        </div>

        <div>
          <h3 class="text-xs font-montserrat font-semibold text-gray-500 mb-2">Créneaux</h3>
          <div class="grid grid-cols-[1fr_1fr_auto_auto_auto] gap-2 items-center">
            <SelectDay v-model="newSchedule.day" placeholder="Jour"/>
            <InputSelect v-model="newSchedule.teacher_id" :options="teacherOptions" placeholder="Professeur"/>
            <input
                v-model="newSchedule.start_time"
                type="time"
                title="Heure de début"
                class="px-2 py-1.5 text-sm border border-input-stroke rounded-lg focus:outline-none focus:border-default"
            />
            <input
                v-model="newSchedule.end_time"
                type="time"
                title="Heure de fin"
                class="px-2 py-1.5 text-sm border border-input-stroke rounded-lg focus:outline-none focus:border-default"
            />
            <button
                @click="addSchedule"
                class="px-3 py-1.5 text-xs bg-default text-white rounded-lg hover:opacity-90"
            >
              Ajouter
            </button>
          </div>

          <div v-if="editClass.schedules.length > 0" class="mt-3 border border-[#E6EFF5] rounded-lg divide-y divide-[#E6EFF5]">
            <template v-for="(schedule, index) in editClass.schedules" :key="index">
              <div
                  v-if="editingScheduleIndex === index"
                  class="grid grid-cols-[1fr_1fr_auto_auto_auto] gap-2 items-center px-3 py-2"
              >
                <SelectDay v-model="schedule.day" placeholder="Jour"/>
                <InputSelect v-model="schedule.teacher_id" :options="teacherOptions" placeholder="Professeur"/>
                <input
                v-model="schedule.start_time"
                type="time"
                title="Heure de début"
                class="px-2 py-1.5 text-sm border border-input-stroke rounded-lg focus:outline-none focus:border-default"
            />
                <input
                v-model="schedule.end_time"
                type="time"
                title="Heure de fin"
                class="px-2 py-1.5 text-sm border border-input-stroke rounded-lg focus:outline-none focus:border-default"
            />
                <div class="flex items-center gap-x-1">
                  <button
                      @click="validateEditSchedule"
                      class="inline-flex items-center justify-center w-7 h-7 bg-default text-white rounded-lg hover:opacity-90"
                      title="Valider"
                  >
                    <svg class="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
                  </button>
                  <button
                      @click="cancelEditSchedule"
                      class="inline-flex items-center justify-center w-7 h-7 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                      title="Annuler"
                  >
                    <Cross class="size-3.5"/>
                  </button>
                </div>
              </div>
              <div
                  v-else
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
                    @click="startEditSchedule(index)"
                    class="text-gray-400 hover:text-default p-1 shrink-0"
                    title="Modifier ce créneau"
                >
                  <Edit class="size-3.5"/>
                </button>
                <button
                    @click="removeSchedule(index)"
                    class="text-gray-400 hover:text-red-600 p-1 shrink-0"
                    title="Supprimer ce créneau"
                >
                  <Trash class="size-3.5"/>
                </button>
              </div>
            </template>
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
import Edit from '~/components/Icons/Edit.vue'
import Trash from '~/components/Icons/Trash.vue'
import InputText from '~/components/form/InputText.vue'
import InputSelect from '~/components/form/InputSelect.vue'
import InputNumber from '~/components/form/InputNumber.vue'
import SelectGenre from '~/components/form/SelectGenre.vue'
import SelectDay from "~/components/form/SelectDay.vue";
import userService from '~/services/user'

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
const isSubmitting = ref(false)

const editClass = ref({
  id: null,
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

watch(() => props.isOpen, (isOpen) => {
  if (isOpen) fetchTeachers()
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
      schedules: newClassData.schedules ? [...newClassData.schedules] : []
    }
    mainTeacherId.value = newClassData.main_teacher_id || null
  }
}, { immediate: true })

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

const addSchedule = () => {
  if (!newSchedule.value.day || !newSchedule.value.start_time || !newSchedule.value.end_time) {
    error.value = 'Jour, heure de début et heure de fin sont requis'
    return
  }

  editClass.value.schedules.push({
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
  if (editingScheduleIndex.value === index) {
    editingScheduleIndex.value = -1
    editScheduleBackup.value = null
  }
  editClass.value.schedules.splice(index, 1)
}

const editingScheduleIndex = ref(-1)
const editScheduleBackup = ref(null)

const startEditSchedule = (index) => {
  if (editingScheduleIndex.value === index) return
  if (editingScheduleIndex.value !== -1) {
    cancelEditSchedule()
  }
  editingScheduleIndex.value = index
  editScheduleBackup.value = {...editClass.value.schedules[index]}
}

const validateEditSchedule = () => {
  const s = editClass.value.schedules[editingScheduleIndex.value]
  if (!s || !s.day || !s.start_time || !s.end_time) {
    error.value = 'Jour, heure de début et heure de fin sont requis'
    return
  }
  editingScheduleIndex.value = -1
  editScheduleBackup.value = null
  error.value = ''
}

const cancelEditSchedule = () => {
  if (editScheduleBackup.value !== null && editingScheduleIndex.value !== -1) {
    Object.assign(editClass.value.schedules[editingScheduleIndex.value], editScheduleBackup.value)
  }
  editingScheduleIndex.value = -1
  editScheduleBackup.value = null
}

const getScheduleTeacherLabel = (schedule) => {
  if (schedule.teacher_id && teacherById.value.has(schedule.teacher_id)) {
    const t = teacherById.value.get(schedule.teacher_id)
    return `${t.first_name} ${t.last_name}`
  }
  if (schedule.teacher && schedule.teacher.first_name) {
    return `${schedule.teacher.first_name} ${schedule.teacher.last_name}`
  }
  return schedule.teacher_name || 'Aucun professeur'
}

const handleUpdate = () => {
  if (!editClass.value.name || !editClass.value.gender || !editClass.value.size) {
    error.value = 'Nom, genre et effectif maximum sont requis'
    return
  }

  try {
    isSubmitting.value = true
    error.value = ''

    const classData = {
      ...editClass.value,
      size: parseInt(editClass.value.size),
      main_teacher_id: mainTeacherId.value
    }

    emit('update', classData)
  } catch (err) {
    console.error('Erreur lors de la modification de la classe:', err)
    error.value = 'Une erreur est survenue lors de la modification de la classe'
  } finally {
    isSubmitting.value = false
  }
}
</script>
