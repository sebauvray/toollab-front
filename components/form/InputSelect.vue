<script setup>
import { ref, watch, onMounted } from 'vue'

const props = defineProps({
  placeholder: {
    type: String,
    default: ''
  },
  options: {
    type: Array,
    default: () => [],
    // Format attendu: [{ value: 'value1', label: 'Label 1' }, ...]
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

const selectedLabel = computed(() => {
  if (!modelValue.value) return ''
  const option = props.options.find(opt => opt.value === modelValue.value)
  return option ? option.label : ''
})

const handleFocus = () => {
  isFocused.value = true
  isFloating.value = true
}

const handleBlur = () => {
  isFocused.value = false
  isFloating.value = !!modelValue.value
}
</script>

<template>
  <div class="relative flex flex-col gap-y-1 w-full">
    <select
        :value="modelValue"
        @input="e => modelValue = e.target.value"
        @focus="handleFocus"
        @blur="handleBlur"
        :required="required"
        class="w-full px-3 py-3 border border-input-stroke placeholder:text-placeholder rounded-lg transition-colors duration-200 focus:ring-0 focus:outline-none focus:border-default disabled:bg-gray-100 disabled:cursor-not-allowed appearance-none"
        :class="[error ? 'border-red-500' : '']"
    >
      <option value="" disabled selected></option>
      <option v-for="option in options" :key="option.value" :value="option.value">
        {{ option.label }}
      </option>
    </select>

    <span
        class="absolute text-xs transition-all duration-150 pointer-events-none"
        :class="[
        isFloating ? '-top-2 left-2 bg-white px-1 text-default' : 'top-2 left-2 text-gray-400 opacity-0'
      ]"
    >
      {{ placeholder }}
    </span>

    <div class="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
      <svg class="size-5 text-placeholder" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
      </svg>
    </div>

    <p v-if="error" class="text-xs text-red-500 mt-1">
      {{ error }}
    </p>
  </div>
</template>