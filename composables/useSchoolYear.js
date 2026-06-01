import { ref, computed } from 'vue'
import schoolYearService from '~/services/schoolYear'

const years = ref([])
const currentYearId = ref(null)
const loading = ref(false)

function readLocalYearId() {
    if (typeof window === 'undefined') return null
    const raw = localStorage.getItem('current_school_year_id')
    return raw ? parseInt(raw, 10) : null
}

function persistYearId(id) {
    if (typeof window === 'undefined') return
    if (id) {
        localStorage.setItem('current_school_year_id', String(id))
    } else {
        localStorage.removeItem('current_school_year_id')
    }
}

export function useSchoolYear() {
    const currentYear = computed(() => years.value.find(y => y.id === currentYearId.value) || null)
    const activeYear = computed(() => years.value.find(y => y.is_active) || null)
    const isReadOnly = computed(() => {
        const y = currentYear.value
        return !!(y && y.is_read_only)
    })

    async function load() {
        loading.value = true
        try {
            years.value = await schoolYearService.list()
            const local = readLocalYearId()
            const exists = years.value.find(y => y.id === local)
            if (exists) {
                currentYearId.value = local
            } else {
                const active = years.value.find(y => y.is_active)
                currentYearId.value = active ? active.id : null
                persistYearId(currentYearId.value)
            }
        } finally {
            loading.value = false
        }
    }

    function switchTo(yearId) {
        currentYearId.value = yearId
        persistYearId(yearId)
        if (typeof window !== 'undefined') {
            window.location.reload()
        }
    }

    function reset() {
        years.value = []
        currentYearId.value = null
        persistYearId(null)
    }

    async function create(payload) {
        const created = await schoolYearService.create(payload)
        await load()
        if (created?.id) {
            switchTo(created.id)
        }
        return created
    }

    return {
        years,
        currentYearId,
        currentYear,
        activeYear,
        isReadOnly,
        loading,
        load,
        switchTo,
        reset,
        create,
    }
}
