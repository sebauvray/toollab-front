<script setup>
import {ref, onMounted, computed, nextTick} from 'vue'
import {useAuth} from '~/composables/useAuth'
import {usePageTitle} from '~/composables/usePageTitle'
import tarificationService from '~/services/tarification'
import Plus from '~/components/Icons/Plus.vue'
import Trash from '~/components/Icons/Trash.vue'
import EditIcon from '~/components/Icons/Edit.vue'
import Cross from '~/components/Icons/Cross.vue'
import ConfirmationModal from '~/components/modals/ConfirmationModal.vue'
import BreadCrumb from "~/components/navigation/BreadCrumb.vue";
import PageContainer from "~/components/layout/PageContainer.vue";
import InputNumber from "~/components/form/InputNumber.vue";
import InputSelect from "~/components/form/InputSelect.vue";
import { useSchoolYear } from "~/composables/useSchoolYear";

const { isReadOnly } = useSchoolYear();

definePageMeta({
    layout: 'auth',
    layoutData: {
        title: 'Tarification'
    },
    middleware: 'admin-director'
})

usePageTitle('Tarification')

const breadcrumbItems = computed(() => [
    {name: 'Tarification', path: '/tarification'},
]);

const {user} = useAuth()
const {setFlashMessage} = useFlashMessage()

const cursuses = ref([])
const selectedCursus = ref(null)
const isLoading = ref(true)
const isSaving = ref(false)

const showAddFamiliale = ref(false)
const showAddMultiCursus = ref(false)
const editingFamiliale = ref(null)
const editingMultiCursus = ref(null)

const showDeleteConfirmation = ref(false)
const deletingReductionId = ref(null)

const tarifForm = ref({
    prix: ''
})

const familialeForm = ref({
    nombre_eleves_min: '',
    mode: 'montant',
    montant_cible: '',
    pourcentage_reduction: ''
})

const multiCursusForm = ref({
    cursus_requis_id: '',
    pourcentage_reduction: ''
})

const reductionsFamiliales = computed(() => {
    return selectedCursus.value?.reductions_familiales || []
})

const availableCursusesForMultiCursus = computed(() => {
    if (!selectedCursus.value) return []

    const existingRequiredIds = selectedCursus.value.reductions_multi_cursus?.map(r => r.cursus_requis_id) || []

    const cursusesThatRequireThis = cursuses.value
        .filter(c => c.reductions_multi_cursus?.some(r => r.cursus_requis_id === selectedCursus.value.id))
        .map(c => c.id)

    return cursuses.value.filter(c =>
        c.id !== selectedCursus.value.id &&
        !existingRequiredIds.includes(c.id) &&
        !cursusesThatRequireThis.includes(c.id)
    )
})

const calculatedTarifApresReduction = computed(() => {
    if (!selectedCursus.value?.tarif?.prix || !familialeForm.value.pourcentage_reduction) {
        return 0
    }

    const tarifBase = parseFloat(selectedCursus.value.tarif.prix)
    const pourcentage = parseFloat(familialeForm.value.pourcentage_reduction)

    if (familialeForm.value.mode === 'montant' && familialeForm.value.montant_cible) {
        return parseFloat(familialeForm.value.montant_cible)
    }

    const result = tarifBase * (1 - pourcentage / 100)
    return parseFloat(result.toFixed(2))
})

const calculateTarifWithReduction = (tarifBase, pourcentageReduction) => {
    const base = parseFloat(tarifBase)
    const pourcentage = parseFloat(pourcentageReduction)
    const result = base * (1 - pourcentage / 100)
    return Math.round(result).toFixed(0)
}

const calculerPourcentageReduction = () => {
    if (!selectedCursus.value?.tarif?.prix || !familialeForm.value.montant_cible) return

    const tarifBase = parseFloat(selectedCursus.value.tarif.prix)
    const montantCible = parseFloat(familialeForm.value.montant_cible)

    if (montantCible >= tarifBase) {
        familialeForm.value.pourcentage_reduction = ''
        return
    }

    const reduction = ((tarifBase - montantCible) / tarifBase) * 100
    familialeForm.value.pourcentage_reduction = parseFloat(reduction.toFixed(2))
}

