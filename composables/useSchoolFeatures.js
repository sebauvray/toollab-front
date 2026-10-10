import { ref } from 'vue'
import apiClient from '~/services/api'

// Flags de l'école courante (GET /api/features), mis en cache par école.
// L'API reste la seule protection : ceci ne sert qu'à masquer l'interface.
const cache = new Map()
const features = ref({})

export function useSchoolFeatures() {
    const load = async () => {
        const schoolId = localStorage.getItem('current_school_id')
        if (!schoolId) return features.value
        if (!cache.has(schoolId)) {
            cache.set(schoolId, apiClient.get('/api/features').then(r => r.data).catch(() => {
                cache.delete(schoolId)
                return {}
            }))
        }
        features.value = await cache.get(schoolId)
        return features.value
    }

    // Tant que les flags ne sont pas chargés, on suit la valeur par défaut fournie
    const isEnabled = (key, fallback = true) => features.value[key] ?? fallback

    return { features, load, isEnabled }
}
