<script setup>
const defaultClass = 'px-5 py-1 border rounded-md hover:bg-gray-50 font-sans'

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