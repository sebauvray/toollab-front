<script setup>
import { ref } from 'vue'
import Cross from "~/components/Icons/Cross.vue";

const isFocused = ref(false)
const modelValue = defineModel()
const emit = defineEmits(['delete'])

const handleDelete = () => {
  modelValue.value = ''
  emit('delete')
}
</script>

<template>
  <div
      class="w-full inline-flex items-center border rounded-lg font-nunito "
      :class="{ 'outline outline-2 outline-primary': isFocused, 'border-placeholder': !isFocused }"
  >
    <input
        type="text"
        class="w-full rounded-l-lg px-4 py-3 text-default placeholder:text-placeholder placeholder:font-semibold placeholder:text-lg focus:outline-none"
        placeholder="Nom du niveau"
        v-model="modelValue"
        @focus="isFocused = true"
        @blur="isFocused = false"
    />
    <button
        class="h-full px-2 rounded-r-lg border-l bg-white transition-colors active:bg-gray-100"
        @click="handleDelete"
        type="button"
    >
      <Cross class="size-6 text-placeholder" />
    </button>
  </div>
</template>