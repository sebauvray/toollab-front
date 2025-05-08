<script setup>
const defaultClass = 'w-full px-2 py-3 border rounded-md focus:border-default focus:ring-0 focus:outline-none text-sm'

const props = defineProps({
  class: {
    type: String,
    default: defaultClass
  },
  placeholder: {
    type: String,
    default: 'Sélectionner une date'
  }
})

const modelValue = defineModel()
const isFocused = ref(false)

const formatDate = (date) => {
  if (!date) return ''
  return new Date(date).toISOString().split('T')[0]
}

const handleDateChange = (event) => {
  const newDate = event.target.value
  if (newDate) {
    modelValue.value = new Date(newDate).toISOString()
  } else {
    modelValue.value = null
  }
}
</script>

<template>
  <div class="relative">
    <label
        class="absolute text-xs transition-all duration-200"
        :class="[
       isFocused ? 'text-default' : 'text-gray-400',
       '-top-2 left-2 bg-white px-1'
     ]"
    >
      {{ placeholder }}
    </label>

    <input
        type="date"
        :value="formatDate(modelValue)"
        @input="handleDateChange"
        @focus="isFocused = true"
        @blur="isFocused = false"
        :class="props.class"
    />
  </div>
</template>