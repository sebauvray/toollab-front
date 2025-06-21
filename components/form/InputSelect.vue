<script setup>
import { ref, watch, onMounted, computed, onBeforeUnmount } from 'vue'

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
const isOpen = ref(false)
const dropdownRef = ref(null)
const isFocused = ref(false)
const isFloating = ref(false)

onMounted(() => {
    isFloating.value = !!modelValue.value
    document.addEventListener('click', handleClickOutside)
})

onBeforeUnmount(() => {
    document.removeEventListener('click', handleClickOutside)
})

watch(() => modelValue.value, (newVal) => {
    isFloating.value = !!newVal || isFocused.value
})

const selectedLabel = computed(() => {
    if (!modelValue.value) return ''
    const option = props.options.find(opt => opt.value === modelValue.value)
    return option ? option.label : ''
})

const toggleDropdown = () => {
    isOpen.value = !isOpen.value
    isFocused.value = isOpen.value
    isFloating.value = true
}

const selectOption = (option) => {
    modelValue.value = option.value
    isOpen.value = false
    isFocused.value = false
    isFloating.value = true
}

const handleClickOutside = (event) => {
    if (dropdownRef.value && !dropdownRef.value.contains(event.target)) {
        isOpen.value = false
        isFocused.value = false
        isFloating.value = !!modelValue.value
    }
}
</script>

<template>
    <div class="relative flex flex-col gap-y-1 w-full" ref="dropdownRef">
        <div class="relative">
            <input
                type="text"
                :class="[
          'w-full px-3 py-3 border border-input-stroke placeholder:text-placeholder rounded-lg transition-colors duration-200 focus:ring-0 focus:outline-none focus:border-default disabled:bg-gray-100 disabled:cursor-not-allowed cursor-pointer',
          isFocused ? 'border-default' : 'border-input-stroke',
          error ? 'border-red-500' : ''
        ]"
                :placeholder="isFloating ? '' : placeholder"
                :value="selectedLabel"
                @click="toggleDropdown"
                :required="required"
                readonly
            />

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
                    class="size-5 text-placeholder transition-transform duration-200"
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
            style="top: 100%;"
        >
            <div
                v-for="option in options"
                :key="option.value"
                class="px-4 py-2 hover:bg-gray-100 cursor-pointer text-default font-nunito"
                @click="selectOption(option)"
            >
                {{ option.label }}
            </div>
        </div>

        <p v-if="error" class="text-xs text-red-500 mt-1">
            {{ error }}
        </p>
    </div>
</template>