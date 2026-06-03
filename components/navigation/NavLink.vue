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
      class="inline-flex items-center h-11 relative group"
      :class="[isActive ? 'text-default' : 'text-placeholder hover:text-default']"
  >
    <span
        class="w-1 bg-default rounded-r-xl h-full absolute left-0"
        :class="[isActive ? 'bg-default' : 'bg-white']"
    ></span>
    <p class="inline-flex items-center w-full"
       :class="collapsed ? 'justify-center px-3' : 'justify-start pl-8 pr-3'">
      <span class="inline-flex items-center gap-x-2">
        <component :is="icon" class="size-[1.15rem]" />
        <span v-if="!collapsed" class="text-base leading-5 font-medium">{{ text }}</span>
      </span>
    </p>

    <div v-if="collapsed"
         class="absolute left-full ml-1.5 px-1.5 py-1 bg-gray-800 text-white text-xs rounded opacity-0 pointer-events-none group-hover:opacity-100 whitespace-nowrap z-50 transition-opacity">
      {{ text }}
    </div>
  </NuxtLink>
</template>