const calculerMontantCible = () => {
    if (!selectedCursus.value?.tarif?.prix || !familialeForm.value.pourcentage_reduction) return

    const tarifBase = parseFloat(selectedCursus.value.tarif.prix)
    const pourcentage = parseFloat(familialeForm.value.pourcentage_reduction)

    familialeForm.value.montant_cible = calculateTarifWithReduction(tarifBase, pourcentage)
}

const getTarifPrecedent = (nombreEleves) => {
    if (!selectedCursus.value?.tarif?.prix) {
        return 0
    }

    const tarifBase = parseFloat(selectedCursus.value.tarif.prix)

    if (!reductionsFamiliales.value || reductionsFamiliales.value.length === 0) {
        return tarifBase
    }

    const reduction = reductionsFamiliales.value.find(r => r.nombre_eleves_min === nombreEleves)

    if (!reduction) {
        return tarifBase
    }

    return calculateTarifWithReduction(tarifBase, reduction.pourcentage_reduction)
}

const fetchCursuses = async (preserveSelection = false) => {
    try {
        isLoading.value = true
        const currentSelectedId = selectedCursus.value?.id
        const response = await tarificationService.getCursusTarifs()

        if (response.status === 'success') {
            cursuses.value = response.data.cursuses
            
            if (preserveSelection && currentSelectedId) {
                const updatedCursus = cursuses.value.find(c => c.id === currentSelectedId)
                if (updatedCursus) {
                    selectedCursus.value = updatedCursus
                    tarifForm.value.prix = updatedCursus.tarif ? updatedCursus.tarif.prix : ''
                }
            } else if (cursuses.value.length > 0 && !selectedCursus.value) {
                selectCursus(cursuses.value[0])
            }
        }
    } catch (error) {
        console.error('Erreur lors de la récupération des cursus:', error)
        setFlashMessage({
            type: 'error',
            message: 'Erreur lors de la récupération des cursus'
        })
    } finally {
        isLoading.value = false
    }
}

const selectCursus = (cursus) => {
    selectedCursus.value = cursus
    tarifForm.value.prix = cursus.tarif ? cursus.tarif.prix : ''

    showAddFamiliale.value = false
    showAddMultiCursus.value = false
    editingFamiliale.value = null
    editingMultiCursus.value = null
    resetFamilialeForm()
    resetMultiCursusForm()
}

const updateTarif = async () => {
    if (!selectedCursus.value || !tarifForm.value.prix) return

    try {
        isSaving.value = true
        const response = await tarificationService.updateTarif(
            selectedCursus.value.id,
            tarifForm.value.prix
        )

        if (response.status === 'success') {
            const index = cursuses.value.findIndex(c => c.id === selectedCursus.value.id)
            if (index !== -1) {
                if (!cursuses.value[index].tarif) {
                    cursuses.value[index].tarif = {}
                }
                cursuses.value[index].tarif.prix = response.data.tarif.prix
            }
            if (!selectedCursus.value.tarif) {
                selectedCursus.value.tarif = {}
            }
            selectedCursus.value = {
                ...selectedCursus.value,
                tarif: {
                    ...selectedCursus.value.tarif,
                    prix: response.data.tarif.prix
                }
            }

            setFlashMessage({
                type: 'success',
                message: 'Tarif mis à jour avec succès'
            })
        }
    } catch (error) {
        console.error('Erreur lors de la mise à jour du tarif:', error)
        setFlashMessage({
            type: 'error',
            message: 'Erreur lors de la mise à jour du tarif'
        })
    } finally {
        isSaving.value = false
    }
}

const addReductionFamiliale = async () => {
    if (!selectedCursus.value || !familialeForm.value.nombre_eleves_min || !familialeForm.value.pourcentage_reduction) {
        return
    }

    try {
        isSaving.value = true
        const response = await tarificationService.addReductionFamiliale(
            selectedCursus.value.id,
            {
                nombre_eleves_min: parseInt(familialeForm.value.nombre_eleves_min),
                pourcentage_reduction: parseFloat(familialeForm.value.pourcentage_reduction)
            }
        )
        
        if (response.status === 'success' && response.data) {
            showAddFamiliale.value = false
            editingFamiliale.value = null
            resetFamilialeForm()

            setFlashMessage({
                type: 'success',
                message: 'Réduction familiale ajoutée avec succès'
            })
            
            await fetchCursuses(true)
        }
    } catch (error) {
        console.error('Erreur lors de l\'ajout de la réduction familiale:', error)
        setFlashMessage({
            type: 'error',
            message: 'Erreur lors de l\'ajout de la réduction familiale'
        })
    } finally {
        isSaving.value = false
        showAddFamiliale.value = false
    }
}

