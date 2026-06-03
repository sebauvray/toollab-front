<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import paiementService from '~/services/paiement'
import Plus from '~/components/Icons/Plus.vue'
import Trash from '~/components/Icons/Trash.vue'
import EditIcon from '~/components/Icons/Edit.vue'
import BreadCrumb from "~/components/navigation/BreadCrumb.vue";
import { usePageTitle } from "~/composables/usePageTitle.js";
import { useSchoolYear } from "~/composables/useSchoolYear";

const { isReadOnly } = useSchoolYear();

definePageMeta({
    layout: 'auth',
    layoutData: {
        title: 'Famille - Paiement'
    }
})
usePageTitle('Famille')

const route = useRoute()
const {setFlashMessage} = useFlashMessage()
const breadcrumbItems = computed(() => [
    {name: 'Familles', path: '/family'},
    {name: tarifDetails.value.nom_famille || 'Chargement...', path: `/family/${tarifDetails.value.id_famille}`},
    {name: 'Classes', path: `/family/${tarifDetails.value.id_famille}/classes`},
    {name: 'Paiement', path: null},
]);
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

const banquesFrancaises = [
    'BNP Paribas',
    'Crédit Agricole',
    'Société Générale',
    'LCL',
    'Crédit Mutuel',
    'Banque Populaire',
    'Caisse d\'Épargne',
    'La Banque Postale',
    'CIC',
    'Crédit du Nord',
    'HSBC France',
    'Banque Transatlantique',
    'Crédit Coopératif',
    'Banque Palatine',
    'Bred',
    'Crédit Maritime',
    'Banque Rhône-Alpes',
    'Banque de Savoie',
    'Banque Laydernier',
    'Banque de l\'Economie du Commerce et de la Monétique',
    'Banque Tarneaud',
    'Banque Nuger',
    'Banque Kolb',
    'Banque Courtois',
    'Banque Martin Maurel',
    'Banque Dupuy de Parseval',
    'Banque Chaix',
    'Banque de Vizille',
    'Banque Delubac',
    'Banque Hottinguer',
    'Rothschild & Co',
    'Banque Richelieu',
    'Banque Wormser Frères',
    'Banque Scalbert Dupont',
    'Autre'
]

const showBanqueSuggestions = ref(false)
const banqueSearchTerm = ref('')
const selectedBanqueIndex = ref(-1)
const banqueInputRef = ref(null)

const showEditBanqueSuggestions = ref(false)
const editBanqueSearchTerm = ref('')
const selectedEditBanqueIndex = ref(-1)
const editBanqueInputRef = ref(null)

const filteredBanques = computed(() => {
    if (!banqueSearchTerm.value) return banquesFrancaises
    return banquesFrancaises.filter(banque =>
        banque.toLowerCase().includes(banqueSearchTerm.value.toLowerCase())
    )
})

const filteredEditBanques = computed(() => {
    if (!editBanqueSearchTerm.value) return banquesFrancaises
    return banquesFrancaises.filter(banque =>
        banque.toLowerCase().includes(editBanqueSearchTerm.value.toLowerCase())
    )
})

const montantTotal = computed(() => detailsPaiement.value?.montant_total || 0)
const montantPaye = computed(() => detailsPaiement.value?.montant_paye || 0)
const resteAPayer = computed(() => detailsPaiement.value?.reste_a_payer || 0)

const isValidNewForm = computed(() => {
    if (!newForm.value.type) return false

    if (newForm.value.type === 'cheque') {
        return newForm.value.cheques.every(cheque => {
            const banque = newForm.value.memeBanque ? newForm.value.banqueCommune : cheque.banque
            const nomEmetteur = newForm.value.memeNom ? newForm.value.nomCommun : cheque.nom_emetteur

            // Vérifier que la banque est valide
            const isBanqueValid = banque && (banquesFrancaises.includes(banque) || banque === 'Autre')

            return isBanqueValid &&
                cheque.numero &&
                nomEmetteur &&
                cheque.montant && cheque.montant > 0
        })
    }

    return newForm.value.montant && newForm.value.montant > 0
})

const typesLabels = {
    espece: 'Espèces',
    carte: 'Carte bancaire',
    cheque: 'Chèque',
    exoneration: 'Exonération'
}

const typesIcons = {
    espece: '💵',
    carte: '💳',
    cheque: '🧾',
    exoneration: '✋'
}


