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
const isSubmitting = ref(false)

const newClass = ref({
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
  if (!newSchedule.value.day || !newSchedule.value.start_time || !newSchedule.value.end_time) {
    error.value = 'Jour, heure de début et heure de fin sont requis'
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

const handleSave = () => {
  if (!newClass.value.name || !newClass.value.gender || !newClass.value.size) {
    error.value = 'Nom, genre et effectif maximum sont requis'
    return
  }

  try {
    isSubmitting.value = true
    error.value = ''

    const classData = {
      ...newClass.value,
      size: parseInt(newClass.value.size)
    }

    emit('save', classData)

    newClass.value = {
      name: '',
      gender: '',
      size: '',
      levelId: 1,
      telegram_link: '',
      schedules: []
    }

    emit('close')
  } catch (err) {
    console.error('Erreur lors de la création de la classe:', err)
    error.value = 'Une erreur est survenue lors de la création de la classe'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 font-nunito bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-2xl w-[70rem] h-[85vh] flex flex-col">
      <div class="px-6 pt-4 shrink-0">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-2xl font-bold mx-auto">Ajouter une classe</h2>
          <button
              @click="$emit('close')"
              class="text-gray-500 hover:text-gray-700 p-2 rounded-full hover:bg-gray-50"
              aria-label="Fermer"
          >
            <Cross class="size-6"/>
          </button>
        </div>
        <div class="w-full h-px border rounded-xl bg-gray-200"></div>
      </div>

      <div class="flex-1 overflow-y-auto px-6 py-4">
        <div v-if="error" class="bg-red-100 text-red-800 p-3 rounded mb-4">
          {{ error }}
        </div>
        <h3 class="text-lg font-semibold mb-2">Informations sur la classe</h3>

        <div class="grid grid-cols-2 gap-4 mb-4">
          <div>
            <InputText
                v-model="newClass.name"
                placeholder="Nom de la classe"
            />
          </div>

          <div>
            <InputSelect
                v-model="newClass.levelId"
                :options="levelOptions"
                placeholder="Niveau"
            />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4 mb-4">
          <div>
            <SelectGenre
                v-model="newClass.gender"
                placeholder="Genre"
            />
          </div>

          <div>
            <InputNumber
                v-model="newClass.size"
                placeholder="Effectif maximum"
                :min="1"
                :max="100"
            />
          </div>
        </div>

        <div class="mb-6">
          <InputText
              v-model="newClass.telegram_link"
              placeholder="Lien Telegram"
          />
        </div>

        <h3 class="text-lg font-semibold mb-2">Ajouter un créneau</h3>

        <div class="grid grid-cols-5 gap-4 items-end">
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
            <label class="block text-sm font-medium text-gray-700 mb-1">Heure de début</label>
            <input
                v-model="newSchedule.start_time"
                type="time"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-default"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Heure de fin</label>
            <input
                v-model="newSchedule.end_time"
                type="time"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-default"
            />
          </div>
          <div>
            <button
                @click="addSchedule"
                class="w-full bg-default text-white px-4 py-2 rounded-md hover:opacity-90"
            >
              Ajouter
            </button>
          </div>
        </div>

        <div v-if="newClass.schedules.length > 0" class="space-y-2 mt-6">
          <div
              v-for="(schedule, index) in newClass.schedules"
              :key="index"
              class="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
          >
            <div class="flex items-center space-x-4">
              <span class="font-medium">{{ schedule.day }}</span>
              <span>{{ schedule.start_time }} - {{ schedule.end_time }}</span>
              <span class="text-gray-600">{{ getScheduleTeacherLabel(schedule) }}</span>
            </div>
            <button
                @click="removeSchedule(index)"
                class="text-red-500 hover:text-red-700 p-1"
            >
              <Trash class="size-5"/>
            </button>
          </div>
        </div>
      </div>

      <div class="shrink-0 border-t border-gray-200 px-6 py-4 flex justify-end space-x-4">
        <button
            @click="$emit('close')"
            class="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
        >
          Annuler
        </button>
        <button
            @click="handleSave"
            :disabled="isSubmitting"
            class="px-6 py-2 bg-default text-white rounded-lg hover:opacity-90 disabled:opacity-50"
        >
          {{ isSubmitting ? 'Création...' : 'Créer la classe' }}
        </button>
      </div>
    </div>
  </div>
</template>