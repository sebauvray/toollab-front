<script setup>
import {ref, computed} from 'vue'
import Cross from '~/components/Icons/Cross.vue'
import Trash from '~/components/Icons/Trash.vue'
import InputText from '~/components/form/InputText.vue'
import InputSelect from '~/components/form/InputSelect.vue'
import InputNumber from '~/components/form/InputNumber.vue'
import SelectGenre from '~/components/form/SelectGenre.vue'
import SelectDay from "~/components/form/SelectDay.vue";

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
  teacher_name: ''
})

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
    teacher_name: newSchedule.value.teacher_name
  })

  newSchedule.value = {
    day: '',
    start_time: '',
    end_time: '',
    teacher_name: ''
  }
  error.value = ''
}

const removeSchedule = (index) => {
  newClass.value.schedules.splice(index, 1)
}

const getTeacherName = (teacherName) => {
  return teacherName || 'Aucun professeur'
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
    <div class="bg-white rounded-2xl px-6 pt-4 pb-5 w-[70rem] max-h-[95vh] overflow-y-auto">
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

      <div v-if="error" class="bg-red-100 text-red-800 p-3 rounded mt-4 mb-2">
        {{ error }}
      </div>

      <div class="mt-6">
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

        <div class="grid grid-cols-2 gap-4 mb-4">
          <div>
            <SelectDay
                v-model="newSchedule.day"
                placeholder="Jour"
            />
          </div>
          <div>
            <InputText
                v-model="newSchedule.teacher_name"
                placeholder="Nom du professeur"
            />
          </div>
        </div>
        <div class="grid grid-cols-3 gap-4">
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
          <div class="flex items-end">
            <button
                @click="addSchedule"
                class="w-full bg-default text-white px-4 py-2 rounded-md hover:opacity-90"
            >
              Ajouter
            </button>
          </div>
        </div>

        <div v-if="newClass.schedules.length > 0" class="space-y-2 mb-6">
          <div
              v-for="(schedule, index) in newClass.schedules"
              :key="index"
              class="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
          >
            <div class="flex items-center space-x-4">
              <span class="font-medium">{{ schedule.day }}</span>
              <span>{{ schedule.start_time }} - {{ schedule.end_time }}</span>
              <span class="text-gray-600">{{ getTeacherName(schedule.teacher_name) }}</span>
            </div>
            <button
                @click="removeSchedule(index)"
                class="text-red-500 hover:text-red-700 p-1"
            >
              <Trash class="size-5"/>
            </button>
          </div>
        </div>

        <div class="flex justify-end space-x-4 mt-3">
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
  </div>
</template>