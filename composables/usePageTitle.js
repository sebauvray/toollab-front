import { useHead } from '#app'

export function usePageTitle(title) {
    useHead({
        title: title || 'Accueil',
    })
}