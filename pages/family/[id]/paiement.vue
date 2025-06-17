<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import paiementService from '~/services/paiement'
import Plus from '~/components/Icons/Plus.vue'
import Trash from '~/components/Icons/Trash.vue'
import EditIcon from '~/components/Icons/Edit.vue'

definePageMeta({
  layout: 'auth',
  layoutData: {
    title: 'Famille - Paiement'
  }
})

const route = useRoute()
const { setFlashMessage } = useFlashMessage()

const isLoading = ref(true)
const detailsPaiement = ref(null)
const lignesPaiement = ref([])
const tarifDetails = ref(null)

const editingLineId = ref(null)
const editForm = ref({})
const showNewForm = ref(false)
const newForm = ref({
  type: '',
  montant: '',
  nombreCheques: 1,
  cheques: [],
  cheque: {
    banque: '',
    numero: '',
    nom_emetteur: ''
  },
  justification: '',
  memeNom: false,
  memeBanque: false,
  nomCommun: '',
  banqueCommune: ''
})

const montantTotal = computed(() => detailsPaiement.value?.montant_total || 0)
const montantPaye = computed(() => detailsPaiement.value?.montant_paye || 0)
const resteAPayer = computed(() => detailsPaiement.value?.reste_a_payer || 0)

const isValidNewForm = computed(() => {
  if (!newForm.value.type) return false

  if (newForm.value.type === 'cheque') {
    return newForm.value.cheques.every(cheque =>
        (cheque.banque || newForm.value.memeBanque) &&
        cheque.numero &&
        (cheque.nom_emetteur || newForm.value.memeNom) &&
        cheque.montant > 0
    )
  }

  return newForm.value.montant > 0
})

const typesLabels = {
  espece: 'Espèces',
  carte: 'Carte bancaire',
  cheque: 'Chèque',
  exoneration: 'Exonération'
}

onMounted(async () => {
  await loadData()
})

const loadData = async () => {
  try {
    isLoading.value = true
    const response = await paiementService.getDetailsPaiement(route.params.id)

    if (response.status === 'success') {
      detailsPaiement.value = response.data
      tarifDetails.value = response.data.tarifs
      lignesPaiement.value = response.data.paiement?.lignes || []
    }
  } catch (error) {
    console.error('Erreur:', error)
    setFlashMessage({
      type: 'error',
      message: 'Erreur lors du chargement des données'
    })
  } finally {
    isLoading.value = false
  }
}

const startEdit = (ligne) => {
  editingLineId.value = ligne.id
  editForm.value = {
    montant: ligne.montant,
    cheque: ligne.type_paiement === 'cheque' ? {...ligne.details} : {
      banque: '',
      numero: '',
      nom_emetteur: ''
    },
    justification: ligne.type_paiement === 'exoneration' ? ligne.details?.justification : ''
  }
}

const cancelEdit = () => {
  editingLineId.value = null
  editForm.value = {}
}

const saveEdit = async (ligne) => {
  try {
    const response = await paiementService.modifierLigne(
        route.params.id,
        ligne.id,
        editForm.value
    )

    if (response.status === 'success') {
      setFlashMessage({
        type: 'success',
        message: 'Paiement modifié avec succès'
      })
      await loadData()
      cancelEdit()
    }
  } catch (error) {
    setFlashMessage({
      type: 'error',
      message: error.response?.data?.message || 'Erreur lors de la modification'
    })
  }
}

const deleteLigne = async (ligne) => {
  if (!confirm('Voulez-vous vraiment supprimer ce paiement ?')) return

  try {
    const response = await paiementService.supprimerLigne(
        route.params.id,
        ligne.id
    )

    if (response.status === 'success') {
      setFlashMessage({
        type: 'success',
        message: 'Paiement supprimé avec succès'
      })
      await loadData()
    }
  } catch (error) {
    setFlashMessage({
      type: 'error',
      message: 'Erreur lors de la suppression'
    })
  }
}

const initializeCheques = () => {
  const nombre = newForm.value.nombreCheques || 1
  newForm.value.cheques = Array.from({ length: nombre }, (_, i) => ({
    banque: newForm.value.cheques[i]?.banque || '',
    numero: newForm.value.cheques[i]?.numero || '',
    nom_emetteur: newForm.value.cheques[i]?.nom_emetteur || '',
    montant: newForm.value.cheques[i]?.montant || 0
  }))
}

