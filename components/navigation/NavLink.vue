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
  }
})

const isActive = computed(() => {
  return route.path === props.to
})
</script>
<template>
  <NuxtLink
      :to="to"
      class="inline-flex items-center h-[3.75rem]"
      :class="[isActive ? 'text-default' : 'text-placeholder hover:text-default']"
  >
    <span
        class="w-1.5 bg-default rounded-r-xl h-full mr-10"
        :class="[isActive ? 'bg-default' : 'bg-white']"
    ></span>
    <p class="inline-flex items-center justify-center">
      <span class="inline-flex items-center justify-center gap-x-4 w-fit">
        <component :is="icon" class="size-7" />
        <span class="text-lg leading-5 font-medium">{{ text }}</span>
      </span>
    </p>
  </NuxtLink>
</template>

