<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import Cross from '~/components/Icons/Cross.vue'
import familyService from '~/services/family'

const props = defineProps({
    isOpen: { type: Boolean, required: true },
    familyId: { type: [String, Number], required: true },
    deleting: { type: Boolean, default: false }
})

const emit = defineEmits(['confirm', 'cancel'])

const isBrowser = ref(false)
const loading = ref(false)
const error = ref(null)
const preview = ref(null)

const fetchPreview = async () => {
    loading.value = true
    error.value = null
    preview.value = null

    try {
        const response = await familyService.getDeletionPreview(props.familyId)
        preview.value = response.data
    } catch (err) {
        error.value = err.response?.data?.message
            || 'Impossible de charger le détail de la suppression.'
    } finally {
        loading.value = false
    }
}

// Le compte des lignes n'est chargé qu'à l'ouverture : inutile d'interroger
// l'API tant que l'utilisateur n'a pas cliqué sur Supprimer.
watch(() => props.isOpen, (open) => {
    updateOverflow()
    if (open) fetchPreview()
})

const plural = (count, singular, pluralForm) => `${count} ${count > 1 ? pluralForm : singular}`

const classroomsLabel = computed(() => (preview.value?.classrooms || []).join(', '))

const hasUnpaidBalance = computed(() => (preview.value?.reste_a_payer || 0) > 0)

// Le backend renvoie can_delete=false dès que la famille porte de l'activité sur
// l'année courante (inscription active ou règlement). Il refait le test au DELETE :
// ce blocage-ci est du confort, pas la protection.
const blockers = computed(() => preview.value?.blockers || [])
const isBlocked = computed(() => blockers.value.length > 0)

const blockerCodes = computed(() => blockers.value.map((b) => b.code))

// On n'annonce que ce qui part réellement : une ligne « 0 élève » ou
// « Aucune inscription en classe » n'apprend rien et alourdit la fenêtre.
const hasRemovedItems = computed(() => {
    const data = preview.value
    if (!data) return false

    return data.students > 0 || data.responsibles > 0 || data.active_enrollments > 0
})

const hasPreservedItems = computed(() => {
    const data = preview.value
    if (!data) return false

    return data.montant_paye > 0 || data.montant_exonere > 0 || data.comments > 0
})

const onConfirm = () => {
    if (!props.deleting) emit('confirm')
}

const onCancel = () => {
    if (!props.deleting) emit('cancel')
}

const updateOverflow = () => {
    if (!isBrowser.value) return
    document.body.style.overflow = props.isOpen ? 'hidden' : 'auto'
}

onMounted(() => {
    isBrowser.value = true
    updateOverflow()
    if (props.isOpen) fetchPreview()
})

onBeforeUnmount(() => {
    if (isBrowser.value) document.body.style.overflow = 'auto'
})
</script>

