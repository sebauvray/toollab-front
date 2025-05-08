//CustomSelect.vue
<script setup>
import { ref, onMounted, onBeforeUnmount, computed, defineModel } from 'vue'

const options = [
  { name: 'Hommes', color: '#93C5FD' },
  { name: 'Femmes', color: '#FDA4AF' },
  { name: 'Enfants', color: '#FCD34D' },
  { name: 'Mixte', color: '#86EFAC' },
]

const props = defineProps({
  placeholder: {
    type: String,
    default: 'Genre'
  }
})

const model = defineModel()
const isOpen = ref(false)
const dropdownRef = ref(null)
const isFocused = ref(false)
const isFloating = ref(false)

onMounted(() => {
  isFloating.value = !!model.value
  document.addEventListener('click', handleClickOutside)
})

const toggleDropdown = () => {
  isOpen.value = !isOpen.value
  isFocused.value = isOpen.value
  isFloating.value = true
}

const selectOption = (option) => {
  model.value = option.name
  isOpen.value = false
  isFocused.value = false
  isFloating.value = true
}

const getSelectedColor = () => {
  const selectedOption = options.find(opt => opt.name === model.value)
  return selectedOption?.color
}

const handleClickOutside = (event) => {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target)) {
    isOpen.value = false
    isFocused.value = false
    isFloating.value = !!model.value
  }
}

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <div class="relative w-full" ref="dropdownRef">
    <div class="relative">
      <input
          type="text"
          :class="[
          'w-full px-3 py-3 border border-input-stroke placeholder:text-placeholder rounded-lg transition-colors duration-200 focus:ring-0 focus:outline-none focus:border-default disabled:bg-gray-100 disabled:cursor-not-allowed cursor-pointer',
          model ? 'pl-12' : 'pl-4',
          isFocused ? 'border-default' : 'border-input-stroke'
        ]"
          :placeholder="isFloating ? '' : placeholder"
          :value="model"
          @click="toggleDropdown"
          readonly
      />
      <div
          v-if="model"
          class="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-3"
      >
        <div
            class="size-4 rounded"
            :style="{ backgroundColor: getSelectedColor() }"
        />
      </div>

      <span
          class="absolute text-xs transition-all duration-150 pointer-events-none font-medium"
          :class="[
          isFloating ? '-top-2 left-2 bg-white px-1 text-default' : 'top-2 left-2 text-gray-400 opacity-0'
        ]"
      >
        {{ placeholder }}
      </span>

      <div class="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
        <svg
            class="size-5 text-placeholder"
            :class="{ 'rotate-180': isOpen }"
            viewBox="0 0 12 12"
            fill="currentColor"
        >
          <path d="M2 4 L6 8 L10 4 Z" />
        </svg>
      </div>
    </div>

    <div
        v-if="isOpen"
        class="absolute w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto z-50"
    >
      <div
          v-for="(option, index) in options"
          :key="index"
          class="px-4 py-2 hover:bg-gray-100 cursor-pointer text-default font-nunito flex items-center gap-3"
          @click="selectOption(option)"
      >
        <div
            class="size-4 rounded flex-shrink-0 text-default"
            :style="{ backgroundColor: option.color }"
        />
        {{ option.name }}
      </div>
    </div>
  </div>
</template>