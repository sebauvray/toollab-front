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
  },
  sort: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['page-change', 'per-page-change', 'sort-change'])

const perPageOptions = [10, 25, 50, 100]

const handlePerPageChange = (val) => {
  emit('per-page-change', Number(val))
}

const handlePageChange = (page) => {
  if (page === props.pagination.currentPage) return
  if (page < 1 || page > props.pagination.totalPages) return
  emit('page-change', page)
}

const handleSortChange = (column) => {
  if (!column.sortable) return

  const sortKey = column.sortKey || column.key
  const direction = props.sort?.key === sortKey && props.sort?.direction === 'asc' ? 'desc' : 'asc'

  emit('sort-change', {
    key: sortKey,
    direction
  })
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
    <div class="grid font-bold font-montserrat py-2 px-5 border-b border-[#E6EFF5]"
         :style="`grid-template-columns: repeat(${props.columns.reduce((sum, col) => sum + (parseInt(col.width) || 1), 0)}, minmax(0, 1fr))`">
      <div
          v-for="column in props.columns"
          :key="column.key"
          :class="`col-span-${column.width || 1} inline-flex items-center justify-start`"
      >
        <button
            v-if="column.sortable"
            type="button"
            class="inline-flex items-center gap-1 text-left hover:text-default transition-colors"
            @click="handleSortChange(column)"
        >
          <span>{{ column.label }}</span>
          <span class="inline-flex h-3 w-3 items-center justify-center">
            <span
                class="inline-block h-0 w-0 border-x-[4px] border-x-transparent"
                :class="props.sort?.key === (column.sortKey || column.key) && props.sort?.direction === 'asc'
                  ? 'border-b-[6px] border-b-gray-900'
                  : props.sort?.key === (column.sortKey || column.key) && props.sort?.direction === 'desc'
                    ? 'border-t-[6px] border-t-gray-900'
                    : 'border-t-[6px] border-t-gray-300'"
            />
          </span>
        </button>
        <template v-else>
          {{ column.label }}
        </template>
      </div>
    </div>

    <div v-if="loading" class="py-8 text-center">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-default"></div>
      <p class="mt-1.5 text-gray-500">Chargement...</p>
    </div>

    <div v-else-if="items.length === 0" class="py-8 text-center text-gray-500">
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
            class="grid font-nunito py-2 px-5 hover:bg-gray-50 transition-colors cursor-pointer"
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
    <div class="flex justify-between items-center py-3 px-5 border-t border-[#E6EFF5]">
      <div class="w-36 flex items-center gap-1.5">
        <label class="text-xs text-placeholder whitespace-nowrap">Par page</label>
        <select
            :value="pagination.perPage"
            @change="handlePerPageChange($event.target.value)"
            class="border border-input-stroke rounded-md text-xs px-1.5 py-1 bg-white focus:outline-none cursor-pointer"
        >
          <option v-for="n in perPageOptions" :key="n" :value="n">{{ n }}</option>
        </select>
      </div>

      <div class="flex items-center space-x-1 justify-center">
        <button
            @click="handlePageChange(pagination.currentPage - 1)"
            :disabled="pagination.currentPage === 1"
            class="px-2 py-1 rounded-md border"
            :class="pagination.currentPage === 1 ? 'text-gray-400 cursor-not-allowed' : 'hover:bg-gray-100'"
        >
          <span class="sr-only">Page précédente</span>
          &laquo;
        </button>

        <template v-for="(page, idx) in displayedPages" :key="idx">
          <button
              v-if="page !== '...'"
              @click="handlePageChange(page)"
              class="px-2 py-1 rounded-md"
              :class="page === pagination.currentPage ? 'bg-default text-white' : 'hover:bg-gray-100'"
          >
            {{ page }}
          </button>
          <span v-else class="px-1.5 py-1 text-gray-500">...</span>
        </template>

        <button
            @click="handlePageChange(pagination.currentPage + 1)"
            :disabled="pagination.currentPage === pagination.totalPages"
            class="px-2 py-1 rounded-md border"
            :class="pagination.currentPage === pagination.totalPages ? 'text-gray-400 cursor-not-allowed' : 'hover:bg-gray-100'"
        >
          <span class="sr-only">Page suivante</span>
          &raquo;
        </button>
      </div>
      <div class="text-xs text-black w-36 text-right">
        <span class="font-bold">{{ pagination.total }}</span> élément{{ pagination.total > 1 ? 's' : '' }}
      </div>
    </div>
  </div>
</template>
