<script setup>
import { ref, computed } from 'vue'
import familyService from '~/services/family'
import { saveExport } from '~/utils/download'
import { getErrorMessage } from '~/utils/errors'

const emit = defineEmits(['imported'])

const file = ref(null)
const isDragging = ref(false)
const isImporting = ref(false)
const isDownloading = ref(false)
const result = ref(null)
const fileInput = ref(null)

const ACCEPTED = ['xlsx', 'csv']

const fileLabel = computed(() => file.value ? file.value.name : '')

const pickFile = () => fileInput.value?.click()

const setFile = (f) => {
  if (!f) return
  const ext = f.name.split('.').pop().toLowerCase()
  if (!ACCEPTED.includes(ext)) {
    result.value = { type: 'error', message: 'Format non supporté. Choisissez un fichier .xlsx ou .csv.' }
    return
  }
  file.value = f
  result.value = null
}

const onDrop = (e) => {
  isDragging.value = false
  setFile(e.dataTransfer?.files?.[0])
}

const onSelect = (e) => {
  setFile(e.target.files?.[0])
  e.target.value = ''
}

const clearFile = () => {
  file.value = null
  result.value = null
}

const downloadTemplate = async () => {
  if (isDownloading.value) return
  isDownloading.value = true
  try {
    const blob = await familyService.downloadImportTemplate()
    saveExport(blob, 'modele_import_eleves')
  } catch (e) {
    result.value = { type: 'error', message: 'Échec du téléchargement du modèle.' }
  } finally {
    isDownloading.value = false
  }
}

const submit = async () => {
  if (!file.value || isImporting.value) return
  isImporting.value = true
  result.value = null
  try {
    const data = await familyService.importStudents(file.value)
    result.value = { type: 'success', message: data.message, summary: data.summary }
    file.value = null
    emit('imported')
  } catch (e) {
    const errors = e?.response?.data?.errors || []
    result.value = {
      type: 'error',
      message: getErrorMessage(e, 'Le fichier contient des erreurs. Aucun élève n\'a été importé.'),
      errors
    }
  } finally {
    isImporting.value = false
  }
}
</script>

