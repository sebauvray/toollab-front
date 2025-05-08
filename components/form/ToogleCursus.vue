<script setup>
import { defineModel } from 'vue'

const options = [
  { value: 'levels', label: 'Par niveaux' },
  { value: 'continu', label: 'Continu' }
]

const modelValue = defineModel({
  default: 'levels'
})
</script>

<template>
  <div class="w-full">
    <div class="bg-gray-100 rounded-lg p-1 flex h-[48px]">
      <button
          v-for="option in options"
          :key="option.value"
          @click="modelValue = option.value"
          class="flex-1 rounded-md text-sm font-medium transition-all duration-200 flex items-center justify-center"
          :class="modelValue === option.value
            ? 'bg-white text-default shadow-sm ring-1 ring-gray-200'
            : 'text-gray-500 hover:text-default'"
      >
        {{ option.label }}
      </button>
    </div>
  </div>
</template>