const updateReductionFamiliale = async () => {
    if (!editingFamiliale.value) return

    try {
        isSaving.value = true
        const response = await tarificationService.updateReductionFamiliale(
            editingFamiliale.value.id,
            {
                nombre_eleves_min: parseInt(familialeForm.value.nombre_eleves_min),
                pourcentage_reduction: parseFloat(familialeForm.value.pourcentage_reduction)
            }
        )

        if (response.status === 'success') {
            const updatedReduction = {
                ...response.data.reduction,
                nombre_eleves_min: parseInt(response.data.reduction.nombre_eleves_min),
                pourcentage_reduction: parseFloat(response.data.reduction.pourcentage_reduction)
            }

            const cursusIndex = cursuses.value.findIndex(c => c.id === selectedCursus.value.id)
            if (cursusIndex !== -1) {
                const reductionIndex = cursuses.value[cursusIndex].reductions_familiales.findIndex(r => r.id === editingFamiliale.value.id)
                if (reductionIndex !== -1) {
                    cursuses.value[cursusIndex].reductions_familiales[reductionIndex] = updatedReduction
                }
                
                await nextTick()
                selectedCursus.value = { ...cursuses.value[cursusIndex] }
            }

            showAddFamiliale.value = false
            editingFamiliale.value = null
            resetFamilialeForm()

            setFlashMessage({
                type: 'success',
                message: 'Réduction familiale mise à jour avec succès'
            })
        }
    } catch (error) {
        console.error('Erreur lors de la mise à jour de la réduction familiale:', error)
        setFlashMessage({
            type: 'error',
            message: 'Erreur lors de la mise à jour de la réduction familiale'
        })
    } finally {
        isSaving.value = false
        showAddFamiliale.value = false
    }
}

const confirmDeleteReductionFamiliale = (reductionId) => {
    deletingReductionId.value = reductionId
    showDeleteConfirmation.value = true
}

const deleteReductionFamiliale = async () => {
    if (!deletingReductionId.value) return

    try {
        isSaving.value = true
        const response = await tarificationService.deleteReductionFamiliale(deletingReductionId.value)

        if (response.status === 'success') {
            const index = cursuses.value.findIndex(c => c.id === selectedCursus.value.id)
            if (index !== -1) {
                cursuses.value[index].reductions_familiales = cursuses.value[index].reductions_familiales.filter(
                    r => r.id !== deletingReductionId.value
                )
                
                await nextTick()
                selectedCursus.value = { ...cursuses.value[index] }
            }

            setFlashMessage({
                type: 'success',
                message: 'Réduction familiale supprimée avec succès'
            })
        }
    } catch (error) {
        console.error('Erreur lors de la suppression de la réduction familiale:', error)
        setFlashMessage({
            type: 'error',
            message: 'Erreur lors de la suppression de la réduction familiale'
        })
    } finally {
        isSaving.value = false
        showDeleteConfirmation.value = false
        deletingReductionId.value = null
    }
}

const editReductionFamiliale = (reduction) => {
    editingFamiliale.value = reduction
    familialeForm.value.nombre_eleves_min = reduction.nombre_eleves_min.toString()
    familialeForm.value.pourcentage_reduction = reduction.pourcentage_reduction.toString()
    familialeForm.value.mode = 'pourcentage'

    const tarifBase = parseFloat(selectedCursus.value.tarif.prix)
    familialeForm.value.montant_cible = calculateTarifWithReduction(tarifBase, reduction.pourcentage_reduction).toString()

    showAddFamiliale.value = true
}

const resetFamilialeForm = () => {
    familialeForm.value = {
        nombre_eleves_min: '',
        mode: 'montant',
        montant_cible: '',
        pourcentage_reduction: ''
    }
}

