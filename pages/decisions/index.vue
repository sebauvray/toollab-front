<script setup>
import { ref, computed, onMounted } from 'vue'
import PageContainer from '~/components/layout/PageContainer.vue'
import BreadCrumb from '~/components/navigation/BreadCrumb.vue'
import { usePageTitle } from '~/composables/usePageTitle.js'
import suiviService from '~/services/suivi'

definePageMeta({
  layout: 'auth',
  middleware: 'admin-director',
  layoutData: { title: 'Suivi des décisions' }
})

usePageTitle('Suivi des décisions')

const { setFlashMessage } = useFlashMessage()

const items = ref([])
const isLoading = ref(true)
const fCursus = ref('')
const fClasse = ref('')
const fOutcome = ref('')

const breadcrumbItems = [
  { name: 'Classes', path: '/classes' },
  { name: 'Vue d\'ensemble des décisions', path: '/decisions' }
]

const outcomeMeta = {
  passage: { label: 'Passage', dot: 'bg-green-500', cls: 'bg-green-50 text-green-700 ring-1 ring-green-200' },
  redoublement: { label: 'Redoublement', dot: 'bg-amber-500', cls: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' },
  fin_cursus: { label: 'Fin de cursus', dot: 'bg-blue-500', cls: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200' },
  exclusion: { label: 'Exclusion', dot: 'bg-red-500', cls: 'bg-red-50 text-red-700 ring-1 ring-red-200' }
}

const cursusOptions = computed(() => [...new Set(items.value.map(i => i.cursus).filter(Boolean))].sort())
const classeOptions = computed(() => [...new Set(
  items.value.filter(i => !fCursus.value || i.cursus === fCursus.value).map(i => i.classroom_name).filter(Boolean)
)].sort())

const filteredItems = computed(() => items.value.filter(i => {
  if (fCursus.value && i.cursus !== fCursus.value) return false
  if (fClasse.value && i.classroom_name !== fClasse.value) return false
  if (fOutcome.value === 'none' && i.outcome) return false
  if (fOutcome.value && fOutcome.value !== 'none' && i.outcome !== fOutcome.value) return false
  return true
}))

const counts = computed(() => {
  const c = { passage: 0, redoublement: 0, fin_cursus: 0, exclusion: 0, none: 0 }
  for (const i of filteredItems.value) i.outcome ? c[i.outcome]++ : c.none++
  return c
})

const resetFilters = () => { fCursus.value = ''; fClasse.value = ''; fOutcome.value = '' }

const fetchData = async () => {
  try {
    isLoading.value = true
    const data = await suiviService.outcomesOverview()
    items.value = data.items || []
  } catch (e) {
    setFlashMessage({ type: 'error', message: 'Impossible de charger les décisions' })
  } finally {
    isLoading.value = false
  }
}

onMounted(() => fetchData())
</script>

<template>
  <PageContainer>
    <BreadCrumb :custom-items="breadcrumbItems" />
    <p class="text-xs text-gray-600 mb-4 max-w-3xl">
      Décisions de fin d'année (passage, redoublement, fin de cursus, exclusion) de tous les élèves, par cursus et par classe.
    </p>

    <div v-if="isLoading" class="py-10 text-center text-xs text-placeholder">Chargement…</div>

    <template v-else>
      <div class="flex flex-wrap items-end gap-2 mb-3">
        <div>
          <label class="block text-[11px] uppercase tracking-wide text-gray-500 mb-1">Cursus</label>
          <select v-model="fCursus" @change="fClasse = ''" class="px-2 py-1.5 text-xs border border-input-stroke rounded-lg focus:outline-none focus:border-default min-w-[12rem]">
            <option value="">Tous les cursus</option>
            <option v-for="c in cursusOptions" :key="c" :value="c">{{ c }}</option>
          </select>
        </div>
        <div>
          <label class="block text-[11px] uppercase tracking-wide text-gray-500 mb-1">Classe</label>
          <select v-model="fClasse" class="px-2 py-1.5 text-xs border border-input-stroke rounded-lg focus:outline-none focus:border-default min-w-[12rem]">
            <option value="">Toutes les classes</option>
            <option v-for="c in classeOptions" :key="c" :value="c">{{ c }}</option>
          </select>
        </div>
        <div>
          <label class="block text-[11px] uppercase tracking-wide text-gray-500 mb-1">Décision</label>
          <select v-model="fOutcome" class="px-2 py-1.5 text-xs border border-input-stroke rounded-lg focus:outline-none focus:border-default min-w-[12rem]">
            <option value="">Toutes</option>
            <option value="passage">Passage</option>
            <option value="redoublement">Redoublement</option>
            <option value="fin_cursus">Fin de cursus</option>
            <option value="exclusion">Exclusion</option>
            <option value="none">Non décidé</option>
          </select>
        </div>
        <button type="button" @click="resetFilters" class="px-3 py-1.5 text-xs text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">Réinitialiser</button>
      </div>

      <div class="flex flex-wrap items-center gap-x-3 gap-y-1 mb-3 text-xs">
        <span class="text-placeholder">{{ filteredItems.length }} élève{{ filteredItems.length > 1 ? 's' : '' }} ·</span>
        <span class="text-green-700">{{ counts.passage }} passage{{ counts.passage > 1 ? 's' : '' }}</span>
        <span class="text-amber-700">{{ counts.redoublement }} redoublement{{ counts.redoublement > 1 ? 's' : '' }}</span>
        <span class="text-blue-700">{{ counts.fin_cursus }} fin de cursus</span>
        <span class="text-red-700">{{ counts.exclusion }} exclusion{{ counts.exclusion > 1 ? 's' : '' }}</span>
        <span class="text-gray-400">{{ counts.none }} non décidé{{ counts.none > 1 ? 's' : '' }}</span>
      </div>

      <div class="bg-white rounded-2xl border overflow-hidden font-nunito">
        <table class="min-w-full text-xs">
          <thead class="bg-gray-50 border-b border-[#E6EFF5] font-montserrat">
            <tr>
              <th class="px-3 py-2 text-left font-semibold text-gray-600">Élève</th>
              <th class="px-3 py-2 text-left font-semibold text-gray-600">Cursus</th>
              <th class="px-3 py-2 text-left font-semibold text-gray-600">Classe</th>
              <th class="px-3 py-2 text-left font-semibold text-gray-600 w-40">Décision</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#E6EFF5]">
            <tr v-for="i in filteredItems" :key="`${i.student_id}-${i.classroom_id}`" class="hover:bg-gray-50">
              <td class="px-3 py-1.5 font-medium text-gray-900 whitespace-nowrap">{{ i.last_name }} {{ i.first_name }}</td>
              <td class="px-3 py-1.5 text-gray-600">{{ i.cursus || '—' }}</td>
              <td class="px-3 py-1.5 text-gray-600">{{ i.classroom_name || '—' }}</td>
              <td class="px-3 py-1.5">
                <span v-if="i.outcome" :class="['inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium', outcomeMeta[i.outcome]?.cls]">
                  <span class="h-1.5 w-1.5 rounded-full" :class="outcomeMeta[i.outcome]?.dot"></span>
                  {{ outcomeMeta[i.outcome]?.label }}
                </span>
                <span v-else class="text-gray-300">Non décidé</span>
              </td>
            </tr>
            <tr v-if="filteredItems.length === 0">
              <td colspan="4" class="px-3 py-6 text-center text-placeholder">Aucun élève ne correspond aux filtres.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </PageContainer>
</template>
