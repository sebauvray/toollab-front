<script setup>
import { defineModel, ref, watch, onMounted } from 'vue'

const props = defineProps({
  placeholder: {
    type: String,
    default: ''
  },
  min: {
    type: Number,
    default: null
  },
  max: {
    type: Number,
    default: null
  },
  required: {
    type: Boolean,
    default: false
  },
  error: {
    type: String,
    default: ''
  }
})

const modelValue = defineModel()
const isFocused = ref(false)
const isFloating = ref(false)

onMounted(() => {
  isFloating.value = !!modelValue.value
})

watch(() => modelValue.value, (newVal) => {
  isFloating.value = !!newVal || isFocused.value
})
</script>

<template>
  <div class="relative flex flex-col gap-y-1 w-full">
    <input
        type="number"
        :value="modelValue"
        @input="e => modelValue = e.target.value"
        :placeholder="isFloating ? '' : placeholder"
        @focus="isFocused = true; isFloating = true"
        @blur="isFocused = false; isFloating = !!modelValue"
        :min="min"
        :max="max"
        :required="required"
        class="w-full px-3 py-3 border border-input-stroke placeholder:text-placeholder rounded-lg transition-colors duration-200 focus:ring-0 focus:outline-none focus:border-default disabled:bg-gray-100 disabled:cursor-not-allowed no-spinners"
        :class="[error ? 'border-red-500' : '']"
    />

    <span
        class="absolute text-xs transition-all duration-150 pointer-events-none"
        :class="[
        isFloating ? '-top-2 left-2 bg-white px-1 text-default' : 'top-2 left-2 text-gray-400 opacity-0'
      ]"
    >
      {{ placeholder }}
    </span>

    <p v-if="error" class="text-xs text-red-500 mt-1">
      {{ error }}
    </p>
  </div>
</template>

<style scoped>
input[type=number].no-spinners::-webkit-inner-spin-button,
input[type=number].no-spinners::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

input[type=number].no-spinners {
  -moz-appearance: textfield;
  appearance: textfield;
}
</style>