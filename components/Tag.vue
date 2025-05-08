<template>
  <span
      class="px-5 py-1.5 rounded-[5px] border min-w-28 text-center"
      :class="statusClasses[status]"
  >
    {{ statusLabels[status] }}
  </span>
</template>

<script setup>
defineProps({
  status: {
    type: String,
    required: true,
    validator: (value) => ['paid', 'pending', 'incomplete', 'exempted'].includes(value)
  }
})

const statusClasses = {
  paid: 'bg-green-200/20 border-green-500 text-green-500',
  pending: 'bg-orange-200/20 border-orange-500 text-orange-500',
  incomplete: 'bg-red-200/20 border-red-500 text-red-500',
  exempted: 'bg-indigo-200/20 border-indigo-500 text-indigo-500'
}

const statusLabels = {
  paid: 'Payé',
  pending: 'En cours',
  incomplete: 'Incomplet',
  exempted: 'Exonéré'
}
</script>