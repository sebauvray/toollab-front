<script setup>
import {  computed, defineProps, defineEmits } from 'vue'

const props = defineProps({
  columns: {
    type: Array,// Format: [{ key: 'id', label: 'ID', width: '5' }, ...]
    required: true,
  },
  items: {
    type: Array,
    required: true
  },
  pagination: {
    type: Object,
    required: true,
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['page-change'])

const handlePageChange = (page) => {
  if (page === props.pagination.currentPage) return
  if (page < 1 || page > props.pagination.totalPages) return
  emit('page-change', page)
}

const displayedPages = computed(() => {
  const { currentPage, totalPages } = props.pagination

  const maxPages = 5

  if (totalPages <= maxPages) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }

  let pages = [1]

  let startPage = Math.max(2, currentPage - 1)
  let endPage = Math.min(totalPages - 1, currentPage + 1)

  if (startPage === 2) {
    endPage = Math.min(totalPages - 1, startPage + 2)
  }
  if (endPage === totalPages - 1) {
    startPage = Math.max(2, endPage - 2)
  }

  if (startPage > 2) {
    pages.push('...')
  }

  for (let i = startPage; i <= endPage; i++) {
    pages.push(i)
  }

  if (endPage < totalPages - 1) {
    pages.push('...')
  }

  if (totalPages > 1) {
    pages.push(totalPages)
  }

  return pages
})

const isLastRow = (index) => {
  return index === props.items.length - 1
}
</script>

<template>
  <div class="w-full overflow-x-auto bg-white rounded-2xl border">
    <div class="grid font-bold font-montserrat py-4 px-10 border-b border-[#E6EFF5]"
         :style="`grid-template-columns: repeat(${props.columns.reduce((sum, col) => sum + (parseInt(col.width) || 1), 0)}, minmax(0, 1fr))`">
      <div
          v-for="column in props.columns"
          :key="column.key"
          :class="`col-span-${column.width || 1} inline-flex items-center justify-start`"
      >
        {{ column.label }}
      </div>
    </div>

    <div v-if="loading" class="py-10 text-center">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-default"></div>
      <p class="mt-2 text-gray-500">Chargement...</p>
    </div>

    <div v-else-if="items.length === 0" class="py-10 text-center text-gray-500">
      Aucune donnée disponible
    </div>

    <template v-else>
      <slot
          v-for="(item, index) in items"
          :key="item.id || index"
          :item="item"
          :index="index"
          :isLastRow="isLastRow(index)"
      >
        <div
            class="grid font-nunito py-4 px-10 hover:bg-gray-50 transition-colors cursor-pointer"
            :class="{ 'border-b border-[#E6EFF5]': !isLastRow(index) }"
            :style="`grid-template-columns: repeat(${props.columns.reduce((sum, col) => sum + (parseInt(col.width) || 1), 0)}, minmax(0, 1fr))`"
        >
          <template v-for="column in props.columns" :key="`${index}-${column.key}`">
            <div :class="`col-span-${column.width || 1} inline-flex items-center justify-start`">
              {{ item[column.key] }}
            </div>
          </template>
        </div>
      </slot>
    </template>
    <div class="flex justify-between items-center py-4 px-6 border-t border-[#E6EFF5]">
      <div class="w-36"></div>

      <div class="flex items-center space-x-1 justify-center">
        <button
            @click="handlePageChange(pagination.currentPage - 1)"
            :disabled="pagination.currentPage === 1"
            class="px-3 py-1 rounded-md border"
            :class="pagination.currentPage === 1 ? 'text-gray-400 cursor-not-allowed' : 'hover:bg-gray-100'"
        >
          <span class="sr-only">Page précédente</span>
          &laquo;
        </button>

        <template v-for="(page, idx) in displayedPages" :key="idx">
          <button
              v-if="page !== '...'"
              @click="handlePageChange(page)"
              class="px-3 py-1 rounded-md"
              :class="page === pagination.currentPage ? 'bg-default text-white' : 'hover:bg-gray-100'"
          >
            {{ page }}
          </button>
          <span v-else class="px-2 py-1 text-gray-500">...</span>
        </template>

        <button
            @click="handlePageChange(pagination.currentPage + 1)"
            :disabled="pagination.currentPage === pagination.totalPages || pagination.total === 0"
            class="px-3 py-1 rounded-md border"
            :class="pagination.currentPage === pagination.totalPages || pagination.total === 0 ? 'text-gray-400 cursor-not-allowed' : 'hover:bg-gray-100'"
        >
          <span class="sr-only">Page suivante</span>
          &raquo;
        </button>
      </div>
      <div class="text-sm text-black w-36 text-right">
        <span class="font-bold">{{ pagination.total }}</span> élément{{ pagination.total > 1 ? 's' : '' }}
      </div>
    </div>
  </div>
</template>