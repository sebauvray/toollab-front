<script setup>
const route = useRoute()
const props = defineProps({
  to: {
    type: String,
    required: true
  },
  icon: {
    type: Object,
    required: true
  },
  text: {
    type: String,
    required: true
  },
  collapsed: {
    type: Boolean,
    default: false
  }
})


const isActive = computed(() => {
  if (props.to === '/') {
    return route.path === '/'
  }

  return route.path.startsWith(props.to)
})
</script>
<template>
  <NuxtLink
      :to="to"
      class="inline-flex items-center h-[3.75rem] relative group"
      :class="[isActive ? 'text-default' : 'text-placeholder hover:text-default']"
  >
    <span
        class="w-1.5 bg-default rounded-r-xl h-full absolute left-0"
        :class="[isActive ? 'bg-default' : 'bg-white']"
    ></span>
    <p class="inline-flex items-center w-full"
       :class="collapsed ? 'justify-center px-6' : 'justify-start pl-12 pr-6'">
      <span class="inline-flex items-center gap-x-4">
        <component :is="icon" class="size-7" />
        <span v-if="!collapsed" class="text-lg leading-5 font-medium">{{ text }}</span>
      </span>
    </p>

    <div v-if="collapsed"
         class="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 pointer-events-none group-hover:opacity-100 whitespace-nowrap z-50 transition-opacity">
      {{ text }}
    </div>
  </NuxtLink>
</template>