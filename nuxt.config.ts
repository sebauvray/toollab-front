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
    runtimeConfig: {
        public: {
            apiUrl: process.env.NUXT_PUBLIC_API_URL || 'http://localhost'
        }
    },
    app: {
        head: {
            titleTemplate: '%s - Toollab',
            title: 'Toollab',
            link: [
                {
                    rel: 'stylesheet',
                    href: 'https://fonts.googleapis.com/css2?family=Montserrat+Alternates:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&family=Nunito:ital,wght@0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;0,1000;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900;1,1000&display=swap'
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