const forceInteger = (value) => {
    if (value === '' || value === null || value === undefined) return ''
    const num = parseInt(value)
    return isNaN(num) ? '' : Math.abs(num)
}

const onBanqueInput = (value, chequeIndex = null) => {
    if (chequeIndex !== null) {
        newForm.value.cheques[chequeIndex].banque = value
    } else {
        newForm.value.banqueCommune = value
    }

    banqueSearchTerm.value = value
    showBanqueSuggestions.value = true
    selectedBanqueIndex.value = -1
}

const onBanqueBlur = (value, chequeIndex = null) => {
    // Ne pas valider si l'utilisateur clique sur une suggestion
    setTimeout(() => {
        if (!showBanqueSuggestions.value) {
            const exactMatch = banquesFrancaises.find(banque => banque.toLowerCase() === value.toLowerCase())
            if (!exactMatch && value !== '' && value !== 'Autre') {
                // Permettre "Autre" comme valeur valide
                if (chequeIndex !== null) {
                    newForm.value.cheques[chequeIndex].banque = ''
                } else {
                    newForm.value.banqueCommune = ''
                }
                banqueSearchTerm.value = ''
            }
        }
        showBanqueSuggestions.value = false
    }, 150)
}

const selectBanque = (banque, chequeIndex = null) => {
    if (chequeIndex !== null) {
        newForm.value.cheques[chequeIndex].banque = banque
    } else {
        newForm.value.banqueCommune = banque
    }

    banqueSearchTerm.value = banque
    showBanqueSuggestions.value = false
    selectedBanqueIndex.value = -1

    // Empêcher le blur de s'exécuter après la sélection
    setTimeout(() => {
        showBanqueSuggestions.value = false
    }, 10)
}

const onEditBanqueInput = (value) => {
    editForm.value.cheque.banque = value
    editBanqueSearchTerm.value = value
    showEditBanqueSuggestions.value = true
    selectedEditBanqueIndex.value = -1
}

const onEditBanqueBlur = (value) => {
    setTimeout(() => {
        if (!showEditBanqueSuggestions.value) {
            const exactMatch = banquesFrancaises.find(banque => banque.toLowerCase() === value.toLowerCase())
            if (!exactMatch && value !== '' && value !== 'Autre') {
                editForm.value.cheque.banque = ''
                editBanqueSearchTerm.value = ''
            }
        }
        showEditBanqueSuggestions.value = false
    }, 150)
}

const selectEditBanque = (banque) => {
    editForm.value.cheque.banque = banque
    editBanqueSearchTerm.value = banque
    showEditBanqueSuggestions.value = false
    selectedEditBanqueIndex.value = -1

    // Empêcher le blur de s'exécuter après la sélection
    setTimeout(() => {
        showEditBanqueSuggestions.value = false
    }, 10)
}

const handleBanqueKeydown = (event) => {
    if (!showBanqueSuggestions.value) return

    switch (event.key) {
        case 'ArrowDown':
            event.preventDefault()
            selectedBanqueIndex.value = Math.min(selectedBanqueIndex.value + 1, filteredBanques.value.length - 1)
            break
        case 'ArrowUp':
            event.preventDefault()
            selectedBanqueIndex.value = Math.max(selectedBanqueIndex.value - 1, -1)
            break
        case 'Enter':
            event.preventDefault()
            if (selectedBanqueIndex.value >= 0) {
                selectBanque(filteredBanques.value[selectedBanqueIndex.value])
            }
            break
        case 'Escape':
            showBanqueSuggestions.value = false
            selectedBanqueIndex.value = -1
            break
    }
}

const handleEditBanqueKeydown = (event) => {
    if (!showEditBanqueSuggestions.value) return

    switch (event.key) {
        case 'ArrowDown':
            event.preventDefault()
            selectedEditBanqueIndex.value = Math.min(selectedEditBanqueIndex.value + 1, filteredEditBanques.value.length - 1)
            break
        case 'ArrowUp':
            event.preventDefault()
            selectedEditBanqueIndex.value = Math.max(selectedEditBanqueIndex.value - 1, -1)
            break
        case 'Enter':
            event.preventDefault()
            if (selectedEditBanqueIndex.value >= 0) {
                selectEditBanque(filteredEditBanques.value[selectedEditBanqueIndex.value])
            }
            break
        case 'Escape':
            showEditBanqueSuggestions.value = false
            selectedEditBanqueIndex.value = -1
            break
    }
}

