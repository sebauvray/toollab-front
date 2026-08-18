<script setup>
import { computed, ref, watch } from 'vue'
import Cross from '~/components/Icons/Cross.vue'
import Search from '~/components/Icons/Search.vue'
import ResponsableTLB from '~/components/Icons/Responsable-TLB.vue'
import ConfirmationModal from '~/components/modals/ConfirmationModal.vue'
import familyService from '~/services/family'
import { formatDateFr } from '~/utils/dateFormatter.js'

const props = defineProps({
    isOpen: { type: Boolean, required: true }
})

const emit = defineEmits(['close', 'restored'])

const loading = ref(false)
const error = ref(null)
const families = ref([])
const busyId = ref(null)
const actionError = ref(null)
const search = ref('')
const familleASupprimer = ref(null)

// Modale autonome : elle appelle l'API elle-même, à l'ouverture seulement.
const fetchArchived = async () => {
    loading.value = true
    error.value = null
    actionError.value = null
    search.value = ''

    try {
        const response = await familyService.getTrashedFamilies()
        families.value = response.data.items
    } catch (err) {
        error.value = err.response?.data?.message
            || 'Impossible de charger les familles archivées.'
    } finally {
        loading.value = false
    }
}

// L'API renvoie toute l'archive de l'année : le filtrage se fait en mémoire,
// sans aller-retour réseau à chaque frappe.
const normalize = (value) => (value || '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

const filtered = computed(() => {
    const term = normalize(search.value).trim()
    if (!term) return families.value

    return families.value.filter((family) => normalize(family.nom).includes(term))
})

const retirerDeLaListe = (familyId) => {
    families.value = families.value.filter((f) => f.id !== familyId)
}

const restore = async (family) => {
    if (busyId.value) return

    busyId.value = family.id
    actionError.value = null

    try {
        await familyService.restoreFamily(family.id)

        // La ligne disparaît de l'archive, et la liste derrière est rechargée
        // pour que la famille y réapparaisse sans avoir à fermer la modale.
        retirerDeLaListe(family.id)
        emit('restored')
    } catch (err) {
        actionError.value = err.response?.data?.message || 'La restauration a échoué.'
    } finally {
        busyId.value = null
    }
}

const confirmerSuppression = async () => {
    const family = familleASupprimer.value
    if (!family) return

    busyId.value = family.id
    actionError.value = null
    familleASupprimer.value = null

    const { setFlashMessage } = useFlashMessage()

    try {
        const response = await familyService.purgeFamily(family.id)
        retirerDeLaListe(family.id)

        // Le flash est en z-[9999] et téléporté dans le body : il passe
        // au-dessus de la modale, qui reste ouverte.
        setFlashMessage({
            type: 'success',
            message: response?.message || 'Famille supprimée définitivement.',
        })
    } catch (err) {
        actionError.value = err.response?.data?.message || 'La suppression a échoué.'
    } finally {
        busyId.value = null
    }
}

watch(() => props.isOpen, (open) => {
    if (open) fetchArchived()
})
</script>

<template>
    <div
        v-if="isOpen"
        class="fixed inset-0 z-50 font-nunito bg-black/50 flex items-center justify-center p-3"
        @click.self="$emit('close')"
    >
        <div
            class="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[88vh] flex flex-col"
            role="dialog"
            aria-modal="true"
            aria-labelledby="archived-families-headline"
        >
            <div class="px-5 pt-4 pb-3 border-b border-[#E6EFF5] flex items-center justify-between shrink-0">
                <h2 class="text-base font-bold text-default font-montserrat" id="archived-families-headline">
                    Familles archivées
                </h2>
                <button
                    @click="$emit('close')"
                    aria-label="Fermer"
                    class="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-50"
                >
                    <Cross class="size-4" />
                </button>
            </div>

            <!-- Hors de la zone scrollable : la recherche reste atteignable
                 quelle que soit la position dans une longue liste. -->
            <div v-if="!loading && !error && families.length > 0" class="px-5 pt-3 shrink-0">
                <div class="relative">
                    <Search class="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-placeholder" />
                    <input
                        v-model="search"
                        type="text"
                        placeholder="Rechercher un responsable..."
                        class="w-full text-xs placeholder:text-placeholder border border-input-stroke bg-white rounded-lg pl-9 pr-3 py-2 focus:ring-1 focus:ring-primary focus:outline-none"
                    />
                </div>
            </div>

            <div class="px-5 py-3 flex-1 overflow-y-auto space-y-3">
                <div v-if="loading" class="flex justify-center py-8">
                    <div class="w-6 h-6 rounded-full border-b-2 animate-spin border-default"></div>
                </div>

                <div
                    v-else-if="error"
                    class="px-3 py-2 text-xs text-red-700 bg-red-50 ring-1 ring-red-200 rounded-lg"
                >
                    {{ error }}
                </div>

                <p v-else-if="families.length === 0" class="py-8 text-center text-xs text-gray-500">
                    Aucune famille n'a été archivée cette année.
                </p>

                <template v-else>
                    <!-- Erreur d'action : affichée SANS masquer la liste, pour que
                         l'utilisateur puisse réessayer sur une autre ligne. -->
                    <div
                        v-if="actionError"
                        class="px-3 py-2 text-xs text-red-700 bg-red-50 ring-1 ring-red-200 rounded-lg"
                    >
                        {{ actionError }}
                    </div>

                    <p v-if="filtered.length === 0" class="py-8 text-center text-xs text-gray-500">
                        Aucun résultat pour « {{ search }} ».
                    </p>

                    <ul v-else class="divide-y divide-[#E6EFF5]">
                        <li
                            v-for="family in filtered"
                            :key="family.id"
                            class="flex items-center justify-between gap-3 py-2.5"
                        >
                            <span class="inline-flex items-center gap-x-3 min-w-0">
                                <ResponsableTLB class="shrink-0" />
                                <span class="truncate" :title="family.nom">{{ family.nom }}</span>
                            </span>
                            <span class="inline-flex items-center gap-x-2 shrink-0">
                                <span class="text-xs text-gray-500 mr-1">
                                    {{ formatDateFr(family.deleted_at) }}
                                </span>
                                <button
                                    type="button"
                                    @click="restore(family)"
                                    :disabled="!!busyId"
                                    title="Remettre cette famille dans l'école"
                                    class="px-3 py-1.5 text-xs rounded-lg border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    {{ busyId === family.id ? 'En cours…' : 'Restaurer' }}
                                </button>
                                <button
                                    type="button"
                                    @click="familleASupprimer = family"
                                    :disabled="!!busyId"
                                    title="Supprimer définitivement cette famille"
                                    class="px-3 py-1.5 text-xs rounded-lg border border-red-200 text-red-600 bg-white hover:bg-red-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    Supprimer
                                </button>
                            </span>
                        </li>
                    </ul>
                </template>
            </div>

            <div class="px-5 py-3 border-t border-[#E6EFF5] flex items-center justify-between gap-3 shrink-0">
                <span class="text-xs text-gray-500">
                    <template v-if="search && families.length">
                        {{ filtered.length }} sur {{ families.length }}
                    </template>
                    <template v-else-if="families.length">
                        {{ families.length }} {{ families.length > 1 ? 'familles' : 'famille' }}
                    </template>
                </span>
                <button
                    @click="$emit('close')"
                    class="px-3 py-1.5 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                >
                    Fermer
                </button>
            </div>
        </div>
    </div>

    <!-- Teleport vers le body : passe au-dessus de la modale d'archive. -->
    <ConfirmationModal
        :is-open="!!familleASupprimer"
        title="Supprimer définitivement ?"
        :message="`Êtes-vous sûr de supprimer définitivement la famille ${familleASupprimer?.nom ?? ''} ? Elle sortira de l'archive et ne pourra plus être restaurée. Les années scolaires déjà clôturées ne sont pas modifiées.`"
        confirm-button-text="Supprimer définitivement"
        cancel-button-text="Annuler"
        @confirm="confirmerSuppression"
        @cancel="familleASupprimer = null"
    />
</template>
