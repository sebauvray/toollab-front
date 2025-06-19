<template>
  <div v-if="isOpen" class="fixed inset-0 font-nunito bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-2xl px-6 pt-4 pb-5 w-[70rem] max-h-[95vh] overflow-y-auto">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-2xl font-bold mx-auto">Modifier la classe</h2>
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

        <div class="grid grid-cols-2 gap-4 mb-4">
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

        <div class="mb-6">
          <InputText
              v-model="editClass.telegram_link"
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
            <InputText
                v-model="newSchedule.teacher_name"
                placeholder="Nom du professeur"
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

        <div v-if="editClass.schedules.length > 0" class="space-y-2 mb-6 mt-6">
          <div
              v-for="(schedule, index) in editClass.schedules"
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

        <div class="flex justify-end space-x-4 mt-32">
          <button
              @click="$emit('close')"
              class="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Annuler
          </button>
          <button
              @click="handleUpdate"
              :disabled="isSubmitting"
              class="px-6 py-2 bg-default text-white rounded-lg hover:opacity-90 disabled:opacity-50"
          >
            {{ isSubmitting ? 'Modification...' : 'Modifier la classe' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import {ref, computed, watch} from 'vue'
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
  teacher_name: ''
})

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
  editClass.value.schedules.splice(index, 1)
}

const getTeacherName = (teacherName) => {
  return teacherName || 'Aucun professeur'
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