<template>
  <div class="bg-white rounded-2xl border p-5">
    <h2 class="text-sm font-semibold text-default font-montserrat mb-1.5">Importer des élèves</h2>
    <p class="text-xs text-placeholder mb-4 max-w-3xl">
      Importez plusieurs élèves et leurs responsables de famille en une fois depuis un fichier Excel.
      Chaque ligne correspond à un élève ; les élèves d'une même famille partagent la même
      <span class="font-medium text-default">référence famille</span>.
      L'import crée les fiches familles, élèves et responsables, mais n'inscrit pas les élèves dans une classe.
    </p>

    <div class="rounded-xl bg-blue-50/60 border border-blue-100 p-4 mb-4">
      <div class="text-[11px] uppercase tracking-wide text-blue-700 font-montserrat mb-2">Format attendu</div>
      <ul class="text-xs text-default space-y-1 list-disc pl-4">
        <li><span class="font-medium">Élève</span> (obligatoire) : référence famille, nom, prénom, date de naissance au format <span class="font-mono">AAAA-MM-JJ</span>, genre <span class="font-mono">M</span> ou <span class="font-mono">F</span>.</li>
        <li><span class="font-medium">Responsable 1</span> (obligatoire) : nom, prénom, email, téléphone, adresse, code postal, ville.</li>
        <li><span class="font-medium">Responsable 2</span> (optionnel, peut rester vide) : mêmes colonnes — mais si l'une est remplie, toutes le deviennent.</li>
        <li>Une famille peut avoir plusieurs élèves : mettez la même référence famille sur chaque ligne, et <span class="font-medium">répétez les colonnes du Responsable 1 sur chaque ligne</span> de la famille (elles sont obligatoires partout).</li>
        <li><span class="font-medium">Élève qui est son propre responsable</span> : mettez <span class="font-mono">Oui</span> dans la dernière colonne, et remplissez le Responsable 1 avec ses propres informations. Une seule personne est alors créée, à la fois élève et responsable.</li>
        <li>Après l'import, rattachez les élèves aux classes depuis le parcours d'inscription habituel.</li>
        <li>Si une seule ligne est invalide, aucun élève n'est importé : corrigez le fichier et réessayez.</li>
      </ul>
      <button
          type="button"
          @click="downloadTemplate"
          :disabled="isDownloading"
          class="mt-3 inline-flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg border border-blue-200 text-blue-700 hover:bg-blue-50 transition-colors disabled:opacity-60"
      >
        <span>{{ isDownloading ? 'Préparation…' : 'Télécharger le modèle Excel' }}</span>
      </button>
    </div>

    <div
        @dragover.prevent="isDragging = true"
        @dragleave.prevent="isDragging = false"
        @drop.prevent="onDrop"
        @click="pickFile"
        :class="[
          'rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-colors',
          isDragging ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
        ]"
    >
      <input ref="fileInput" type="file" accept=".xlsx,.csv" class="hidden" @change="onSelect" />
      <template v-if="!file">
        <p class="text-sm text-default font-medium">Glissez-déposez votre fichier ici</p>
        <p class="text-xs text-placeholder mt-1">ou cliquez pour sélectionner un fichier .xlsx ou .csv</p>
      </template>
      <template v-else>
        <div class="flex items-center justify-center gap-2" @click.stop>
          <span class="text-sm text-default font-medium truncate max-w-xs">{{ fileLabel }}</span>
          <button type="button" @click="clearFile" class="text-xs text-red-600 hover:underline">Retirer</button>
        </div>
      </template>
    </div>

    <div class="flex justify-end mt-4">
      <button
          type="button"
          @click="submit"
          :disabled="!file || isImporting"
          class="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {{ isImporting ? 'Import en cours…' : 'Importer' }}
      </button>
    </div>

    <div v-if="result?.type === 'success'" class="mt-4 rounded-xl bg-green-50 border border-green-200 p-4">
      <p class="text-sm text-green-800 font-medium">{{ result.message }}</p>
      <div v-if="result.summary" class="text-xs text-green-700 mt-2 flex flex-wrap gap-x-5 gap-y-1">
        <span>{{ result.summary.families }} famille(s)</span>
        <span>{{ result.summary.students }} élève(s)</span>
        <span>{{ result.summary.responsibles_created }} responsable(s) créé(s)</span>
        <span v-if="result.summary.responsibles_reused">{{ result.summary.responsibles_reused }} responsable(s) existant(s) réutilisé(s)</span>
      </div>
    </div>

    <div v-else-if="result?.type === 'error'" class="mt-4 rounded-xl bg-red-50 border border-red-200 p-4">
      <p class="text-sm text-red-800 font-medium">{{ result.message }}</p>
      <p v-if="result.errors?.length" class="text-xs text-red-700 mt-1">
        {{ result.errors.length }} problème(s) à corriger. Aucun élève n'a été importé — modifiez votre fichier puis réessayez.
      </p>
      <div v-if="result.errors?.length" class="mt-3 max-h-72 overflow-y-auto">
        <table class="w-full text-xs">
          <thead>
            <tr class="text-left text-red-700">
              <th class="py-1 pr-3 font-medium whitespace-nowrap">Ligne</th>
              <th class="py-1 pr-3 font-medium whitespace-nowrap">Cellule</th>
              <th class="py-1 pr-3 font-medium whitespace-nowrap">Colonne</th>
              <th class="py-1 pr-3 font-medium whitespace-nowrap">Valeur</th>
              <th class="py-1 font-medium">Problème</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(err, i) in result.errors" :key="i" class="border-t border-red-100 align-top">
              <td class="py-1 pr-3 text-red-700 whitespace-nowrap">{{ err.row || '—' }}</td>
              <td class="py-1 pr-3 text-red-700 font-mono whitespace-nowrap">{{ err.cell || '—' }}</td>
              <td class="py-1 pr-3 text-red-700 whitespace-nowrap">{{ err.colonne || '—' }}</td>
              <td class="py-1 pr-3 whitespace-nowrap" :class="err.valeur ? 'text-red-800 font-mono' : 'text-red-400 italic'">
                {{ err.valeur ? err.valeur : (err.valeur === '' ? '(vide)' : '—') }}
              </td>
              <td class="py-1 text-red-800">{{ err.message }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