const addReductionMultiCursus = async () => {
    if (!selectedCursus.value || !multiCursusForm.value.cursus_requis_id || !multiCursusForm.value.pourcentage_reduction) {
        return
    }

    try {
        isSaving.value = true
        const response = await tarificationService.addReductionMultiCursus(
            selectedCursus.value.id,
            {
                cursus_requis_id: parseInt(multiCursusForm.value.cursus_requis_id),
                pourcentage_reduction: parseFloat(multiCursusForm.value.pourcentage_reduction)
            }
        )

        if (response.status === 'success' && response.data) {
            showAddMultiCursus.value = false
            resetMultiCursusForm()

            setFlashMessage({
                type: 'success',
                message: 'Réduction multi-cursus ajoutée avec succès'
            })
            
            await fetchCursuses(true)
        }
    } catch (error) {
        console.error('Erreur lors de l\'ajout de la réduction multi-cursus:', error)
        if (error.response && error.response.status !== 200) {
            setFlashMessage({
                type: 'error',
                message: 'Erreur lors de l\'ajout de la réduction multi-cursus'
            })
        }
    } finally {
        isSaving.value = false
    }
}

const updateReductionMultiCursus = async () => {
    if (!editingMultiCursus.value) return

    try {
        isSaving.value = true
        const response = await tarificationService.updateReductionMultiCursus(
            editingMultiCursus.value.id,
            {
                cursus_requis_id: parseInt(multiCursusForm.value.cursus_requis_id),
                pourcentage_reduction: parseFloat(multiCursusForm.value.pourcentage_reduction)
            }
        )

        if (response.status === 'success') {
            const index = selectedCursus.value.reductions_multi_cursus.findIndex(r => r.id === editingMultiCursus.value.id)
            if (index !== -1) {
                selectedCursus.value.reductions_multi_cursus[index] = {
                    ...response.data.reduction,
                    cursus_requis_id: parseInt(response.data.reduction.cursus_requis_id),
                    pourcentage_reduction: parseFloat(response.data.reduction.pourcentage_reduction)
                }
            }

            const cursusIndex = cursuses.value.findIndex(c => c.id === selectedCursus.value.id)
            if (cursusIndex !== -1) {
                cursuses.value[cursusIndex].reductions_multi_cursus = [...selectedCursus.value.reductions_multi_cursus]
            }

            showAddMultiCursus.value = false
            editingMultiCursus.value = null
            resetMultiCursusForm()

            setFlashMessage({
                type: 'success',
                message: 'Réduction multi-cursus mise à jour avec succès'
            })
        }
    } catch (error) {
        console.error('Erreur lors de la mise à jour de la réduction multi-cursus:', error)
        setFlashMessage({
            type: 'error',
            message: 'Erreur lors de la mise à jour de la réduction multi-cursus'
        })
    } finally {
        isSaving.value = false
    }
}

const deleteReductionMultiCursus = async (reductionId) => {
    try {
        isSaving.value = true
        const response = await tarificationService.deleteReductionMultiCursus(reductionId)

        if (response.status === 'success') {
            selectedCursus.value.reductions_multi_cursus = selectedCursus.value.reductions_multi_cursus.filter(
                r => r.id !== reductionId
            )

            const index = cursuses.value.findIndex(c => c.id === selectedCursus.value.id)
            if (index !== -1) {
                cursuses.value[index].reductions_multi_cursus = [...selectedCursus.value.reductions_multi_cursus]
            }

            setFlashMessage({
                type: 'success',
                message: 'Réduction multi-cursus supprimée avec succès'
            })
        }
    } catch (error) {
        console.error('Erreur lors de la suppression de la réduction multi-cursus:', error)
        setFlashMessage({
            type: 'error',
            message: 'Erreur lors de la suppression de la réduction multi-cursus'
        })
    } finally {
        isSaving.value = false
    }
}

const editReductionMultiCursus = (reduction) => {
    editingMultiCursus.value = reduction
    multiCursusForm.value.cursus_requis_id = reduction.cursus_requis_id.toString()
    multiCursusForm.value.pourcentage_reduction = reduction.pourcentage_reduction.toString()
    showAddMultiCursus.value = true
}

const resetMultiCursusForm = () => {
    multiCursusForm.value = {
        cursus_requis_id: '',
        pourcentage_reduction: ''
    }
}