const updateMontantTotal = () => {
  if (newForm.value.type === 'cheque') {
    newForm.value.montant = newForm.value.cheques.reduce((sum, cheque) => sum + (cheque.montant || 0), 0)
  }
}

const addNewLigne = async () => {
  if (!isValidNewForm.value) return

  try {
    if (newForm.value.type === 'cheque') {
      const cheques = newForm.value.cheques.map(cheque => ({
        banque: newForm.value.memeBanque ? newForm.value.banqueCommune : cheque.banque,
        numero: cheque.numero,
        nom_emetteur: newForm.value.memeNom ? newForm.value.nomCommun : cheque.nom_emetteur,
        montant: cheque.montant
      }))

      for (const cheque of cheques) {
        const data = {
          type: 'cheque',
          montant: cheque.montant,
          cheque: {
            banque: cheque.banque,
            numero: cheque.numero,
            nom_emetteur: cheque.nom_emetteur
          }
        }

        await paiementService.ajouterLigne(route.params.id, data)
      }

      setFlashMessage({
        type: 'success',
        message: `${cheques.length} chèque(s) ajouté(s) avec succès`
      })
    } else {
      const data = {
        type: newForm.value.type,
        montant: parseFloat(newForm.value.montant)
      }

      if (newForm.value.type === 'exoneration') {
        data.justification = newForm.value.justification
      }

      await paiementService.ajouterLigne(route.params.id, data)

      setFlashMessage({
        type: 'success',
        message: 'Paiement ajouté avec succès'
      })
    }

    await loadData()
    resetNewForm()
  } catch (error) {
    setFlashMessage({
      type: 'error',
      message: error.response?.data?.message || 'Erreur lors de l\'ajout'
    })
  }
}

const resetNewForm = () => {
  showNewForm.value = false
  newForm.value = {
    type: '',
    montant: '',
    nombreCheques: 1,
    cheques: [],
    cheque: {
      banque: '',
      numero: '',
      nom_emetteur: ''
    },
    justification: '',
    memeNom: false,
    memeBanque: false,
    nomCommun: '',
    banqueCommune: ''
  }
}
</script>

