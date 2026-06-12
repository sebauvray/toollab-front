export default defineNuxtConfig({
    compatibilityDate: '2024-04-03',
    devtools: { enabled: true },
    ssr: true,
    image: {
        dir: 'assets/images',
    },
    modules: [
        '@nuxtjs/tailwindcss',
        '@nuxt/image',
    ],
    css: [
        '~/assets/css/main.css'
    ],
    runtimeConfig: {
        public: {
            apiUrl: process.env.NUXT_PUBLIC_API_URL || 'http://localhost:8000'
        }
    },
    app: {
        head: {
            titleTemplate: '%s - Toollab',
            title: 'Toollab',
            meta: [
                { name: 'description', content: 'Plateforme de gestion pour instituts d\'enseignement - Gérez facilement vos élèves, classes, familles et paiements.' }
            ],
            link: [
                { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
                { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
                {
                    rel: 'stylesheet',
                    href: 'https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400;1,600&family=Nunito:ital,wght@0,400;0,500;0,600;0,700;1,400;1,600&display=swap'
                }
            ]
        }
    },
    imports: {
        dirs: ['composables/**']
    },
    build: {
        transpile: ['axios']
    }
})