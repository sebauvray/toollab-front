<script setup>
const defaultClass = 'px-6 py-1.5 border rounded-md hover:bg-gray-50 font-sans'

defineProps({
  class: {
    type: String,
    default: defaultClass
  }
})

const emit = defineEmits(['click'])

const handleClick = (event) => {
  emit('click', event)
}
</script>

<template>
  <button
      type="button"
      :class
      @click="handleClick"
  >
    <slot />
  </button>
</template>