<template>
    <Teleport to="body" v-if="isBrowser && isOpen">
        <div class="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-3" @click.self="onCancel">
            <div
                class="bg-white rounded-2xl shadow-xl w-full max-w-lg font-nunito max-h-[90vh] flex flex-col"
                role="dialog"
                aria-modal="true"
                aria-labelledby="archive-family-headline"
            >
                <div class="px-5 pt-4 pb-3 border-b border-[#E6EFF5] flex items-center justify-between shrink-0">
                    <h3 class="text-base font-bold text-default font-montserrat" id="archive-family-headline">
                        Archiver la famille ?
                    </h3>
                    <button
                        @click="onCancel"
                        class="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-50"
                        aria-label="Fermer"
                    >
                        <Cross class="size-4" />
                    </button>
                </div>

                <div class="px-5 py-4 overflow-y-auto">
                    <div v-if="loading" class="flex justify-center py-6">
                        <div class="w-6 h-6 rounded-full border-b-2 animate-spin border-default"></div>
                    </div>

                    <div v-else-if="error" class="p-3 text-xs text-red-700 bg-red-50 rounded-lg">
                        {{ error }}
                    </div>

                    <!-- Famille active sur l'année en cours : on n'affiche pas le
                         détail de ce qui serait retiré, puisque rien ne le sera. -->
                    <div v-else-if="isBlocked" class="space-y-3 text-xs text-gray-600">
                        <div class="p-3 rounded-lg bg-red-50 text-red-700 ring-1 ring-red-200">
                            <p class="font-semibold mb-1.5">
                                Cette famille ne peut pas être archivée.
                            </p>
                            <p class="mb-2 leading-relaxed">
                                Elle a de l'activité sur l'année en cours :
                            </p>
                            <ul class="list-disc list-inside space-y-0.5">
                                <li v-for="blocker in blockers" :key="blocker.code">
                                    {{ blocker.label }}
                                </li>
                            </ul>
                        </div>

                        <p class="leading-relaxed">
                            Retirez d'abord ces éléments, puis relancez l'archivage.
                        </p>

                        <div class="flex flex-wrap gap-1.5">
                            <NuxtLink
                                v-if="blockerCodes.includes('enrollments')"
                                :to="`/family/${familyId}/classes`"
                                class="inline-flex items-center px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                            >
                                Choix des classes
                            </NuxtLink>
                            <NuxtLink
                                v-if="blockerCodes.includes('payments')"
                                :to="`/family/${familyId}/paiement`"
                                class="inline-flex items-center px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                            >
                                Règlements
                            </NuxtLink>
                        </div>
                    </div>

                    <div v-else-if="preview" class="space-y-3 text-xs text-gray-600">
                        <p class="leading-relaxed">
                            Cette famille sera retirée de l'école. Vous pourrez la restaurer
                            depuis l'archive, sur la liste des familles.
                        </p>

                        <div v-if="hasRemovedItems">
                            <p class="font-semibold text-default mb-1">Ce qui sera retiré de l'école</p>
                            <ul class="list-disc list-inside space-y-0.5">
                                <li v-if="preview.students > 0">
                                    {{ plural(preview.students, 'élève', 'élèves') }}
                                </li>
                                <li v-if="preview.responsibles > 0">
                                    {{ plural(preview.responsibles, 'responsable', 'responsables') }}
                                </li>
                                <li v-if="preview.active_enrollments > 0">
                                    {{ plural(preview.active_enrollments, 'inscription active', 'inscriptions actives') }}
                                    <span v-if="classroomsLabel" class="text-gray-500">
                                        ({{ classroomsLabel }} — {{ plural(preview.freed_spots, 'place libérée', 'places libérées') }})
                                    </span>
                                </li>
                            </ul>
                        </div>

                        <!-- Section masquée s'il n'y a ni règlement ni commentaire :
                             un titre suivi d'une liste vide n'apprend rien. -->
                        <div v-if="hasPreservedItems">
                            <p class="font-semibold text-default mb-1">Ce qui est conservé</p>
                            <ul class="list-disc list-inside space-y-0.5">
                                <li v-if="preview.montant_paye > 0 || preview.montant_exonere > 0">
                                    Les paiements ({{ Math.round(preview.montant_paye) }}€ encaissés<span
                                        v-if="preview.montant_exonere > 0"
                                    >, {{ Math.round(preview.montant_exonere) }}€ exonérés</span>)
                                </li>
                                <li v-if="preview.comments > 0">
                                    {{ plural(preview.comments, 'commentaire', 'commentaires') }}
                                </li>
                            </ul>
                            <!-- « Conservé » ne veut pas dire « consultable » : la fiche
                                 devient inaccessible une fois la famille archivée. On le dit,
                                 sinon le compteur laisse croire qu'on peut encore y accéder. -->
                            <p class="mt-1.5 text-gray-500">
                                Ces éléments ne sont plus consultables tant que la famille est
                                archivée. Ils reviennent si vous la restaurez.
                            </p>
                        </div>

                        <p
                            v-if="hasUnpaidBalance"
                            class="p-2.5 rounded-lg bg-red-50 text-red-700 leading-relaxed"
                        >
                            ⚠️ Cette famille doit encore <strong>{{ Math.round(preview.reste_a_payer) }}€</strong>.
                            L'archiver la retirera du suivi des impayés — cette créance ne sera plus visible.
                        </p>

                        <p
                            v-if="preview.shared_users > 0"
                            class="p-2.5 rounded-lg bg-blue-50 text-blue-800 leading-relaxed"
                        >
                            ℹ️
                            <template v-if="preview.shared_users > 1">
                                {{ preview.shared_users }} personnes de cette famille sont également rattachées
                            </template>
                            <template v-else>
                                1 personne de cette famille est également rattachée
                            </template>
                            à un autre établissement. Son accès là-bas n'est pas affecté.
                        </p>

                    </div>
                </div>

                <div class="px-5 py-3 border-t border-[#E6EFF5] flex justify-end gap-x-1.5 shrink-0">
                    <button
                        @click="onCancel"
                        :disabled="deleting"
                        class="px-3 py-1.5 text-xs rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        {{ isBlocked ? 'Fermer' : 'Annuler' }}
                    </button>
                    <!-- Pas de bouton désactivé en permanence : quand l'archivage
                         est impossible, on ne le propose pas. -->
                    <button
                        v-if="!isBlocked"
                        @click="onConfirm"
                        :disabled="deleting || loading || !!error"
                        class="px-3 py-1.5 text-xs rounded-lg font-medium bg-default hover:opacity-90 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        {{ deleting ? 'Archivage…' : 'Archiver' }}
                    </button>
                </div>
            </div>
        </div>
    </Teleport>
</template>
