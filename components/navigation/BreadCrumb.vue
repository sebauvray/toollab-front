<script setup>
import { computed } from 'vue'
import { useRoute }  from '#imports'

const route = useRoute()

const breadcrumbs = computed(() => {
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
  <nav aria-label="Breadcrumb" class="breadcrumb-nav w-full mb-4">
    <ol class="flex items-center text-sm">
      <template v-for="(crumb, index) in breadcrumbs" :key="index">
        <li class="flex items-center">
          <template v-if="index !== breadcrumbs.length - 1">
            <NuxtLink
                :to="crumb.path"
                class="text-placeholder font-semibold hover:opacity-80 text-2xl"
            >
              {{ crumb.name }}
            </NuxtLink>
            <span class="text-placeholder font-semibold  text-2xl mx-2">/</span>
          </template>
          <span
              v-else
              class="text-default font-semibold text-2xl"
          >
            {{ crumb.name }}
          </span>
        </li>
      </template>
    </ol>
  </nav>
</template>