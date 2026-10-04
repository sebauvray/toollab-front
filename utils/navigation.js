// Pendant l'hydratation, le serveur a déjà rendu la page demandée (il ne connaît pas
// localStorage) : une redirection côté routeur produirait un mismatch. On recharge.
export const redirectTo = (to) => {
    if (process.client && useNuxtApp().isHydrating) {
        return navigateTo(to, { external: true, replace: true })
    }
    return navigateTo(to)
}