onMounted(async () => {
    await loadData()

    // Gestionnaire de clic global pour fermer les suggestions
    document.addEventListener('click', (event) => {
        const target = event.target
        const isAutocomplete = target.closest('.banque-autocomplete')
        const isSuggestion = target.closest('.banque-suggestion')

        if (!isAutocomplete && !isSuggestion) {
            showBanqueSuggestions.value = false
            showEditBanqueSuggestions.value = false
        }
    })
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
        montant: forceInteger(ligne.montant),
        cheque: ligne.type_paiement === 'cheque' ? {...ligne.details} : {
            banque: '',
            numero: '',
            nom_emetteur: ''
        },
        justification: ligne.type_paiement === 'exoneration' ? ligne.details?.justification : ''
    }

    if (ligne.type_paiement === 'cheque' && ligne.details?.banque) {
        editBanqueSearchTerm.value = ligne.details.banque
    }
}

const cancelEdit = () => {
    editingLineId.value = null
    editForm.value = {}
    showEditBanqueSuggestions.value = false
    editBanqueSearchTerm.value = ''
}

const saveEdit = async (ligne) => {
    try {
        editForm.value.montant = forceInteger(editForm.value.montant)

        // Vérification supplémentaire pour les chèques
        if (ligne.type_paiement === 'cheque') {
            const banque = editForm.value.cheque.banque
            if (banque && !banquesFrancaises.includes(banque) && banque !== 'Autre') {
                setFlashMessage({
                    type: 'error',
                    message: 'Veuillez sélectionner une banque valide dans la liste'
                })
                return
            }
        }

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

const showDeleteModal = ref(false)
const ligneToDelete = ref(null)

const openDeleteModal = (ligne) => {
    ligneToDelete.value = ligne
    showDeleteModal.value = true
}

const closeDeleteModal = () => {
    showDeleteModal.value = false
    ligneToDelete.value = null
}

const confirmDelete = async () => {
    if (!ligneToDelete.value) return

    try {
        const response = await paiementService.supprimerLigne(
            route.params.id,
            ligneToDelete.value.id
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
    } finally {
        closeDeleteModal()
    }
}

const initializeCheques = () => {
    const nombre = newForm.value.nombreCheques || 1
    newForm.value.cheques = Array.from({length: nombre}, (_, i) => ({
        banque: newForm.value.cheques[i]?.banque || '',
        numero: newForm.value.cheques[i]?.numero || '',
        nom_emetteur: newForm.value.cheques[i]?.nom_emetteur || '',
        montant: newForm.value.cheques[i]?.montant || ''
    }))
}

const onTypeChange = () => {
    if (newForm.value.type === 'cheque') {
        initializeCheques()
    }
}

const selectType = (type) => {
    newForm.value.type = type
    onTypeChange()
}

const updateMontantTotal = () => {
    if (newForm.value.type === 'cheque') {
        newForm.value.montant = newForm.value.cheques.reduce((sum, cheque) => {
            const montant = cheque.montant ? parseInt(cheque.montant) : 0
            return sum + (isNaN(montant) ? 0 : Math.abs(montant))
        }, 0)
    }
}

const addNewLigne = async () => {
    if (!isValidNewForm.value) return

    try {
        if (newForm.value.type === 'cheque') {
            // Vérification supplémentaire avant envoi
            const isAllBanquesValid = newForm.value.cheques.every(cheque => {
                const banque = newForm.value.memeBanque ? newForm.value.banqueCommune : cheque.banque
                return banque && (banquesFrancaises.includes(banque) || banque === 'Autre')
            })

            if (!isAllBanquesValid) {
                setFlashMessage({
                    type: 'error',
                    message: 'Veuillez sélectionner des banques valides dans la liste'
                })
                return
            }

            const cheques = newForm.value.cheques.map(cheque => ({
                banque: newForm.value.memeBanque ? newForm.value.banqueCommune : cheque.banque,
                numero: cheque.numero,
                nom_emetteur: newForm.value.memeNom ? newForm.value.nomCommun : cheque.nom_emetteur,
                montant: forceInteger(cheque.montant)
            }))

            for (const cheque of cheques) {
                const data = {
                    type: 'cheque',
                    montant: cheque.montant || 0,
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
                montant: newForm.value.montant || 0
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

    showBanqueSuggestions.value = false
    banqueSearchTerm.value = ''
    selectedBanqueIndex.value = -1
}
</script>

<template>
    <div v-if="isLoading" class="flex justify-center items-center h-64">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-default"></div>
    </div>

    <div v-else class="grid grid-cols-1 lg:grid-cols-3 mt-5 px-5 font-montserrat w-full gap-3 items-start">
        <BreadCrumb :custom-items="breadcrumbItems" />

        <section class="lg:col-span-2 bg-white rounded-lg p-3 shadow-sm order-2 lg:order-1">
            <h2 class="font-bold text-base mb-3 text-gray-800">Mode de paiement</h2>

            <div class="space-y-2">
                <div
                    v-for="ligne in lignesPaiement"
                    :key="ligne.id"
                    class="border rounded-lg p-2 transition-colors bg-gray-50 border-gray-200 hover:shadow-sm"
                >
                    <div v-if="editingLineId !== ligne.id" class="flex items-center justify-between">
                        <div class="flex-1">
                            <div class="flex items-center gap-2">
                                <span class="text-lg">{{ typesIcons[ligne.type_paiement] }}</span>
                                <span class="font-medium text-xs text-gray-800">
                  {{ typesLabels[ligne.type_paiement] }}
                </span>
                                <span class="text-sm font-semibold text-gray-900">{{ ligne.montant || 0 }}€</span>
                            </div>

                            <div v-if="ligne.type_paiement === 'cheque' && ligne.details" class="mt-1.5 text-xs text-gray-600 ml-6">
                                <span>{{ ligne.details.banque }} - N°{{ ligne.details.numero }}</span>
                                <span class="ml-1.5">({{ ligne.details.nom_emetteur }})</span>
                            </div>

                            <div v-else-if="ligne.type_paiement === 'exoneration' && ligne.details?.justification" class="mt-1.5 text-xs text-gray-600 ml-6">
                                Justification : {{ ligne.details.justification }}
                            </div>
                        </div>

                        <div class="flex items-center gap-1.5" v-if="!isReadOnly">
                            <button
                                @click="startEdit(ligne)"
                                class="p-1.5 text-gray-700 hover:bg-white hover:shadow-sm rounded-lg transition-colors"
                            >
                                <EditIcon class="w-4 h-4" />
                            </button>
                            <button
                                @click="openDeleteModal(ligne)"
                                class="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                                <Trash class="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    <div v-else class="space-y-2">
                        <div class="flex items-center gap-2">
                            <span class="text-lg">{{ typesIcons[ligne.type_paiement] }}</span>
                            <span class="font-medium text-xs text-gray-800">
                {{ typesLabels[ligne.type_paiement] }}
              </span>
                            <input
                                v-model="editForm.montant"
                                type="text"
                                placeholder="Montant"
                                @input="editForm.montant = forceInteger(editForm.montant)"
                                class="px-1.5 py-1 border rounded-md focus:outline-none focus:ring-2 focus:ring-black text-xs"
                            />
                        </div>

                        <div v-if="ligne.type_paiement === 'cheque'" class="banque-autocomplete relative ml-6">
                            <div class="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                                <div class="relative">
                                    <input
                                        ref="editBanqueInputRef"
                                        :value="editBanqueSearchTerm"
                                        @input="onEditBanqueInput($event.target.value)"
                                        @blur="onEditBanqueBlur($event.target.value)"
                                        @keydown="handleEditBanqueKeydown"
                                        @focus="showEditBanqueSuggestions = true"
                                        placeholder="Banque"
                                        class="w-full px-1.5 py-1 border rounded-md focus:outline-none focus:ring-2 focus:ring-black text-xs"
                                        autocomplete="off"
                                    />
                                    <div v-if="showEditBanqueSuggestions && filteredEditBanques.length > 0"
                                         class="banque-suggestion absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                                        <div v-for="(banque, index) in filteredEditBanques"
                                             :key="banque"
                                             @mousedown="selectEditBanque(banque)"
                                             :class="[
                           'px-2 py-1.5 cursor-pointer text-xs',
                           index === selectedEditBanqueIndex ? 'bg-blue-100' : 'hover:bg-gray-100'
                         ]">
                                            {{ banque }}
                                        </div>
                                    </div>
                                </div>
                                <input
                                    v-model="editForm.cheque.numero"
                                    placeholder="Numéro"
                                    class="px-1.5 py-1 border rounded-md focus:outline-none focus:ring-2 focus:ring-black text-xs"
                                />
                                <input
                                    v-model="editForm.cheque.nom_emetteur"
                                    placeholder="Nom émetteur"
                                    class="px-1.5 py-1 border rounded-md focus:outline-none focus:ring-2 focus:ring-black text-xs"
                                />
                            </div>
                        </div>

                        <div v-else-if="ligne.type_paiement === 'exoneration'" class="ml-6">
              <textarea
                  v-model="editForm.justification"
                  placeholder="Justification"
                  rows="2"
                  class="w-full px-1.5 py-1 border rounded-md focus:outline-none focus:ring-2 focus:ring-black text-xs"
              ></textarea>
                        </div>

                        <div class="flex flex-col sm:flex-row justify-end gap-1.5">
                            <button
                                @click="cancelEdit"
                                class="px-2 py-1 text-gray-600 hover:bg-gray-100 rounded-lg text-xs"
                            >
                                Annuler
                            </button>
                            <button
                                @click="saveEdit(ligne)"
                                class="px-2 py-1 bg-black text-white rounded-lg hover:bg-gray-800 text-xs"
                            >
                                Valider
                            </button>
                        </div>
                    </div>
                </div>

                <div v-if="!showNewForm && !isReadOnly">
                    <button
                        @click="showNewForm = true"
                        class="w-full p-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:text-gray-700 transition-colors flex items-center justify-center gap-1.5 text-xs"
                    >
                        <Plus class="w-4 h-4" />
                        <span>Ajouter un moyen de paiement</span>
                    </button>
                </div>

                <div v-else-if="showNewForm && !isReadOnly" class="border-2 border-gray-300 rounded-lg p-2 bg-gray-50">
                    <div class="space-y-3">
                        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            <button
                                @click="selectType('espece')"
                                :class="[
                    'flex flex-col items-center p-2 rounded-lg border-2 transition-all duration-200',
                    newForm.type === 'espece'
                      ? 'border-black bg-gray-100 text-black shadow-md'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400 hover:shadow-sm'
                  ]"
                            >
                                <div class="text-xl mb-1">💵</div>
                                <span class="text-xs font-medium">Espèces</span>
                            </button>

                            <button
                                @click="selectType('carte')"
                                :class="[
                    'flex flex-col items-center p-2 rounded-lg border-2 transition-all duration-200',
                    newForm.type === 'carte'
                      ? 'border-black bg-gray-100 text-black shadow-md'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400 hover:shadow-sm'
                  ]"
                            >
                                <div class="text-xl mb-1">💳</div>
                                <span class="text-xs font-medium">Carte</span>
                            </button>

                            <button
                                @click="selectType('cheque')"
                                :class="[
                    'flex flex-col items-center p-2 rounded-lg border-2 transition-all duration-200',
                    newForm.type === 'cheque'
                      ? 'border-black bg-gray-100 text-black shadow-md'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400 hover:shadow-sm'
                  ]"
                            >
                                <div class="text-xl mb-1">🧾</div>
                                <span class="text-xs font-medium">Chèques</span>
                            </button>

                            <button
                                @click="selectType('exoneration')"
                                :class="[
                    'flex flex-col items-center p-2 rounded-lg border-2 transition-all duration-200',
                    newForm.type === 'exoneration'
                      ? 'border-black bg-gray-100 text-black shadow-md'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400 hover:shadow-sm'
                  ]"
                            >
                                <div class="text-xl mb-1">✋</div>
                                <span class="text-xs font-medium">Exonération</span>
                            </button>
                        </div>

                        <div v-if="newForm.type === 'cheque'">
                            <div class="flex items-center gap-3 mb-3">
                                <label class="text-xs font-medium">Nombre de chèques :</label>
                                <select v-model.number="newForm.nombreCheques" @change="initializeCheques" class="px-1.5 py-1 border rounded-md focus:outline-none focus:ring-2 focus:ring-black text-xs">
                                    <option v-for="n in 7" :key="n" :value="n">{{ n }}</option>
                                </select>
                            </div>

                            <div class="space-y-1.5 mb-3">
                                <label class="flex items-center gap-1.5">
                                    <input type="checkbox" v-model="newForm.memeNom" class="rounded border-black text-black focus:ring-black focus:ring-2">
                                    <span class="text-xs">Même nom sur tous les chèques</span>
                                </label>
                                <label class="flex items-center gap-1.5">
                                    <input type="checkbox" v-model="newForm.memeBanque" class="rounded border-black text-black focus:ring-black focus:ring-2">
                                    <span class="text-xs">Même banque pour tous les chèques</span>
                                </label>
                            </div>

                            <div v-if="newForm.memeNom || newForm.memeBanque" class="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                                <div v-if="newForm.memeBanque" class="banque-autocomplete relative">
                                    <input
                                        :value="banqueSearchTerm"
                                        @input="onBanqueInput($event.target.value)"
                                        @blur="onBanqueBlur($event.target.value)"
                                        @keydown="handleBanqueKeydown"
                                        @focus="showBanqueSuggestions = true"
                                        placeholder="Banque"
                                        class="w-full px-1.5 py-1 border rounded-md focus:outline-none focus:ring-2 focus:ring-black text-xs"
                                        autocomplete="off"
                                    />
                                    <div v-if="showBanqueSuggestions && filteredBanques.length > 0"
                                         class="banque-suggestion absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                                        <div v-for="(banque, index) in filteredBanques"
                                             :key="banque"
                                             @mousedown="selectBanque(banque)"
                                             :class="[
                           'px-2 py-1.5 cursor-pointer text-xs',
                           index === selectedBanqueIndex ? 'bg-blue-100' : 'hover:bg-gray-100'
                         ]">
                                            {{ banque }}
                                        </div>
                                    </div>
                                </div>
                                <input
                                    v-if="newForm.memeNom"
                                    v-model="newForm.nomCommun"
                                    placeholder="Nom émetteur"
                                    class="px-1.5 py-1 border rounded-md focus:outline-none focus:ring-2 focus:ring-black text-xs"
                                />
                            </div>

                            <div class="space-y-2">
                                <div v-for="(cheque, index) in newForm.cheques" :key="index" class="border rounded-lg p-2 bg-white">
                                    <h4 class="font-medium mb-1.5 text-xs">Chèque {{ index + 1 }}</h4>
                                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-1.5">
                                        <div v-if="!newForm.memeBanque" class="banque-autocomplete relative">
                                            <input
                                                :value="cheque.banque"
                                                @input="onBanqueInput($event.target.value, index)"
                                                @blur="onBanqueBlur($event.target.value, index)"
                                                @keydown="handleBanqueKeydown"
                                                @focus="showBanqueSuggestions = true"
                                                placeholder="Banque"
                                                class="w-full px-1.5 py-1 border rounded-md focus:outline-none focus:ring-2 focus:ring-black text-xs"
                                                autocomplete="off"
                                            />
                                            <div v-if="showBanqueSuggestions && filteredBanques.length > 0"
                                                 class="banque-suggestion absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                                                <div v-for="(banque, banqueIndex) in filteredBanques"
                                                     :key="banque"
                                                     @mousedown="selectBanque(banque, index)"
                                                     :class="[
                               'px-2 py-1.5 cursor-pointer text-xs',
                               banqueIndex === selectedBanqueIndex ? 'bg-blue-100' : 'hover:bg-gray-100'
                             ]">
                                                    {{ banque }}
                                                </div>
                                            </div>
                                        </div>
                                        <input
                                            v-model="cheque.numero"
                                            placeholder="Numéro"
                                            class="px-1.5 py-1 border rounded-md focus:outline-none focus:ring-2 focus:ring-black text-xs"
                                        />
                                        <input
                                            v-if="!newForm.memeNom"
                                            v-model="cheque.nom_emetteur"
                                            placeholder="Nom émetteur"
                                            class="px-1.5 py-1 border rounded-md focus:outline-none focus:ring-2 focus:ring-black text-xs"
                                        />
                                        <input
                                            v-model="cheque.montant"
                                            type="text"
                                            placeholder="Montant"
                                            @input="cheque.montant = forceInteger(cheque.montant); updateMontantTotal()"
                                            class="px-1.5 py-1 border rounded-md focus:outline-none focus:ring-2 focus:ring-black text-xs"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div v-else-if="newForm.type === 'espece' || newForm.type === 'carte'">
                            <input
                                v-model="newForm.montant"
                                type="text"
                                placeholder="Montant"
                                @input="newForm.montant = forceInteger(newForm.montant)"
                                class="w-full px-1.5 py-1 border rounded-md focus:outline-none focus:ring-2 focus:ring-black text-xs"
                            />
                        </div>

                        <div v-else-if="newForm.type === 'exoneration'">
                            <input
                                v-model="newForm.montant"
                                type="text"
                                placeholder="Montant"
                                @input="newForm.montant = forceInteger(newForm.montant)"
                                class="w-full px-1.5 py-1 border rounded-md focus:outline-none focus:ring-2 focus:ring-black text-xs mb-1.5"
                            />
                            <textarea
                                v-model="newForm.justification"
                                placeholder="Justification"
                                rows="2"
                                class="w-full px-1.5 py-1 border rounded-md focus:outline-none focus:ring-2 focus:ring-black text-xs"
                            ></textarea>
                        </div>

                        <div class="flex flex-col sm:flex-row justify-end gap-1.5">
                            <button
                                @click="resetNewForm"
                                class="px-2 py-1 text-gray-600 hover:bg-gray-100 rounded-lg text-xs"
                            >
                                Annuler
                            </button>
                            <button
                                @click="addNewLigne"
                                :disabled="!isValidNewForm"
                                class="px-2 py-1 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed text-xs"
                            >
                                Ajouter
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <section class="lg:col-span-1 bg-white rounded-lg p-3 self-start shadow-sm order-1 lg:order-2">
            <h2 class="font-bold text-base mb-3 text-gray-800">Paiement</h2>

            <div v-if="tarifDetails">
                <div v-for="eleve in tarifDetails.details_par_eleve" :key="eleve.student_id" class="mb-2">
                    <h3 class="font-semibold text-xs text-gray-800">{{ eleve.student_name }}</h3>
                    <div v-for="cursus in eleve.cursus" :key="cursus.cursus_id" class="flex items-center justify-between font-nunito px-2 font-light text-xs text-gray-600">
                        <div>{{ cursus.cursus_name }}</div>
                        <div>x1</div>
                        <div class="font-medium text-gray-800">{{ Math.round(cursus.tarif_final) }}€</div>
                    </div>
                </div>
            </div>

            <div class="my-1.5 border border-gray-200 mx-2"></div>

            <div class="grid grid-cols-4 auto-cols-fr auto-rows-fr w-full font-nunito px-2 font-light text-xs">
                <div class="font-semibold text-gray-800">Total</div>
                <div class="inline-flex items-center justify-center"></div>
                <div class="inline-flex items-center justify-center"></div>
                <div class="inline-flex items-center justify-end font-bold text-base text-gray-800">{{ Math.round(montantTotal) }}€</div>
            </div>

            <div class="my-1.5 border border-gray-200 mx-2"></div>

            <div class="bg-gradient-to-br from-gray-50 to-gray-100 border mx-1 p-2 rounded-lg font-nunito shadow-inner">
                <div v-if="detailsPaiement?.details" class="flex flex-col gap-y-1.5 mb-2">
                    <div v-if="detailsPaiement.details.espece > 0" class="grid grid-cols-3 w-full text-xs bg-white rounded-md p-1.5 shadow-sm">
                        <div class="flex items-center gap-1.5">
                            <span class="text-base">💵</span>
                            <span class="font-semibold text-gray-700">Espèces</span>
                        </div>
                        <div class="inline-flex items-center justify-center"></div>
                        <div class="inline-flex items-center justify-end font-medium text-gray-800">{{ Math.round(detailsPaiement.details.espece) }}€</div>
                    </div>

                    <div v-if="detailsPaiement.details.carte > 0" class="grid grid-cols-3 w-full text-xs bg-white rounded-md p-1.5 shadow-sm">
                        <div class="flex items-center gap-1.5">
                            <span class="text-base">💳</span>
                            <span class="font-semibold text-gray-700">CB</span>
                        </div>
                        <div class="inline-flex items-center justify-center"></div>
                        <div class="inline-flex items-center justify-end font-medium text-gray-800">{{ Math.round(detailsPaiement.details.carte) }}€</div>
                    </div>

                    <div v-if="detailsPaiement.details.cheque > 0" class="grid grid-cols-3 w-full text-xs bg-white rounded-md p-1.5 shadow-sm">
                        <div class="flex items-center gap-1.5">
                            <span class="text-base">🧾</span>
                            <span class="font-semibold text-gray-700">Chèques</span>
                        </div>
                        <div class="inline-flex items-center justify-center text-gray-600 font-medium">x{{ detailsPaiement.details.cheques.length }}</div>
                        <div class="inline-flex items-center justify-end font-medium text-gray-800">{{ Math.round(detailsPaiement.details.cheque) }}€</div>
                    </div>

                    <div v-if="detailsPaiement.details.exoneration > 0" class="grid grid-cols-3 w-full text-xs bg-white rounded-md p-1.5 shadow-sm">
                        <div class="flex items-center gap-1.5">
                            <span class="text-base">✋</span>
                            <span class="font-semibold text-gray-700">Exonération</span>
                        </div>
                        <div class="inline-flex items-center justify-center"></div>
                        <div class="inline-flex items-center justify-end font-medium text-gray-800">{{ Math.round(detailsPaiement.details.exoneration) }}€</div>
                    </div>
                </div>

                <div class="flex items-center justify-between text-xs border-t border-gray-300 pt-2 bg-white rounded-md p-1.5 shadow-sm">
                    <div class="font-semibold text-gray-800">Payé</div>
                    <div class="font-bold text-green-600">{{ Math.round(montantPaye) }}€</div>
                </div>
            </div>

            <div class="my-2 border border-gray-200 mx-2"></div>

            <div class="flex items-center justify-between text-base mx-2 bg-gradient-to-r from-gray-100 to-gray-50 p-2 rounded-lg shadow-sm">
                <div class="font-bold text-gray-800">Reste à payer</div>
                <div :class="[
          'font-bold text-lg',
          resteAPayer === 0 ? 'text-green-600' : resteAPayer < 0 ? 'text-orange-500' : 'text-red-600'
        ]">
                    {{ Math.round(resteAPayer) }}€
                </div>
            </div>
        </section>

        <div v-if="showDeleteModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-white rounded-lg p-5 max-w-md mx-3 shadow-xl">
                <h3 class="text-base font-semibold mb-3 text-gray-800">Confirmer la suppression</h3>
                <p class="text-gray-600 mb-5">Voulez-vous vraiment supprimer ce paiement ?</p>

                <div class="flex flex-col sm:flex-row gap-2 justify-end">
                    <button
                        @click="closeDeleteModal"
                        class="px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        Annuler
                    </button>
                    <button
                        @click="confirmDelete"
                        class="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                        Supprimer
                    </button>
                </div>
            </div>
        </div>
    </div>
    <div class="grid grid-cols-1 lg:grid-cols-3 mt-5 px-5 font-montserrat w-full gap-3 items-start">
        <section class="lg:col-span-1 lg:col-start-3 bg-white rounded-lg p-3 self-start shadow-sm order-1 lg:order-2">
            <div class="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" class="size-4 mr-1.5 mb-0.5" viewBox="0 0 24 24"><!-- Icon from MingCute Icon by MingCute Design - https://github.com/Richard9394/MingCute/blob/main/LICENSE -->
                    <g fill="none">
                        <path d="m12.593 23.258l-.011.002l-.071.035l-.02.004l-.014-.004l-.071-.035q-.016-.005-.024.005l-.004.01l-.017.428l.005.02l.01.013l.104.074l.015.004l.012-.004l.104-.074l.012-.016l.004-.017l-.017-.427q-.004-.016-.017-.018m.265-.113l-.013.002l-.185.093l-.01.01l-.003.011l.018.43l.005.012l.008.007l.201.093q.019.005.029-.008l.004-.014l-.034-.614q-.005-.018-.02-.022m-.715.002a.02.02 0 0 0-.027.006l-.006.014l-.034.614q.001.018.017.024l.015-.002l.201-.093l.01-.008l.004-.011l.017-.43l-.003-.012l-.01-.01z" />
                        <path fill="currentColor" d="M12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12S6.477 2 12 2m0 2a8 8 0 1 0 0 16a8 8 0 0 0 0-16m-.01 6c.558 0 1.01.452 1.01 1.01v5.124A1 1 0 0 1 12.5 18h-.49A1.01 1.01 0 0 1 11 16.99V12a1 1 0 1 1 0-2zM12 7a1 1 0 1 1 0 2a1 1 0 0 1 0-2" />
                    </g>
                </svg>
                <h2 class="font-bold text-base text-gray-800 font-montserrat">Infos</h2>
            </div>
            <div class="my-3 px-1.5 text-xs">
                Pour rappel, veuillez préciser aux personnes inscrites :
                <ul class="list-disc pl-4 mt-1.5">
                    <li><strong>Aucun remboursement</strong> ne sera effectué.</li>
                    <li>Merci de vérifier que chaque chèque est correctement rempli : <strong>ordre</strong> et <strong>signature</strong>.</li>
                </ul>
            </div>
        </section>
    </div>
</template>