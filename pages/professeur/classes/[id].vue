<script setup>
import {ref, computed, onMounted} from 'vue'
import {useRoute} from '#imports'
import PageContainer from '~/components/layout/PageContainer.vue'
import BreadCrumb from '~/components/navigation/BreadCrumb.vue'
import {usePageTitle} from '~/composables/usePageTitle.js'
import teacherService from '~/services/teacher'

definePageMeta({
  layout: 'auth',
  layoutData: {title: 'Détail de classe'}
})

usePageTitle('Détail de classe')

const route = useRoute()
const {setFlashMessage} = useFlashMessage()

const classroom = ref(null)
const students = ref([])
const outcomesOpen = ref(false)
const yearClosed = ref(false)
const isLoading = ref(true)
const isSaving = ref(false)
const error = ref(null)

const breadcrumbItems = computed(() => [
  {name: 'Mes classes', path: '/professeur/classes'},
  {name: classroom.value?.name || 'Classe', path: route.path}
])

const outcomeOptions = [
  {
    value: 'passage',
    label: 'Passage',
    selectedClass: 'bg-green-600 text-white border-green-600',
    idleClass: 'bg-white text-green-700 border-green-300 hover:bg-green-50'
  },
  {
    value: 'redoublement',
    label: 'Redoublement',
    selectedClass: 'bg-amber-500 text-white border-amber-500',
    idleClass: 'bg-white text-amber-700 border-amber-300 hover:bg-amber-50'
  },
  {
    value: 'fin_cursus',
    label: 'Fin de cursus',
    selectedClass: 'bg-blue-600 text-white border-blue-600',
    idleClass: 'bg-white text-blue-700 border-blue-300 hover:bg-blue-50'
  },
  {
    value: 'exclusion',
    label: 'Exclusion',
    selectedClass: 'bg-red-600 text-white border-red-600',
    idleClass: 'bg-white text-red-700 border-red-300 hover:bg-red-50'
  }
]

const canEdit = computed(() => outcomesOpen.value && !yearClosed.value)

const decisionsCount = computed(() => students.value.filter(s => s.outcome).length)

const fetchData = async () => {
  try {
    isLoading.value = true
    const response = await teacherService.classroomStudents(route.params.id)
    if (response.status === 'success') {
      classroom.value = response.data.classroom
      students.value = response.data.students.map(s => ({
        ...s,
        outcome: s.outcome || '',
        commentaire: s.commentaire || ''
      }))
      outcomesOpen.value = response.data.outcomes_open
      yearClosed.value = response.data.year_closed
    }
  } catch (e) {
    console.error('Erreur récupération élèves:', e)
    error.value = 'Impossible de charger les élèves'
  } finally {
    isLoading.value = false
  }
}

const handleSave = async () => {
  if (!canEdit.value) return

  const decisions = students.value
      .filter(s => s.outcome)
      .map(s => ({
        student_id: s.student_id,
        outcome: s.outcome,
        commentaire: s.commentaire || null
      }))

  if (decisions.length === 0) {
    setFlashMessage({type: 'error', message: 'Aucune décision à enregistrer'})
    return
  }

  try {
    isSaving.value = true
    await teacherService.saveOutcomes(route.params.id, decisions)
    setFlashMessage({type: 'success', message: 'Décisions enregistrées'})
    await fetchData()
  } catch (e) {
    setFlashMessage({
      type: 'error',
      message: e.response?.data?.message || 'Erreur lors de l\'enregistrement'
    })
  } finally {
    isSaving.value = false
  }
}

onMounted(() => fetchData())
</script>

<template>
  <PageContainer>
    <BreadCrumb :custom-items="breadcrumbItems" />

    <div v-if="isLoading" class="py-10 text-center text-gray-500 text-xs">Chargement…</div>
    <div v-else-if="error" class="bg-red-50 text-red-700 p-2 rounded">{{ error }}</div>

    <template v-else>
      <div class="flex items-center justify-between gap-3 mb-5">
        <p class="text-xs text-gray-500">{{ students.length }} élève{{ students.length > 1 ? 's' : '' }}</p>
        <button
            v-if="canEdit && students.length > 0"
            type="button"
            @click="handleSave"
            :disabled="isSaving || decisionsCount === 0"
            :class="[
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0',
              decisionsCount === 0
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                : 'bg-primary text-white hover:opacity-90 shadow-sm hover:shadow-md'
            ]"
        >
          <span
              v-if="decisionsCount > 0"
              class="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-1 rounded-full bg-white/25 text-xs font-bold"
          >
            {{ decisionsCount }}
          </span>
          {{ isSaving
              ? 'Enregistrement…'
              : decisionsCount === 0
                  ? 'Aucune décision saisie'
                  : `Enregistrer ${decisionsCount > 1 ? 'les décisions' : 'la décision'}`
          }}
        </button>
      </div>

      <div v-if="yearClosed" class="mb-3 px-2 py-1.5 rounded-md bg-gray-100 text-gray-700 text-xs">
        Année clôturée — lecture seule
      </div>
      <div v-else-if="!outcomesOpen" class="mb-3 px-2 py-1.5 rounded-md bg-amber-50 text-amber-800 text-xs border border-amber-200">
        Saisie des décisions non activée par le directeur
      </div>

      <div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table class="min-w-full">
          <thead class="bg-gray-50 border-b border-gray-200">
          <tr>
            <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Élève</th>
            <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-2/5">Décision</th>
            <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Commentaire</th>
          </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
          <tr v-for="s in students" :key="s.student_id">
            <td class="px-3 py-2 text-xs text-gray-900 font-medium">
              {{ s.first_name }} {{ s.last_name }}
            </td>
            <td class="px-3 py-2">
              <div v-if="canEdit" class="flex flex-wrap gap-1.5">
                <label
                    v-for="opt in outcomeOptions"
                    :key="opt.value"
                    :class="[
                      'inline-flex items-center gap-1 px-2 py-1 rounded border text-xs font-medium cursor-pointer transition-colors',
                      s.outcome === opt.value ? opt.selectedClass : opt.idleClass
                    ]"
                >
                  <input
                      type="radio"
                      :name="`outcome-${s.student_id}`"
                      :value="opt.value"
                      v-model="s.outcome"
                      class="hidden"
                  />
                  {{ opt.label }}
                </label>
              </div>
              <span
                  v-else-if="s.outcome"
                  :class="[
                    'inline-flex items-center px-2 py-1 rounded border text-xs font-medium',
                    outcomeOptions.find(o => o.value === s.outcome)?.selectedClass
                  ]"
              >
                {{ outcomeOptions.find(o => o.value === s.outcome)?.label }}
              </span>
              <span v-else class="text-xs text-gray-400">Aucune décision</span>
            </td>
            <td class="px-3 py-2">
              <input
                  v-if="canEdit"
                  v-model="s.commentaire"
                  type="text"
                  placeholder="Optionnel"
                  class="w-full px-1.5 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:border-primary"
              />
              <span v-else class="text-xs text-gray-600">{{ s.commentaire || '—' }}</span>
            </td>
          </tr>
          <tr v-if="students.length === 0">
            <td colspan="3" class="px-3 py-6 text-center text-xs text-gray-500">
              Aucun élève inscrit dans cette classe.
            </td>
          </tr>
          </tbody>
        </table>
      </div>

    </template>
  </PageContainer>
</template>