<template>
  <div v-if="isLoading" class="flex justify-center items-center h-64">
    <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-default"></div>
  </div>

  <div v-else class="grid grid-cols-3 mt-6 px-6 font-montserrat w-full gap-x-4">
    <section class="col-span-2 bg-white rounded-lg p-6">
      <h2 class="font-bold text-2xl mb-6">Mode de paiement</h2>

      <div class="space-y-3">
        <div
            v-for="ligne in lignesPaiement"
            :key="ligne.id"
            class="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
        >
          <div v-if="editingLineId !== ligne.id" class="flex items-center justify-between">
            <div class="flex-1">
              <div class="flex items-center gap-4">
                <span class="font-medium text-lg">{{ typesLabels[ligne.type_paiement] }}</span>
                <span class="text-xl font-semibold">{{ Math.round(ligne.montant) }}€</span>
              </div>

              <div v-if="ligne.type_paiement === 'cheque' && ligne.details" class="mt-2 text-sm text-gray-600">
                <span>{{ ligne.details.banque }} - N°{{ ligne.details.numero }}</span>
                <span class="ml-2">({{ ligne.details.nom_emetteur }})</span>
              </div>

              <div v-else-if="ligne.type_paiement === 'exoneration' && ligne.details?.justification" class="mt-2 text-sm text-gray-600">
                Justification : {{ ligne.details.justification }}
              </div>
            </div>

            <div class="flex items-center gap-2">
              <button
                  @click="startEdit(ligne)"
                  class="p-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <EditIcon class="w-5 h-5" />
              </button>
              <button
                  @click="deleteLigne(ligne)"
                  class="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash class="w-5 h-5" />
              </button>
            </div>
          </div>

          <div v-else class="space-y-4">
            <div class="flex items-center gap-4">
              <span class="font-medium">{{ typesLabels[ligne.type_paiement] }}</span>
              <input
                  v-model.number="editForm.montant"
                  type="number"
                  step="1"
                  min="0"
                  placeholder="Montant"
                  class="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-black"
              />
              <div class="flex gap-2">
                <button
                    @click="cancelEdit"
                    class="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  <X class="w-5 h-5" />
                </button>
                <button
                    @click="saveEdit(ligne)"
                    class="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                >
                  <Check class="w-5 h-5" />
                </button>
              </div>
            </div>

            <div v-if="ligne.type_paiement === 'cheque'" class="grid grid-cols-3 gap-3">
              <input
                  v-model="editForm.cheque.banque"
                  placeholder="Banque"
                  class="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-black"
              />
              <input
                  v-model="editForm.cheque.numero"
                  placeholder="Numéro"
                  class="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-black"
              />
              <input
                  v-model="editForm.cheque.nom_emetteur"
                  placeholder="Nom émetteur"
                  class="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>

            <div v-else-if="ligne.type_paiement === 'exoneration'">
              <textarea
                  v-model="editForm.justification"
                  placeholder="Justification"
                  rows="2"
                  class="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-black"
              ></textarea>
            </div>

            <div class="flex justify-end gap-2">
              <button
                  @click="cancelEdit"
                  class="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <X class="w-5 h-5" />
              </button>
              <button
                  @click="saveEdit(ligne)"
                  class="p-2 text-green-600 hover:bg-green-50 rounded-lg"
              >
                <Check class="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        <div v-if="!showNewForm">
          <button
              @click="showNewForm = true"
              class="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:text-gray-700 transition-colors flex items-center justify-center gap-2"
          >
            <Plus class="w-5 h-5" />
            <span>Ajouter un moyen de paiement</span>
          </button>
        </div>

        <div v-else class="border-2 border-gray-300 rounded-lg p-4 bg-gray-50">
          <div class="space-y-4">
            <select
                v-model="newForm.type"
                class="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-black"
            >
              <option value="">Sélectionner un type</option>
              <option value="espece">Espèces</option>
              <option value="carte">Carte bancaire</option>
              <option value="cheque">Chèques</option>
              <option value="exoneration">Exonération</option>
            </select>

            <div v-if="newForm.type === 'cheque'">
              <div class="flex items-center gap-4 mb-4">
                <label class="text-sm font-medium">Nombre de chèques :</label>
                <select v-model.number="newForm.nombreCheques" @change="initializeCheques" class="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-black">
                  <option v-for="n in 7" :key="n" :value="n">{{ n }}</option>
                </select>
              </div>

              <div class="space-y-2 mb-4">
                <label class="flex items-center gap-2">
                  <input type="checkbox" v-model="newForm.memeNom" class="rounded">
                  <span class="text-sm">Même nom sur tous les chèques</span>
                </label>
                <label class="flex items-center gap-2">
                  <input type="checkbox" v-model="newForm.memeBanque" class="rounded">
                  <span class="text-sm">Même banque pour tous les chèques</span>
                </label>
              </div>

              <div v-if="newForm.memeNom || newForm.memeBanque" class="grid grid-cols-2 gap-3 mb-4">
                <input
                    v-if="newForm.memeBanque"
                    v-model="newForm.banqueCommune"
                    placeholder="Banque"
                    class="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-black"
                />
                <input
                    v-if="newForm.memeNom"
                    v-model="newForm.nomCommun"
                    placeholder="Nom émetteur"
                    class="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              <div class="space-y-3 max-h-60 overflow-y-auto">
                <div v-for="(cheque, index) in newForm.cheques" :key="index" class="border rounded-lg p-3 bg-white">
                  <h4 class="font-medium mb-2">Chèque {{ index + 1 }}</h4>
                  <div class="grid grid-cols-3 gap-2">
                    <input
                        v-if="!newForm.memeBanque"
                        v-model="cheque.banque"
                        placeholder="Banque"
                        class="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-black"
                    />
                    <input
                        v-model="cheque.numero"
                        placeholder="Numéro"
                        class="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-black"
                    />
                    <input
                        v-if="!newForm.memeNom"
                        v-model="cheque.nom_emetteur"
                        placeholder="Nom émetteur"
                        class="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-black"
                    />
                    <input
                        v-model.number="cheque.montant"
                        type="number"
                        step="1"
                        min="0"
                        placeholder="Montant"
                        @input="updateMontantTotal"
                        class="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-black"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div v-else-if="newForm.type === 'espece' || newForm.type === 'carte'">
              <input
                  v-model.number="newForm.montant"
                  type="number"
                  step="1"
                  min="0"
                  placeholder="200"
                  class="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>

            <div v-else-if="newForm.type === 'exoneration'">
              <input
                  v-model.number="newForm.montant"
                  type="number"
                  step="1"
                  min="0"
                  placeholder="100"
                  class="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-black mb-2"
              />
              <textarea
                  v-model="newForm.justification"
                  placeholder="Justification"
                  rows="2"
                  class="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-black"
              ></textarea>
            </div>

            <div class="flex justify-end gap-2">
              <button
                  @click="resetNewForm"
                  class="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Annuler
              </button>
              <button
                  @click="addNewLigne"
                  :disabled="!isValidNewForm"
                  class="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Ajouter
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="col-span-1 bg-white rounded-lg p-6">
      <h2 class="font-bold text-2xl mb-6">Paiement</h2>

      <div v-if="tarifDetails">
        <div v-for="eleve in tarifDetails.details_par_eleve" :key="eleve.student_id" class="mb-4">
          <h3 class="font-semibold">{{ eleve.student_name }}</h3>
          <div v-for="cursus in eleve.cursus" :key="cursus.cursus_id" class="flex items-center justify-between font-nunito px-4 font-light">
            <div>{{ cursus.cursus_name }}</div>
            <div>x1</div>
            <div>{{ Math.round(cursus.tarif_final) }}€</div>
          </div>
        </div>
      </div>

      <div class="my-3 border border-gray-200 mx-4"></div>

      <div class="grid grid-cols-4 auto-cols-fr auto-rows-fr w-full font-nunito px-4 font-light">
        <div class="font-semibold">Total</div>
        <div class="inline-flex items-center justify-center"></div>
        <div class="inline-flex items-center justify-center"></div>
        <div class="inline-flex items-center justify-end">{{ Math.round(montantTotal) }}€</div>
      </div>

      <div class="my-3 border border-gray-200 mx-4"></div>

      <div class="bg-gray-50 border mx-1 p-3 rounded-lg font-nunito">
        <div class="flex items-center justify-between">
          <div class="font-semibold">Payé</div>
          <div>{{ Math.round(montantPaye) }}€</div>
        </div>

        <div v-if="detailsPaiement?.details" class="pl-6 flex flex-col gap-y-1 mt-3">
          <div v-if="detailsPaiement.details.espece > 0" class="grid grid-cols-3 w-full">
            <div class="font-semibold">Espèces</div>
            <div class="inline-flex items-center justify-center"></div>
            <div class="inline-flex items-center justify-end">{{ Math.round(detailsPaiement.details.espece) }}€</div>
          </div>

          <div v-if="detailsPaiement.details.carte > 0" class="grid grid-cols-3 w-full">
            <div class="font-semibold">CB</div>
            <div class="inline-flex items-center justify-center"></div>
            <div class="inline-flex items-center justify-end">{{ Math.round(detailsPaiement.details.carte) }}€</div>
          </div>

          <div v-if="detailsPaiement.details.cheque > 0" class="grid grid-cols-3 w-full">
            <div class="font-semibold">Chèques</div>
            <div class="inline-flex items-center justify-center">x{{ detailsPaiement.details.cheques.length }}</div>
            <div class="inline-flex items-center justify-end">{{ Math.round(detailsPaiement.details.cheque) }}€</div>
          </div>

          <div v-if="detailsPaiement.details.exoneration > 0" class="grid grid-cols-3 w-full">
            <div class="font-semibold">Exonération</div>
            <div class="inline-flex items-center justify-center"></div>
            <div class="inline-flex items-center justify-end">{{ Math.round(detailsPaiement.details.exoneration) }}€</div>
          </div>
        </div>
      </div>

      <div class="my-3 border border-gray-200 mx-4"></div>

      <div class="flex items-center justify-between text-xl mx-4">
        <div class="font-bold">Reste à payer</div>
        <div :class="{ 'text-green-600': resteAPayer === 0, 'text-red-600': resteAPayer < 0 }">
          {{ Math.round(resteAPayer) }}€
        </div>
      </div>
    </section>
  </div>
</template>