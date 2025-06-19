<script setup>
import { computed } from 'vue'
import { useRoute } from '#imports'
import Home from "~/components/Icons/Home.vue";

const props = defineProps({
    customItems: {
        type: Array,
        default: null
    }
})

const route = useRoute()

const breadcrumbs = computed(() => {
    // Si des éléments personnalisés sont fournis, les utiliser
    if (props.customItems && props.customItems.length > 0) {
        return props.customItems.map(item => ({
            name: item.name,
            path: item.path
        }))
    }

    // Sinon, utiliser le comportement automatique existant
    const pathArray = route.path.split('/')
    const breadcrumbs = []
    let path = ''

    pathArray.forEach((item, index) => {
        if (item !== '') {
            path += `/${item}`
            breadcrumbs.push({
                name: formatBreadcrumbName(item),
                path: path
            })
        }
    })

    return breadcrumbs
})

const formatBreadcrumbName = (name) => {
    name = name.replace(/[-_]/g, ' ')
    return name.split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
}
</script>

<template>
    <nav aria-label="Breadcrumb" class="breadcrumb-nav w-full mb-4 absolute top-6">
        <ol class="flex items-center text-sm">
            <NuxtLink
                to="/"
                class="text-placeholder font-semibold hover:opacity-80 text-2xl"
            >
                <Home class="size-6 mr-2 fill-gray-600 cursor-pointer"/>
            </NuxtLink>
            <span class="text-placeholder font-semibold text-2xl mx-2">
                <svg class="size-6 mr-2 text-placeholder -rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
            </span>
            <template v-for="(crumb, index) in breadcrumbs" :key="index">
                <li class="flex items-center">
                    <template v-if="index !== breadcrumbs.length - 1">
                        <NuxtLink
                            :to="crumb.path"
                            class="text-placeholder font-semibold hover:opacity-80 text-2xl"
                        >
                            {{ crumb.name }}
                        </NuxtLink>
                        <span class="text-placeholder font-semibold text-2xl mx-2">
                            <svg class="size-6 mr-2 text-placeholder -rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                            </svg>
                        </span>
                    </template>
                    <span v-else class="text-default font-semibold text-2xl">{{ crumb.name }}</span>
                </li>
            </template>
        </ol>
    </nav>
</template>