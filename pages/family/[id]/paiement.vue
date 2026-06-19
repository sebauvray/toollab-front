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
import { saveBlob } from "~/utils/download";

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
// montant_paye = soldé (encaissé + exonéré), sert au reste à payer / à la progression.
const montantPaye = computed(() => detailsPaiement.value?.montant_paye || 0)
// montant_encaisse = trésorerie réellement reçue (hors exonérations).
const montantEncaisse = computed(() => detailsPaiement.value?.montant_encaisse ?? montantPaye.value)
const montantExonere = computed(() => detailsPaiement.value?.montant_exonere || 0)
const resteAPayer = computed(() => detailsPaiement.value?.reste_a_payer || 0)

const pourcentagePaye = computed(() => {
    if (montantTotal.value <= 0) return 100
    return Math.min(100, Math.round((montantPaye.value / montantTotal.value) * 100))
})

const statutPaiement = computed(() => {
    if (montantTotal.value <= 0) return {label: 'Exonérée', chip: 'bg-blue-100 text-blue-700 ring-blue-300', dot: 'bg-blue-500', bar: 'bg-blue-400'}
    if (resteAPayer.value <= 0) return {label: 'Payé', chip: 'bg-green-100 text-green-700 ring-green-300', dot: 'bg-green-500', bar: 'bg-green-500'}
    if (montantPaye.value === 0) return {label: 'Incomplet', chip: 'bg-red-100 text-red-700 ring-red-300', dot: 'bg-red-500', bar: 'bg-red-400'}
    return {label: 'Partiellement payé', chip: 'bg-amber-100 text-amber-700 ring-amber-300', dot: 'bg-amber-500', bar: 'bg-amber-400'}
})

const factureDisponible = computed(() => montantTotal.value > 0 || montantPaye.value > 0)
const telechargementFacture = ref(false)

const telechargerFacture = async () => {
    if (telechargementFacture.value) return
    telechargementFacture.value = true
    try {
        const blob = await paiementService.telechargerFacture(route.params.id)
        saveBlob(blob, `facture_${new Date().toISOString().slice(0, 10)}.pdf`)
    } catch (error) {
        setFlashMessage({ type: 'error', message: 'Échec du téléchargement de la facture' })
    } finally {
        telechargementFacture.value = false
    }
}

const fieldErrors = ref({})

const validateNewForm = () => {
    const errs = {}
    const f = newForm.value
    if (!f.type) return false
    if (f.type === 'cheque') {
        if (f.memeBanque) {
            if (!f.banqueCommune) errs.banqueCommune = 'Sélectionnez la banque commune'
            else if (!banquesFrancaises.includes(f.banqueCommune) && f.banqueCommune !== 'Autre') errs.banqueCommune = 'Choisissez une banque dans la liste'
        }
        if (f.memeNom && !f.nomCommun?.trim()) errs.nomCommun = "Indiquez le nom de l'émetteur commun"
        f.cheques.forEach((c, i) => {
            if (!f.memeBanque) {
                if (!c.banque) errs[`c${i}_banque`] = 'Sélectionnez une banque'
                else if (!banquesFrancaises.includes(c.banque) && c.banque !== 'Autre') errs[`c${i}_banque`] = 'Choisissez une banque dans la liste'
            }
            if (!c.numero) errs[`c${i}_numero`] = 'Numéro de chèque requis'
            if (!f.memeNom && !c.nom_emetteur?.trim()) errs[`c${i}_nom`] = "Nom de l'émetteur requis"
            if (!c.montant || c.montant <= 0) errs[`c${i}_montant`] = 'Montant requis'
        })
    } else {
        if (!f.montant || f.montant <= 0) errs.montant = 'Saisissez un montant supérieur à 0'
        if (f.type === 'exoneration' && !f.justification?.trim()) errs.justification = "Précisez le motif de l'exonération"
    }
    fieldErrors.value = errs
    return Object.keys(errs).length === 0
}

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
    espece: '<rect x="3" y="7" width="18" height="10" rx="2"/><circle cx="12" cy="12" r="2.5"/>',
    carte: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10.5h18"/>',
    cheque: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 10.5h8M7 14h5"/>',
    exoneration: '<path d="M19 5 5 19"/><circle cx="7.5" cy="7.5" r="2.2"/><circle cx="16.5" cy="16.5" r="2.2"/>'
}