const getCursusRequiredName = (cursusRequiredId) => {
    const cursus = cursuses.value.find(c => c.id === cursusRequiredId)
    return cursus ? cursus.name : 'Cursus inconnu'
}

const formatPrice = (price) => {
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(price)
}

onMounted(() => {
    fetchCursuses()
})
</script>

<template>
    <PageContainer>
        <BreadCrumb :custom-items="breadcrumbItems"/>

        <div class="flex flex-col lg:flex-row gap-4">
            <aside class="lg:w-1/4">
                <div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <div class="px-3 py-2 border-b border-gray-200">
                        <h2 class="text-sm font-semibold text-gray-800">Cursus disponibles</h2>
                    </div>
                    <div class="p-2 space-y-1">
                        <button
                            v-for="cursus in cursuses"
                            :key="cursus.id"
                            @click="selectCursus(cursus)"
                            :class="[
                                'w-full text-left px-2 py-1.5 text-sm rounded-md transition-colors',
                                selectedCursus?.id === cursus.id
                                    ? 'bg-primary text-white'
                                    : 'text-gray-700 hover:bg-gray-100'
                            ]"
                        >
                            {{ cursus.name }}
                        </button>
                    </div>
                </div>
            </aside>

            <section class="lg:w-3/4">
                <div v-if="selectedCursus" class="space-y-4">
                    <div class="bg-white rounded-lg border border-gray-200 p-4">
                        <h2 class="text-sm font-semibold text-gray-800 mb-3">
                            Tarif de base — {{ selectedCursus.name }}
                        </h2>
                        <div v-if="!isReadOnly" class="flex items-end gap-3">
                            <div class="flex-1">
                                <InputNumber
                                    v-model="tarifForm.prix"
                                    placeholder="Prix (€)"
                                    :min="0"
                                />
                            </div>
                            <button
                                @click="updateTarif"
                                :disabled="isSaving"
                                class="px-4 py-1.5 text-sm bg-primary text-white rounded-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                            >
                                Enregistrer
                            </button>
                        </div>
                        <div v-else class="text-sm text-gray-700">
                            {{ tarifForm.prix ? formatPrice(tarifForm.prix) : '—' }}
                        </div>
                    </div>

                    <div class="bg-white rounded-lg border border-gray-200 p-4">
                        <div class="flex justify-between items-center mb-3">
                            <h2 class="text-sm font-semibold text-gray-800">Réductions familiales</h2>
                            <button
                                v-if="!isReadOnly"
                                @click="showAddFamiliale = true; editingFamiliale = null; resetFamilialeForm()"
                                class="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs bg-primary text-white rounded-md hover:opacity-90 transition-opacity"
                            >
                                <Plus class="size-3"/>
                                Ajouter
                            </button>
                        </div>

                        <div v-if="reductionsFamiliales.length > 0" class="space-y-2">
                            <div
                                v-for="(reduction, index) in reductionsFamiliales"
                                :key="reduction.id || `temp-${index}`"
                                class="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                            >
                                <div class="min-w-0">
                                    <p class="text-sm font-medium text-gray-800">
                                        À partir de {{ reduction.nombre_eleves_min }} élèves
                                    </p>
                                    <p class="text-xs text-gray-600 mt-0.5">
                                        Réduction de {{ reduction.pourcentage_reduction }}%
                                        — tarif après réduction :
                                        {{ formatPrice(getTarifPrecedent(reduction.nombre_eleves_min)) }}
                                    </p>
                                </div>
                                <div class="flex items-center gap-1 shrink-0" v-if="!isReadOnly">
                                    <button
                                        @click="editReductionFamiliale(reduction)"
                                        class="p-1.5 text-gray-500 hover:text-primary transition-colors"
                                        title="Modifier"
                                    >
                                        <EditIcon class="size-4"/>
                                    </button>
                                    <button
                                        @click="confirmDeleteReductionFamiliale(reduction.id)"
                                        class="p-1.5 text-red-500 hover:text-red-700 transition-colors"
                                        title="Supprimer"
                                    >
                                        <Trash class="size-4"/>
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div v-else class="text-center py-6 text-sm text-gray-400">
                            Aucune réduction familiale configurée
                        </div>
                    </div>

                    <div class="bg-white rounded-lg border border-gray-200 p-4">
                        <div class="flex justify-between items-center mb-3">
                            <h2 class="text-sm font-semibold text-gray-800">Réductions multi-cursus</h2>
                            <button
                                v-if="!isReadOnly"
                                @click="showAddMultiCursus = true; editingMultiCursus = null; resetMultiCursusForm()"
                                :disabled="availableCursusesForMultiCursus.length === 0"
                                class="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs bg-primary text-white rounded-md hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
                            >
                                <Plus class="size-3"/>
                                Ajouter
                            </button>
                        </div>

                        <div v-if="selectedCursus.reductions_multi_cursus?.length > 0" class="space-y-2">
                            <div
                                v-for="(reduction, index) in selectedCursus.reductions_multi_cursus"
                                :key="reduction.id || `temp-multi-${index}`"
                                class="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                            >
                                <div class="min-w-0">
                                    <p class="text-sm font-medium text-gray-800">
                                        Si inscrit à : {{ getCursusRequiredName(reduction.cursus_requis_id) }}
                                    </p>
                                    <p class="text-xs text-gray-600 mt-0.5">
                                        Réduction de {{ reduction.pourcentage_reduction }}%
                                    </p>
                                </div>
                                <div class="flex items-center gap-1 shrink-0" v-if="!isReadOnly">
                                    <button
                                        @click="editReductionMultiCursus(reduction)"
                                        class="p-1.5 text-gray-500 hover:text-primary transition-colors"
                                        title="Modifier"
                                    >
                                        <EditIcon class="size-4"/>
                                    </button>
                                    <button
                                        @click="deleteReductionMultiCursus(reduction.id)"
                                        class="p-1.5 text-red-500 hover:text-red-700 transition-colors"
                                        title="Supprimer"
                                    >
                                        <Trash class="size-4"/>
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div v-else class="text-center py-6 text-sm text-gray-400">
                            Aucune réduction multi-cursus configurée
                        </div>
                    </div>
                </div>

                <div v-else class="bg-white rounded-lg border border-gray-200 p-6 text-center text-sm text-gray-400">
                    Sélectionnez un cursus à gauche pour configurer sa tarification
                </div>
            </section>
        </div>

        <Teleport to="body">
            <div v-if="showAddFamiliale" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3">
                <div class="bg-white rounded-2xl w-[95vw] max-w-md flex flex-col max-h-[90vh]">
                    <div class="px-5 pt-4 pb-3 border-b border-gray-200 flex items-center justify-between">
                        <h3 class="text-base font-semibold text-gray-800">
                            {{ editingFamiliale ? 'Modifier' : 'Ajouter' }} une réduction familiale
                        </h3>
                        <button
                            @click="showAddFamiliale = false; editingFamiliale = null; resetFamilialeForm()"
                            class="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100"
                            aria-label="Fermer"
                        >
                            <Cross class="size-4"/>
                        </button>
                    </div>

                    <div class="px-5 py-4 space-y-3 overflow-y-auto">
                        <InputNumber
                            v-model="familialeForm.nombre_eleves_min"
                            placeholder="Nombre d'élèves minimum"
                            :min="2"
                        />

                        <div class="flex gap-2">
                            <button
                                type="button"
                                @click="familialeForm.mode = 'montant'"
                                :class="[
                                    'flex-1 px-3 py-1.5 text-xs rounded-md border transition-colors',
                                    familialeForm.mode === 'montant'
                                        ? 'bg-primary text-white border-primary'
                                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                ]"
                            >
                                Définir un montant
                            </button>
                            <button
                                type="button"
                                @click="familialeForm.mode = 'pourcentage'"
                                :class="[
                                    'flex-1 px-3 py-1.5 text-xs rounded-md border transition-colors',
                                    familialeForm.mode === 'pourcentage'
                                        ? 'bg-primary text-white border-primary'
                                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                ]"
                            >
                                Définir un pourcentage
                            </button>
                        </div>

                        <InputNumber
                            v-if="familialeForm.mode === 'montant'"
                            v-model="familialeForm.montant_cible"
                            placeholder="Montant après réduction (€)"
                            :min="0"
                            @input="calculerPourcentageReduction"
                        />

                        <InputNumber
                            v-if="familialeForm.mode === 'pourcentage'"
                            v-model="familialeForm.pourcentage_reduction"
                            placeholder="Pourcentage de réduction (%)"
                            :min="0"
                            :max="100"
                            @input="calculerMontantCible"
                        />

                        <div v-if="familialeForm.pourcentage_reduction" class="bg-gray-50 px-3 py-2 rounded-md space-y-0.5">
                            <p class="text-xs text-gray-600">
                                Réduction : <span class="font-semibold text-gray-800">{{ familialeForm.pourcentage_reduction }}%</span>
                            </p>
                            <p class="text-xs text-gray-600">
                                Tarif après réduction : <span class="font-semibold text-gray-800">{{ formatPrice(calculatedTarifApresReduction) }}</span>
                            </p>
                        </div>
                    </div>

                    <div class="px-5 py-3 border-t border-gray-200 flex justify-end gap-2">
                        <button
                            @click="showAddFamiliale = false; editingFamiliale = null; resetFamilialeForm()"
                            class="px-4 py-1.5 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                        >
                            Annuler
                        </button>
                        <button
                            @click="editingFamiliale ? updateReductionFamiliale() : addReductionFamiliale()"
                            :disabled="isSaving || !familialeForm.nombre_eleves_min || !familialeForm.pourcentage_reduction"
                            class="px-4 py-1.5 text-sm bg-primary text-white rounded-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                        >
                            {{ editingFamiliale ? 'Modifier' : 'Ajouter' }}
                        </button>
                    </div>
                </div>
            </div>
        </Teleport>

        <Teleport to="body">
            <div v-if="showAddMultiCursus"
                 class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3">
                <div class="bg-white rounded-2xl w-[95vw] max-w-md flex flex-col max-h-[90vh]">
                    <div class="px-5 pt-4 pb-3 border-b border-gray-200 flex items-center justify-between">
                        <h3 class="text-base font-semibold text-gray-800">
                            {{ editingMultiCursus ? 'Modifier' : 'Ajouter' }} une réduction multi-cursus
                        </h3>
                        <button
                            @click="showAddMultiCursus = false; editingMultiCursus = null; resetMultiCursusForm()"
                            class="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100"
                            aria-label="Fermer"
                        >
                            <Cross class="size-4"/>
                        </button>
                    </div>

                    <div class="px-5 py-4 space-y-3 overflow-y-auto">
                        <InputSelect
                            v-model="multiCursusForm.cursus_requis_id"
                            :options="availableCursusesForMultiCursus.map(c => ({value: c.id, label: c.name}))"
                            placeholder="Si l'élève est inscrit à"
                        />

                        <InputNumber
                            v-model="multiCursusForm.pourcentage_reduction"
                            placeholder="Pourcentage de réduction (%)"
                            :min="0"
                            :max="100"
                        />
                    </div>

                    <div class="px-5 py-3 border-t border-gray-200 flex justify-end gap-2">
                        <button
                            @click="showAddMultiCursus = false; editingMultiCursus = null; resetMultiCursusForm()"
                            class="px-4 py-1.5 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                        >
                            Annuler
                        </button>
                        <button
                            @click="editingMultiCursus ? updateReductionMultiCursus() : addReductionMultiCursus()"
                            :disabled="isSaving || !multiCursusForm.cursus_requis_id || !multiCursusForm.pourcentage_reduction"
                            class="px-4 py-1.5 text-sm bg-primary text-white rounded-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                        >
                            {{ editingMultiCursus ? 'Modifier' : 'Ajouter' }}
                        </button>
                    </div>
                </div>
            </div>
        </Teleport>

        <ConfirmationModal
            :is-open="showDeleteConfirmation"
            title="Supprimer la réduction"
            message="Êtes-vous sûr de vouloir supprimer cette réduction familiale ?"
            confirm-button-text="Supprimer"
            cancel-button-text="Annuler"
            confirm-button-class="bg-red-600 hover:bg-red-700 text-white"
            @confirm="deleteReductionFamiliale"
            @cancel="showDeleteConfirmation = false; deletingReductionId = null"
        />
    </PageContainer>
</template>