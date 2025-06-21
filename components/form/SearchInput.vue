<script setup>
import Search from "~/components/Icons/Search.vue";
import userService from "~/services/user.js";

const query = ref('')
const suggestions = ref([])
const isLoading = ref(false)
const showSuggestions = ref(false)
const searchTimeout = ref(null)

const searchStudents = async (searchQuery) => {
  if (searchQuery.length < 2) {
    suggestions.value = []
    showSuggestions.value = false
    return
  }

  isLoading.value = true

  try {
    const response = await userService.searchStudents(searchQuery)

    suggestions.value = response.data?.students || response.students || []
    showSuggestions.value = true
  } catch (error) {
    console.error('Erreur lors de la recherche:', error)
    suggestions.value = []
    showSuggestions.value = true
  } finally {
    isLoading.value = false
  }
}

const handleInput = (event) => {
  const value = event.target.value
  query.value = value

  if (searchTimeout.value) {
    clearTimeout(searchTimeout.value)
  }

  searchTimeout.value = setTimeout(() => {
    searchStudents(value)
  }, 300)
}

const selectStudent = async (student) => {
  query.value = student.full_name
  showSuggestions.value = false

  await navigateTo(`/family/${student.family_id}`)
}

const hideSuggestions = () => {
  setTimeout(() => {
    showSuggestions.value = false
  }, 200)
}

const handleFocus = () => {
  if (query.value.length >= 2) {
    searchStudents(query.value)
  }
}

onUnmounted(() => {
  if (searchTimeout.value) {
    clearTimeout(searchTimeout.value)
  }
})
</script>

<template>
  <div class="relative min-w-fit">
    <Search
        class="absolute left-5 top-1/2 transform -translate-y-1/2 size-6 text-placeholder"
    />

    <input
        type="text"
        placeholder="Rechercher un élève..."
        :value="query"
        @input="handleInput"
        @focus="handleFocus"
        @blur="hideSuggestions"
        class="w-full placeholder:text-placeholder border focus:ring-1 focus:ring-primary focus:outline-none border-input-stroke bg-white rounded-10 pl-14 py-3"
    />

    <div
        v-if="isLoading"
        class="absolute right-4 top-1/2 transform -translate-y-1/2"
    >
      <div class="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
    </div>

    <div
        v-if="showSuggestions && query.length >= 2"
        class="absolute z-50 w-full mt-1 bg-white border border-input-stroke rounded-lg shadow-lg max-h-60 overflow-y-auto"
    >
      <div
          v-for="student in suggestions"
          :key="student.id"
          @click="selectStudent(student)"
          class="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors"
      >
        <div class="font-medium font-nunito text-gray-900">
          {{ student.display_text }}
        </div>
      </div>

      <div
          v-if="!isLoading && suggestions.length === 0"
          class="px-4 py-3 text-gray-500 text-center"
      >
        Aucun résultat
      </div>

    </div>
  </div>
</template>