const typesShort = {
    espece: 'Espèces',
    carte: 'Carte',
    cheque: 'Chèque',
    exoneration: 'Exonération'
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
    fieldErrors.value = {}
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
    if (!validateNewForm()) return

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
        let message = error.response?.data?.message || 'Erreur lors de l\'ajout'
        if (error.response?.status === 422 && /dépasser le montant dû/i.test(message)) {
            const reste = Math.round(Math.max(0, resteAPayer.value))
            const parType = {
                exoneration: `L'exonération saisie dépasse ce que la famille doit encore (reste à payer : ${reste}€).`,
                cheque: `Le total des chèques dépasse ce que la famille doit encore (reste à payer : ${reste}€).`,
                espece: `Ce montant dépasse ce que la famille doit encore (reste à payer : ${reste}€).`,
                carte: `Ce montant dépasse ce que la famille doit encore (reste à payer : ${reste}€).`,
            }
            message = parType[newForm.value.type] || message
        }
        fieldErrors.value = { api: message }
        setFlashMessage({ type: 'error', message })
    }
}

const resetNewForm = () => {
    showNewForm.value = false
    fieldErrors.value = {}
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

    <div v-else class="grid grid-cols-1 lg:grid-cols-3 mt-5 px-5 pb-6 font-montserrat w-full gap-3 items-start">
        <BreadCrumb :custom-items="breadcrumbItems" />

        <section class="lg:col-span-2 bg-white rounded-2xl border p-4 order-2 lg:order-1">
            <div class="flex items-center justify-between mb-3">
                <h2 class="font-bold text-base text-gray-800">Règlements</h2>
                <button
                    v-if="!showNewForm && !isReadOnly"
                    @click="showNewForm = true"
                    class="inline-flex items-center gap-x-1.5 bg-default text-white px-3 py-1.5 text-xs rounded-lg hover:opacity-90 transition-opacity font-medium"
                >
                    <Plus class="size-3.5" />
                    <span>Ajouter un règlement</span>
                </button>
            </div>

            <div v-if="lignesPaiement.length === 0 && !showNewForm" class="rounded-xl border border-[#E6EFF5] py-8 text-center text-xs text-placeholder font-nunito">
                Aucun règlement enregistré pour cette année.
            </div>

            <div v-if="lignesPaiement.length > 0" class="rounded-xl border border-[#E6EFF5] divide-y divide-[#E6EFF5] font-nunito overflow-hidden">
                <div v-for="ligne in lignesPaiement" :key="ligne.id" class="px-3 py-2.5 hover:bg-gray-50/70 transition-colors">
                    <div v-if="editingLineId !== ligne.id" class="flex items-center gap-3">
                        <span class="flex items-center gap-2 shrink-0 w-28">
                            <span class="inline-flex items-center justify-center w-6 h-6 rounded-md bg-gray-100 text-gray-500 shrink-0">
                                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" viewBox="0 0 24 24" v-html="typesIcons[ligne.type_paiement]"></svg>
                            </span>
                            <span class="text-xs font-medium text-gray-700">{{ typesShort[ligne.type_paiement] }}</span>
                        </span>

                        <span v-if="ligne.type_paiement === 'cheque' && ligne.details" class="text-xs text-gray-600 flex-1 min-w-0 truncate">
                            {{ ligne.details.banque }} · n° {{ ligne.details.numero }}<span v-if="ligne.details.nom_emetteur"> · {{ ligne.details.nom_emetteur }}</span>
                        </span>
                        <span v-else-if="ligne.type_paiement === 'exoneration' && ligne.details?.justification" class="text-xs text-gray-600 flex-1 min-w-0 truncate">
                            {{ ligne.details.justification }}
                        </span>
                        <span v-else class="flex-1"></span>

                        <span class="font-montserrat font-bold text-sm text-default tabular-nums shrink-0">{{ ligne.montant || 0 }}€</span>

                        <span class="flex items-center shrink-0" v-if="!isReadOnly">
                            <button
                                @click="startEdit(ligne)"
                                class="inline-flex items-center justify-center w-7 h-7 rounded-lg text-gray-400 hover:text-default hover:bg-gray-100 transition-colors"
                                title="Modifier"
                            >
                                <EditIcon class="size-3.5" />
                            </button>
                            <button
                                @click="openDeleteModal(ligne)"
                                class="inline-flex items-center justify-center w-7 h-7 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                title="Supprimer"
                            >
                                <Trash class="size-3.5" />
                            </button>
                        </span>
                    </div>

                    <div v-else class="space-y-2">
                        <div class="flex items-center gap-3">
                            <span class="flex items-center gap-2 shrink-0 w-28">
                                <span class="inline-flex items-center justify-center w-6 h-6 rounded-md bg-gray-100 text-gray-500 shrink-0">
                                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" viewBox="0 0 24 24" v-html="typesIcons[ligne.type_paiement]"></svg>
                                </span>
                                <span class="text-xs font-medium text-gray-700">{{ typesShort[ligne.type_paiement] }}</span>
                            </span>
                            <div class="relative w-36">
                                <input
                                    v-model="editForm.montant"
                                    type="text"
                                    placeholder=" "
                                    @input="editForm.montant = forceInteger(editForm.montant)"
                                    class="peer w-full pl-2.5 pr-7 py-1.5 text-sm border border-input-stroke rounded-lg focus:outline-none focus:border-default tabular-nums"
                                />
                                <span class="absolute left-2 top-[19px] -translate-y-1/2 bg-white px-1 pointer-events-none transition-all duration-150 text-sm text-placeholder peer-focus:top-0 peer-focus:text-xs peer-focus:font-medium peer-focus:text-default peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:font-medium peer-[:not(:placeholder-shown)]:text-default">Montant</span>
                                <span class="absolute right-2.5 top-[19px] -translate-y-1/2 text-sm text-gray-400 pointer-events-none">€</span>
                            </div>
                        </div>

                        <div v-if="ligne.type_paiement === 'cheque'" class="banque-autocomplete relative">
                            <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                <div class="relative">
                                    <input
                                        ref="editBanqueInputRef"
                                        :value="editBanqueSearchTerm"
                                        @input="onEditBanqueInput($event.target.value)"
                                        @blur="onEditBanqueBlur($event.target.value)"
                                        @keydown="handleEditBanqueKeydown"
                                        @focus="showEditBanqueSuggestions = true"
                                        placeholder=" "
                                        class="peer w-full px-2.5 py-1.5 text-sm border border-input-stroke rounded-lg focus:outline-none focus:border-default"
                                        autocomplete="off"
                                    />
                                    <span class="absolute left-2 top-[19px] -translate-y-1/2 bg-white px-1 pointer-events-none transition-all duration-150 text-sm text-placeholder peer-focus:top-0 peer-focus:text-xs peer-focus:font-medium peer-focus:text-default peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:font-medium peer-[:not(:placeholder-shown)]:text-default">Banque</span>
                                    <div v-if="showEditBanqueSuggestions && filteredEditBanques.length > 0"
                                         class="banque-suggestion absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                        <div v-for="(banque, index) in filteredEditBanques"
                                             :key="banque"
                                             @mousedown="selectEditBanque(banque)"
                                             :class="[
                           'px-2.5 py-1.5 cursor-pointer text-xs',
                           index === selectedEditBanqueIndex ? 'bg-gray-100' : 'hover:bg-gray-100'
                         ]">
                                            {{ banque }}
                                        </div>
                                    </div>
                                </div>
                                <div class="relative">
                                    <input
                                        v-model="editForm.cheque.numero"
                                        placeholder=" "
                                        class="peer w-full px-2.5 py-1.5 text-sm border border-input-stroke rounded-lg focus:outline-none focus:border-default"
                                    />
                                    <span class="absolute left-2 top-[19px] -translate-y-1/2 bg-white px-1 pointer-events-none transition-all duration-150 text-sm text-placeholder peer-focus:top-0 peer-focus:text-xs peer-focus:font-medium peer-focus:text-default peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:font-medium peer-[:not(:placeholder-shown)]:text-default">Numéro</span>
                                </div>
                                <div class="relative">
                                    <input
                                        v-model="editForm.cheque.nom_emetteur"
                                        placeholder=" "
                                        class="peer w-full px-2.5 py-1.5 text-sm border border-input-stroke rounded-lg focus:outline-none focus:border-default"
                                    />
                                    <span class="absolute left-2 top-[19px] -translate-y-1/2 bg-white px-1 pointer-events-none transition-all duration-150 text-sm text-placeholder peer-focus:top-0 peer-focus:text-xs peer-focus:font-medium peer-focus:text-default peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:font-medium peer-[:not(:placeholder-shown)]:text-default">Nom émetteur</span>
                                </div>
                            </div>
                        </div>

                        <div v-else-if="ligne.type_paiement === 'exoneration'">
              <div class="relative">
                  <textarea
                      v-model="editForm.justification"
                      placeholder=" "
                      rows="2"
                      class="peer w-full px-2.5 py-1.5 text-sm border border-input-stroke rounded-lg focus:outline-none focus:border-default"
                  ></textarea>
                  <span class="absolute left-2 top-[1.1rem] -translate-y-1/2 bg-white px-1 pointer-events-none transition-all duration-150 text-sm text-placeholder peer-focus:top-0 peer-focus:text-xs peer-focus:font-medium peer-focus:text-default peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:font-medium peer-[:not(:placeholder-shown)]:text-default">Justification</span>
              </div>
                        </div>

                        <div class="flex justify-end gap-x-1.5">
                            <button
                                @click="cancelEdit"
                                class="px-3 py-1.5 text-xs text-gray-700 border border-gray-300 hover:bg-gray-50 rounded-lg"
                            >
                                Annuler
                            </button>
                            <button
                                @click="saveEdit(ligne)"
                                class="px-3 py-1.5 text-xs bg-default text-white rounded-lg hover:opacity-90"
                            >
                                Valider
                            </button>
                        </div>
                    </div>
                </div>

            </div>

            <div v-if="showNewForm && !isReadOnly" class="mt-3 rounded-xl border border-[#E6EFF5] p-4 font-nunito panel-in">
                    <div class="space-y-3">
                        <div class="flex flex-wrap items-center justify-between gap-2">
                            <h3 class="font-montserrat font-semibold text-sm text-default">Nouveau règlement</h3>
                            <div class="inline-flex rounded-lg border border-input-stroke overflow-hidden divide-x divide-input-stroke">
                                <button
                                    v-for="t in [['espece', 'Espèces'], ['carte', 'Carte'], ['cheque', 'Chèques'], ['exoneration', 'Exonération']]"
                                    :key="t[0]"
                                    @click="selectType(t[0])"
                                    :class="[
                                        'px-3 py-1.5 text-xs font-medium transition-colors',
                                        newForm.type === t[0] ? 'bg-default text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                                    ]"
                                >{{ t[1] }}</button>
                            </div>
                        </div>

                        <div v-if="newForm.type === 'cheque'">
                            <div class="flex items-center gap-3 mb-3">
                                <span class="text-xs text-gray-600">Nombre de chèques</span>
                                <div class="inline-flex items-center rounded-lg border border-input-stroke overflow-hidden">
                                    <button
                                        type="button"
                                        @click="newForm.nombreCheques = Math.max(1, newForm.nombreCheques - 1); initializeCheques()"
                                        :disabled="newForm.nombreCheques <= 1"
                                        class="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-default hover:bg-gray-50 disabled:opacity-30 border-r border-input-stroke transition-colors"
                                    >−</button>
                                    <span class="w-9 text-center text-sm font-semibold tabular-nums text-default">{{ newForm.nombreCheques }}</span>
                                    <button
                                        type="button"
                                        @click="newForm.nombreCheques = Math.min(7, newForm.nombreCheques + 1); initializeCheques()"
                                        :disabled="newForm.nombreCheques >= 7"
                                        class="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-default hover:bg-gray-50 disabled:opacity-30 border-l border-input-stroke transition-colors"
                                    >+</button>
                                </div>
                            </div>

                            <div class="space-y-1.5 mb-3">
                                <label class="flex items-center gap-1.5">
                                    <input type="checkbox" v-model="newForm.memeNom" class="accent-default">
                                    <span class="text-xs">Même nom sur tous les chèques</span>
                                </label>
                                <label class="flex items-center gap-1.5">
                                    <input type="checkbox" v-model="newForm.memeBanque" class="accent-default">
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
                                        placeholder=" "
                                        :class="['peer w-full px-2.5 py-1.5 text-sm border border-input-stroke rounded-lg focus:outline-none focus:border-default', fieldErrors['banqueCommune'] ? '!border-red-400' : '']"
                                        autocomplete="off"
                                    />
                                    <span class="absolute left-2 top-[19px] -translate-y-1/2 bg-white px-1 pointer-events-none transition-all duration-150 text-sm text-placeholder peer-focus:top-0 peer-focus:text-xs peer-focus:font-medium peer-focus:text-default peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:font-medium peer-[:not(:placeholder-shown)]:text-default" :class="fieldErrors['banqueCommune'] ? '!text-red-500' : ''">Banque</span>
                                    <p v-if="fieldErrors['banqueCommune']" class="mt-1 text-[11px] text-red-600">{{ fieldErrors['banqueCommune'] }}</p>
                                    <div v-if="showBanqueSuggestions && filteredBanques.length > 0"
                                         class="banque-suggestion absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                        <div v-for="(banque, index) in filteredBanques"
                                             :key="banque"
                                             @mousedown="selectBanque(banque)"
                                             :class="[
                           'px-2 py-1.5 cursor-pointer text-xs',
                           index === selectedBanqueIndex ? 'bg-gray-100' : 'hover:bg-gray-100'
                         ]">
                                            {{ banque }}
                                        </div>
                                    </div>
                                </div>
                                <div v-if="newForm.memeNom" class="relative">
                                    <input
                                        v-model="newForm.nomCommun"
                                        placeholder=" "
                                        :class="['peer w-full px-2.5 py-1.5 text-sm border border-input-stroke rounded-lg focus:outline-none focus:border-default', fieldErrors['nomCommun'] ? '!border-red-400' : '']"
                                    />
                                    <span class="absolute left-2 top-[19px] -translate-y-1/2 bg-white px-1 pointer-events-none transition-all duration-150 text-sm text-placeholder peer-focus:top-0 peer-focus:text-xs peer-focus:font-medium peer-focus:text-default peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:font-medium peer-[:not(:placeholder-shown)]:text-default" :class="fieldErrors['nomCommun'] ? '!text-red-500' : ''">Nom émetteur</span>
                                    <p v-if="fieldErrors['nomCommun']" class="mt-1 text-[11px] text-red-600">{{ fieldErrors['nomCommun'] }}</p>
                                </div>
                            </div>

                            <div class="rounded-lg border border-[#E6EFF5] divide-y divide-[#E6EFF5]">
                                <div v-for="(cheque, index) in newForm.cheques" :key="index" class="px-3 py-2.5">
                                    <h4 class="text-[11px] font-montserrat font-semibold text-gray-500 mb-1.5">Chèque {{ index + 1 }}</h4>
                                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-1.5">
                                        <div v-if="!newForm.memeBanque" class="banque-autocomplete relative">
                                            <input
                                                :value="cheque.banque"
                                                @input="onBanqueInput($event.target.value, index)"
                                                @blur="onBanqueBlur($event.target.value, index)"
                                                @keydown="handleBanqueKeydown"
                                                @focus="showBanqueSuggestions = true"
                                                placeholder=" "
                                                :class="['peer w-full px-2.5 py-1.5 text-sm border border-input-stroke rounded-lg focus:outline-none focus:border-default', fieldErrors[`c${index}_banque`] ? '!border-red-400' : '']"
                                                autocomplete="off"
                                            />
                                            <span class="absolute left-2 top-[19px] -translate-y-1/2 bg-white px-1 pointer-events-none transition-all duration-150 text-sm text-placeholder peer-focus:top-0 peer-focus:text-xs peer-focus:font-medium peer-focus:text-default peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:font-medium peer-[:not(:placeholder-shown)]:text-default" :class="fieldErrors[`c${index}_banque`] ? '!text-red-500' : ''">Banque</span>
                                            <p v-if="fieldErrors[`c${index}_banque`]" class="mt-1 text-[11px] text-red-600">{{ fieldErrors[`c${index}_banque`] }}</p>
                                            <div v-if="showBanqueSuggestions && filteredBanques.length > 0"
                                                 class="banque-suggestion absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                                <div v-for="(banque, banqueIndex) in filteredBanques"
                                                     :key="banque"
                                                     @mousedown="selectBanque(banque, index)"
                                                     :class="[
                               'px-2 py-1.5 cursor-pointer text-xs',
                               banqueIndex === selectedBanqueIndex ? 'bg-gray-100' : 'hover:bg-gray-100'
                             ]">
                                                    {{ banque }}
                                                </div>
                                            </div>
                                        </div>
                                        <div class="relative">
                                            <input
                                                v-model="cheque.numero"
                                                placeholder=" "
                                                :class="['peer w-full px-2.5 py-1.5 text-sm border border-input-stroke rounded-lg focus:outline-none focus:border-default', fieldErrors[`c${index}_numero`] ? '!border-red-400' : '']"
                                            />
                                            <span class="absolute left-2 top-[19px] -translate-y-1/2 bg-white px-1 pointer-events-none transition-all duration-150 text-sm text-placeholder peer-focus:top-0 peer-focus:text-xs peer-focus:font-medium peer-focus:text-default peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:font-medium peer-[:not(:placeholder-shown)]:text-default" :class="fieldErrors[`c${index}_numero`] ? '!text-red-500' : ''">Numéro</span>
                                            <p v-if="fieldErrors[`c${index}_numero`]" class="mt-1 text-[11px] text-red-600">{{ fieldErrors[`c${index}_numero`] }}</p>
                                        </div>
                                        <div v-if="!newForm.memeNom" class="relative">
                                            <input
                                                v-model="cheque.nom_emetteur"
                                                placeholder=" "
                                                :class="['peer w-full px-2.5 py-1.5 text-sm border border-input-stroke rounded-lg focus:outline-none focus:border-default', fieldErrors[`c${index}_nom`] ? '!border-red-400' : '']"
                                            />
                                            <span class="absolute left-2 top-[19px] -translate-y-1/2 bg-white px-1 pointer-events-none transition-all duration-150 text-sm text-placeholder peer-focus:top-0 peer-focus:text-xs peer-focus:font-medium peer-focus:text-default peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:font-medium peer-[:not(:placeholder-shown)]:text-default" :class="fieldErrors[`c${index}_nom`] ? '!text-red-500' : ''">Nom émetteur</span>
                                            <p v-if="fieldErrors[`c${index}_nom`]" class="mt-1 text-[11px] text-red-600">{{ fieldErrors[`c${index}_nom`] }}</p>
                                        </div>
                                        <div class="relative">
                                            <input
                                                v-model="cheque.montant"
                                                type="text"
                                                placeholder=" "
                                                @input="cheque.montant = forceInteger(cheque.montant); updateMontantTotal()"
                                                :class="['peer w-full pl-2.5 pr-7 py-1.5 text-sm border border-input-stroke rounded-lg focus:outline-none focus:border-default tabular-nums', fieldErrors[`c${index}_montant`] ? '!border-red-400' : '']"
                                            />
                                            <span class="absolute left-2 top-[19px] -translate-y-1/2 bg-white px-1 pointer-events-none transition-all duration-150 text-sm text-placeholder peer-focus:top-0 peer-focus:text-xs peer-focus:font-medium peer-focus:text-default peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:font-medium peer-[:not(:placeholder-shown)]:text-default" :class="fieldErrors[`c${index}_montant`] ? '!text-red-500' : ''">Montant</span>
                                            <span class="absolute right-2.5 top-[19px] -translate-y-1/2 text-sm text-gray-400 pointer-events-none">€</span>
                                            <p v-if="fieldErrors[`c${index}_montant`]" class="mt-1 text-[11px] text-red-600">{{ fieldErrors[`c${index}_montant`] }}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div v-else-if="newForm.type === 'espece' || newForm.type === 'carte'">
                            <div class="relative w-44">
                                <input
                                    v-model="newForm.montant"
                                    type="text"
                                    placeholder=" "
                                    @input="newForm.montant = forceInteger(newForm.montant)"
                                    :class="['peer w-full pl-2.5 pr-7 py-1.5 text-sm border border-input-stroke rounded-lg focus:outline-none focus:border-default tabular-nums', fieldErrors['montant'] ? '!border-red-400' : '']"
                                />
                                <span class="absolute left-2 top-[19px] -translate-y-1/2 bg-white px-1 pointer-events-none transition-all duration-150 text-sm text-placeholder peer-focus:top-0 peer-focus:text-xs peer-focus:font-medium peer-focus:text-default peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:font-medium peer-[:not(:placeholder-shown)]:text-default" :class="fieldErrors['montant'] ? '!text-red-500' : ''">Montant</span>
                                <span class="absolute right-2.5 top-[19px] -translate-y-1/2 text-sm text-gray-400 pointer-events-none">€</span>
                                <p v-if="fieldErrors['montant']" class="mt-1 text-[11px] text-red-600">{{ fieldErrors['montant'] }}</p>
                            </div>
                        </div>

                        <div v-else-if="newForm.type === 'exoneration'" class="space-y-3">
                            <div class="relative w-44">
                                <input
                                    v-model="newForm.montant"
                                    type="text"
                                    placeholder=" "
                                    @input="newForm.montant = forceInteger(newForm.montant)"
                                    :class="['peer w-full pl-2.5 pr-7 py-1.5 text-sm border border-input-stroke rounded-lg focus:outline-none focus:border-default tabular-nums', fieldErrors['montant'] ? '!border-red-400' : '']"
                                />
                                <span class="absolute left-2 top-[19px] -translate-y-1/2 bg-white px-1 pointer-events-none transition-all duration-150 text-sm text-placeholder peer-focus:top-0 peer-focus:text-xs peer-focus:font-medium peer-focus:text-default peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:font-medium peer-[:not(:placeholder-shown)]:text-default" :class="fieldErrors['montant'] ? '!text-red-500' : ''">Montant</span>
                                <span class="absolute right-2.5 top-[19px] -translate-y-1/2 text-sm text-gray-400 pointer-events-none">€</span>
                                <p v-if="fieldErrors['montant']" class="mt-1 text-[11px] text-red-600">{{ fieldErrors['montant'] }}</p>
                            </div>
                            <div class="relative">
                                <textarea
                                    v-model="newForm.justification"
                                    placeholder=" "
                                    rows="2"
                                    :class="['peer w-full px-2.5 py-1.5 text-sm border border-input-stroke rounded-lg focus:outline-none focus:border-default', fieldErrors['justification'] ? '!border-red-400' : '']"
                                ></textarea>
                                <span class="absolute left-2 top-[1.1rem] -translate-y-1/2 bg-white px-1 pointer-events-none transition-all duration-150 text-sm text-placeholder peer-focus:top-0 peer-focus:text-xs peer-focus:font-medium peer-focus:text-default peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:font-medium peer-[:not(:placeholder-shown)]:text-default" :class="fieldErrors['justification'] ? '!text-red-500' : ''">Justification</span>
                                <p v-if="fieldErrors['justification']" class="mt-1 text-[11px] text-red-600">{{ fieldErrors['justification'] }}</p>
                            </div>
                        </div>

                        <div v-if="fieldErrors['api']" class="rounded-lg bg-red-50 ring-1 ring-red-200 px-3 py-2 text-xs text-red-700">
                            {{ fieldErrors['api'] }}
                        </div>

                        <div class="flex items-center justify-between gap-x-1.5">
                            <span v-if="newForm.type === 'cheque' && newForm.cheques.length > 1" class="text-xs text-placeholder font-nunito">
                                Total saisi : <span class="font-semibold text-default tabular-nums">{{ newForm.montant || 0 }}€</span>
                            </span>
                            <span v-else></span>
                            <div class="flex gap-x-1.5">
                            <button
                                @click="resetNewForm"
                                class="px-3 py-1.5 text-xs text-gray-700 border border-gray-300 hover:bg-gray-50 rounded-lg"
                            >
                                Annuler
                            </button>
                            <button
                                @click="addNewLigne"
                                class="px-3 py-1.5 text-xs bg-default text-white rounded-lg hover:opacity-90"
                            >
                                Ajouter
                            </button>
                            </div>
                        </div>
                    </div>
            </div>
        </section>

        <section class="lg:col-span-1 bg-white rounded-2xl border p-4 self-start order-1 lg:order-2">
            <div class="flex items-center justify-between mb-3">
                <h2 class="font-bold text-base text-gray-800">Paiement</h2>
                <button
                    v-if="factureDisponible"
                    type="button"
                    :disabled="telechargementFacture"
                    @click="telechargerFacture"
                    class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-default bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-60 disabled:cursor-wait"
                >
                    {{ telechargementFacture ? 'Téléchargement…' : 'Facture PDF' }}
                </button>
            </div>

            <div class="rounded-xl border border-[#E6EFF5] px-3 py-2.5 font-nunito mb-3">
                <div class="flex items-center justify-between mb-2">
                    <span class="text-xs text-placeholder">Total annuel <span class="font-montserrat font-bold text-default text-base ml-1">{{ Math.round(montantTotal) }}€</span></span>
                    <span :class="['inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] ring-1', statutPaiement.chip]">
                        <span :class="['w-1.5 h-1.5 rounded-full', statutPaiement.dot]"></span>
                        {{ statutPaiement.label }}
                    </span>
                </div>
                <div class="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                    <div
                        :class="['h-full rounded-full transition-all duration-700 ease-out', statutPaiement.bar]"
                        :style="{ width: pourcentagePaye + '%' }"
                    ></div>
                </div>
                <div class="flex justify-between mt-1.5 text-[11px] text-placeholder">
                    <span>Encaissé : <span class="font-semibold text-default">{{ Math.round(montantEncaisse) }}€</span></span>
                    <span v-if="montantExonere > 0">Exonération : <span class="font-semibold text-default">{{ Math.round(montantExonere) }}€</span></span>
                    <span>Reste à payer : <span :class="['font-semibold', resteAPayer <= 0 ? 'text-green-600' : 'text-default']">{{ Math.round(Math.max(0, resteAPayer)) }}€</span></span>
                </div>
            </div>

            <div v-if="tarifDetails" class="font-nunito mb-3">
                <div v-for="eleve in tarifDetails.details_par_eleve" :key="eleve.student_id" class="mb-2 last:mb-0">
                    <h3 class="font-semibold text-xs text-gray-800 font-montserrat">{{ eleve.student_name }}</h3>
                    <div v-for="cursus in eleve.cursus" :key="cursus.cursus_id" class="flex items-center justify-between px-2 text-xs text-gray-600 py-0.5">
                        <div>{{ cursus.cursus_name }}</div>
                        <div class="font-medium text-gray-800">{{ Math.round(cursus.tarif_final) }}€</div>
                    </div>
                </div>
            </div>

            <div v-if="detailsPaiement?.details" class="rounded-xl border border-[#E6EFF5] divide-y divide-[#E6EFF5] font-nunito text-xs">
                <div v-if="detailsPaiement.details.espece > 0" class="flex items-center justify-between px-3 py-2">
                    <span class="flex items-center gap-2">
                        <span class="inline-flex items-center justify-center w-6 h-6 rounded-md bg-gray-100 text-gray-500 shrink-0">
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" viewBox="0 0 24 24" v-html="typesIcons['espece']"></svg>
                        </span>
                        <span class="text-xs font-medium text-gray-700">Espèces</span>
                    </span>
                    <span class="font-medium text-gray-800 tabular-nums">{{ Math.round(detailsPaiement.details.espece) }}€</span>
                </div>
                <div v-if="detailsPaiement.details.carte > 0" class="flex items-center justify-between px-3 py-2">
                    <span class="flex items-center gap-2">
                        <span class="inline-flex items-center justify-center w-6 h-6 rounded-md bg-gray-100 text-gray-500 shrink-0">
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" viewBox="0 0 24 24" v-html="typesIcons['carte']"></svg>
                        </span>
                        <span class="text-xs font-medium text-gray-700">Carte</span>
                    </span>
                    <span class="font-medium text-gray-800 tabular-nums">{{ Math.round(detailsPaiement.details.carte) }}€</span>
                </div>
                <div v-if="detailsPaiement.details.cheque > 0" class="flex items-center justify-between px-3 py-2">
                    <span class="flex items-center gap-2">
                        <span class="inline-flex items-center justify-center w-6 h-6 rounded-md bg-gray-100 text-gray-500 shrink-0">
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" viewBox="0 0 24 24" v-html="typesIcons['cheque']"></svg>
                        </span>
                        <span class="text-xs font-medium text-gray-700">Chèques</span>
                        <span class="text-gray-500">× {{ detailsPaiement.details.cheques.length }}</span>
                    </span>
                    <span class="font-medium text-gray-800 tabular-nums">{{ Math.round(detailsPaiement.details.cheque) }}€</span>
                </div>
                <div v-if="detailsPaiement.details.exoneration > 0" class="flex items-center justify-between px-3 py-2">
                    <span class="flex items-center gap-2">
                        <span class="inline-flex items-center justify-center w-6 h-6 rounded-md bg-gray-100 text-gray-500 shrink-0">
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" viewBox="0 0 24 24" v-html="typesIcons['exoneration']"></svg>
                        </span>
                        <span class="text-xs font-medium text-gray-700">Exonération</span>
                    </span>
                    <span class="font-medium text-gray-800 tabular-nums">{{ Math.round(detailsPaiement.details.exoneration) }}€</span>
                </div>
            </div>
        </section>

        <div v-if="showDeleteModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 font-nunito" @click.self="closeDeleteModal">
            <div class="bg-white rounded-2xl shadow-xl w-full max-w-md">
                <div class="px-5 pt-4 pb-3 border-b border-[#E6EFF5]">
                    <h3 class="text-base font-bold text-default font-montserrat">Supprimer ce règlement ?</h3>
                </div>
                <div class="px-5 py-4 text-xs text-gray-600 leading-relaxed">
                    Cette ligne sera définitivement supprimée et le reste à payer de la famille sera recalculé.
                </div>
                <div class="px-5 py-3 border-t border-[#E6EFF5] flex justify-end gap-x-1.5">
                    <button
                        @click="closeDeleteModal"
                        class="px-3 py-1.5 text-xs text-gray-700 border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                        Annuler
                    </button>
                    <button
                        @click="confirmDelete"
                        class="px-3 py-1.5 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                    >
                        Supprimer
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>
<style scoped>
.panel-in {
    animation: panel-in 0.22s ease-out;
}

@keyframes panel-in {
    from {
        opacity: 0;
        transform: translateY(-5px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}
</style>
