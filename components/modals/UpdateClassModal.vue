<template>
  <div v-if="isOpen" class="fixed inset-0 font-nunito bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-2xl w-[95vw] max-w-[70rem] h-[90dvh] sm:h-[85vh] flex flex-col">
      <div class="px-5 pt-3 shrink-0">
        <div class="flex justify-between items-center mb-3">
          <h2 class="text-xl font-bold mx-auto">Modifier la classe</h2>
          <button
              @click="$emit('close')"
              class="text-gray-500 hover:text-gray-700 p-1.5 rounded-full hover:bg-gray-50"
              aria-label="Fermer"
          >
            <Cross class="size-4"/>
          </button>
        </div>
        <div class="w-full h-px border rounded-xl bg-gray-200"></div>
      </div>

      <div class="flex-1 overflow-y-auto px-5 py-3">
        <div v-if="error" class="bg-red-100 text-red-800 p-2 rounded mb-3">
          {{ error }}
        </div>
        <h3 class="text-base font-semibold mb-1.5">Informations sur la classe</h3>

        <div class="grid grid-cols-2 gap-3 mb-3">
          <div>
            <InputText
                v-model="editClass.name"
                placeholder="Nom de la classe"
            />
          </div>

          <div>
            <InputSelect
                v-model="editClass.levelId"
                :options="levelOptions"
                placeholder="Niveau"
            />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3 mb-3">
          <div>
            <SelectGenre
                v-model="editClass.gender"
                placeholder="Genre"
            />
          </div>

          <div>
            <InputNumber
                v-model="editClass.size"
                placeholder="Effectif maximum"
                :min="1"
                :max="100"
            />
          </div>
        </div>

        <div class="mb-5">
          <InputText
              v-model="editClass.telegram_link"
              placeholder="Lien Telegram"
          />
        </div>

        <h3 class="text-base font-semibold mb-1.5">Ajouter un créneau</h3>

        <div class="grid grid-cols-5 gap-3 items-end">
          <div>
            <SelectDay
                v-model="newSchedule.day"
                placeholder="Jour"
            />
          </div>
          <div>
            <InputSelect
                v-model="newSchedule.teacher_id"
                :options="teacherOptions"
                placeholder="Professeur"
            />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">Heure de début</label>
            <input
                v-model="newSchedule.start_time"
                type="time"
                class="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:border-default"
            />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">Heure de fin</label>
            <input
                v-model="newSchedule.end_time"
                type="time"
                class="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:border-default"
            />
          </div>
          <div>
            <button
                @click="addSchedule"
                class="w-full bg-default text-white px-3 py-1.5 rounded-md hover:opacity-90"
            >
              Ajouter
            </button>
          </div>
        </div>

        <div v-if="editClass.schedules.length > 0" class="space-y-1.5 mt-5">
          <h4 class="text-xs font-semibold text-gray-700">Créneaux existants</h4>
          <template v-for="(schedule, index) in editClass.schedules" :key="index">
            <div
                v-if="editingScheduleIndex === index"
                class="grid grid-cols-5 gap-3 items-end p-2 bg-gray-50 rounded-lg"
            >
              <div>
                <SelectDay v-model="schedule.day" placeholder="Jour"/>
              </div>
              <div>
                <InputSelect v-model="schedule.teacher_id" :options="teacherOptions" placeholder="Professeur"/>
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Heure de début</label>
                <input
                    v-model="schedule.start_time"
                    type="time"
                    class="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:border-default bg-white"
                />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Heure de fin</label>
                <input
                    v-model="schedule.end_time"
                    type="time"
                    class="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:border-default bg-white"
                />
              </div>
              <div class="flex justify-end gap-x-1.5">
                <button
                    @click="cancelEditSchedule"
                    class="px-2 py-1.5 border border-gray-300 text-gray-600 rounded-md hover:bg-gray-50 text-xs"
                    title="Annuler"
                >
                  Annuler
                </button>
                <button
                    @click="validateEditSchedule"
                    class="px-2 py-1.5 bg-default text-white rounded-md hover:opacity-90 text-xs"
                    title="Valider"
                >
                  Valider
                </button>
              </div>
            </div>
            <div
                v-else
                class="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
            >
              <div class="flex items-center space-x-3">
                <span class="font-medium">{{ schedule.day }}</span>
                <span>{{ schedule.start_time }} - {{ schedule.end_time }}</span>
                <span class="text-gray-600">{{ getScheduleTeacherLabel(schedule) }}</span>
              </div>
              <div class="flex items-center gap-x-1">
                <button
                    @click="startEditSchedule(index)"
                    class="text-gray-500 hover:text-blue-600 transition-colors p-1"
                    title="Modifier ce créneau"
                >
                  <Edit class="size-4"/>
                </button>
                <button
                    @click="removeSchedule(index)"
                    class="text-red-500 hover:text-red-700 p-1"
                    title="Supprimer ce créneau"
                >
                  <Trash class="size-4"/>
                </button>
              </div>
            </div>
          </template>
        </div>
      </div>

      <div class="shrink-0 border-t border-gray-200 px-5 py-3 flex justify-end space-x-3">
        <button
            @click="$emit('close')"
            class="px-5 py-1.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
        >
          Annuler
        </button>
        <button
            @click="handleUpdate"
            :disabled="isSubmitting"
            class="px-5 py-1.5 bg-default text-white rounded-lg hover:opacity-90 disabled:opacity-50"
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
  levelId: 1,
  telegram_link: '',
  schedules: []
})

const newSchedule = ref({
  day: '',
  start_time: '',
  end_time: '',
  teacher_id: null
})

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

watch(() => props.classData, (newClassData) => {
  if (newClassData && props.isOpen) {
    editClass.value = {
      id: newClassData.id,
      name: newClassData.name || '',
      gender: newClassData.gender || '',
      size: newClassData.size ? newClassData.size.toString() : '',
      levelId: newClassData.level?.id || newClassData.level_id || 1,
      telegram_link: newClassData.telegram_link || '',
      schedules: newClassData.schedules ? [...newClassData.schedules] : []
    }
  }
}, { immediate: true })

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
      size: parseInt(editClass.value.size)
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