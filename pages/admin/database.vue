<script setup>
import { ref, computed, onMounted } from 'vue'
import adminDashboardService from '~/services/adminDashboard'
import HourlyBars from '~/components/admin/HourlyBars.vue'
import { formatBytes, formatDelta } from '~/utils/adminFormat'

definePageMeta({
  layout: 'admin',
  middleware: 'super-admin'
})

usePageTitle('Admin · Base de données')

const data = ref(null)
const isLoading = ref(true)
const errorMsg = ref('')
const sort = ref('size')

onMounted(async () => {
  try {
    data.value = await adminDashboardService.getDatabase()
  } catch (e) {
    console.error(e)
    errorMsg.value = 'Erreur lors du chargement des tables.'
  } finally {
    isLoading.value = false
  }
})

const SORTS = [
  { value: 'size', label: 'Taille' },
  { value: 'rows', label: 'Lignes' },
  { value: 'growth', label: 'Croissance 30 j' }
]

const tables = computed(() => {
  const list = [...(data.value?.tables ?? [])]
  if (sort.value === 'rows') return list.sort((a, b) => b.rows - a.rows)
  if (sort.value === 'growth') return list.sort((a, b) => (b.rows_30d ?? -Infinity) - (a.rows_30d ?? -Infinity))
  return list
})

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : null
const fmtNumber = (n) => n.toLocaleString('fr-FR')

const history = computed(() => {
  const daily = data.value?.daily ?? []
  return {
    values: daily.map(d => d.size_bytes),
    tooltips: daily.map(d => `${fmtDate(d.date)} · ${formatBytes(d.size_bytes)} · ${fmtNumber(d.rows)} lignes`),
    start: daily.length ? fmtDate(daily[0].date) : '',
    end: daily.length ? fmtDate(daily.at(-1).date) : ''
  }
})
</script>

<template>
  <div class="p-6 max-w-6xl font-montserrat">
    <div class="mb-4">
      <h1 class="text-lg font-bold">Base de données</h1>
      <p class="text-gray-600 text-xs">
        Taille des tables et croissance. Une photo est prise chaque jour à la première consultation de l'administration.
      </p>
    </div>

    <div v-if="errorMsg" class="bg-red-50 text-red-700 ring-1 ring-red-200 rounded-lg px-3 py-2 text-xs mb-4">{{ errorMsg }}</div>

    <div v-if="isLoading" class="py-6 text-center">
      <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-default mx-auto"></div>
    </div>

    <template v-else-if="data">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <div class="bg-white p-5 rounded-2xl border">
          <div class="text-xl font-bold text-default tabular-nums">{{ formatBytes(data.total_bytes) }}</div>
          <div class="text-sm font-medium mt-1">Taille totale</div>
          <div class="text-xs text-gray-500 mt-0.5">données + index, {{ data.tables.length }} tables</div>
        </div>
        <div class="bg-white p-5 rounded-2xl border">
          <div class="text-xl font-bold text-default tabular-nums">{{ fmtNumber(data.total_rows) }}</div>
          <div class="text-sm font-medium mt-1">Lignes</div>
          <div class="text-xs text-gray-500 mt-0.5">toutes tables confondues</div>
        </div>
        <div class="bg-white p-5 rounded-2xl border">
          <div class="text-xl font-bold text-default tabular-nums">{{ formatDelta(data.size_30d, formatBytes) }}</div>
          <div class="text-sm font-medium mt-1">Croissance</div>
          <div class="text-xs text-gray-500 mt-0.5">
            <template v-if="data.compared_to['30d']">depuis le {{ fmtDate(data.compared_to['30d']) }}</template>
            <template v-else>historique en cours de constitution</template>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-2xl border p-5 mb-4">
        <h2 class="text-sm font-semibold mb-3">Taille totale sur 30 jours</h2>
        <HourlyBars
          v-if="history.values.length >= 2"
          :values="history.values"
          :tooltips="history.tooltips"
          :start-label="history.start"
          :end-label="history.end"
          :height="56"
          label="Taille totale de la base par jour sur 30 jours"
        />
        <p v-else class="text-xs text-gray-600">
          Une seule photo pour l'instant : la courbe apparaîtra à partir de demain, au fil des consultations.
        </p>
      </div>

      <div class="bg-white rounded-2xl border overflow-hidden">
        <div class="px-4 py-3 border-b border-[#E6EFF5] flex flex-wrap justify-between items-center gap-2">
          <h2 class="text-sm font-semibold">Tables</h2>
          <div class="inline-flex rounded-lg border border-input-stroke divide-x divide-input-stroke overflow-hidden" role="group" aria-label="Tri">
            <button
              v-for="s in SORTS"
              :key="s.value"
              class="px-3 py-1.5 text-xs transition-colors"
              :class="sort === s.value ? 'bg-default text-white' : 'bg-white text-gray-700 hover:bg-gray-50'"
              :aria-pressed="sort === s.value"
              @click="sort = s.value"
            >{{ s.label }}</button>
          </div>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full min-w-[640px]">
            <thead class="border-b border-[#E6EFF5] text-left text-xs font-semibold text-gray-600">
              <tr>
                <th class="px-4 py-2.5">Table</th>
                <th class="px-4 py-2.5 text-right">Lignes</th>
                <th class="px-4 py-2.5 text-right">Taille</th>
                <th class="px-4 py-2.5 text-right">Lignes 7 j</th>
                <th class="px-4 py-2.5 text-right">Lignes 30 j</th>
                <th class="px-4 py-2.5 text-right">Taille 30 j</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#E6EFF5] font-nunito text-sm tabular-nums">
              <tr v-for="t in tables" :key="t.name" class="hover:bg-gray-50">
                <td class="px-4 py-2 font-mono text-xs">{{ t.name }}</td>
                <td class="px-4 py-2 text-right">
                  <span v-if="!t.rows_exact" class="text-gray-500">≈ </span>{{ fmtNumber(t.rows) }}
                </td>
                <td class="px-4 py-2 text-right">{{ formatBytes(t.size_bytes) }}</td>
                <td class="px-4 py-2 text-right" :class="t.rows_7d ? '' : 'text-gray-400'">{{ formatDelta(t.rows_7d) }}</td>
                <td class="px-4 py-2 text-right" :class="t.rows_30d ? '' : 'text-gray-400'">{{ formatDelta(t.rows_30d) }}</td>
                <td class="px-4 py-2 text-right" :class="t.size_30d ? '' : 'text-gray-400'">{{ formatDelta(t.size_30d, formatBytes) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="px-4 py-2 border-t border-[#E6EFF5] text-[11px] text-gray-500">
          Tailles fournies par MariaDB, arrondies par pages de 16 Ko : une petite table occupe au moins 16 Ko même vide.
          « ≈ » : nombre de lignes estimé (tables de plus de 100 000 lignes).
        </p>
      </div>
    </template>
  </div>
</template>
