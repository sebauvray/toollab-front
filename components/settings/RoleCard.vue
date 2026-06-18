<script setup>
import { defineProps, defineEmits } from 'vue'

const props = defineProps({
  role: {
    type: Object,
    required: true
  },
  selected: {
    type: Boolean,
    default: false
  },
  indicator: {
    type: String,
    default: 'radio', // 'radio' (mono-sélection) | 'check' (multi-sélection)
    validator: value => ['radio', 'check'].includes(value)
  },
  disabled: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['select'])

const handleClick = () => {
  if (props.disabled) return
  emit('select', props.role.value)
}
</script>

<template>
  <button
      type="button"
      :disabled="disabled"
      @click="handleClick"
      :class="[
        'group relative text-left rounded-2xl border p-4 transition-all duration-150 focus:outline-none ring-1 ring-transparent',
        selected
          ? `border-transparent ${role.ringActive} ring-2 shadow-sm`
          : 'border-[#E6EFF5] hover:border-gray-300 hover:bg-gray-50/60',
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      ]"
  >
    <div class="flex items-start gap-3">
      <div :class="['shrink-0 size-9 rounded-xl flex items-center justify-center ring-1', role.iconWrap]">
        <component :is="role.icon" class="size-5" />
      </div>
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2">
          <span class="text-sm font-semibold text-default font-montserrat truncate">{{ role.label }}</span>
          <span :class="['inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium ring-1', role.chipClass]">
            <span class="h-1 w-1 rounded-full" :class="role.dotClass"></span>
            {{ role.shortLabel }}
          </span>
        </div>
        <p class="text-[11px] text-placeholder mt-0.5 leading-snug">{{ role.tagline }}</p>
      </div>

      <!-- Indicateur de sélection : pastille ronde (radio) ou case carrée (check) -->
      <div
          :class="[
            'shrink-0 size-4 border flex items-center justify-center transition-colors mt-0.5',
            indicator === 'check' ? 'rounded' : 'rounded-full',
            selected
              ? `${role.dotClass} border-transparent`
              : 'border-gray-300 bg-white'
          ]"
      >
        <svg v-if="selected" class="size-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="4">
          <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
    </div>

    <ul class="mt-3 pl-12 space-y-1">
      <li v-for="perm in role.permissions" :key="perm" class="flex items-start gap-1.5 text-[11px] text-default/80 leading-snug">
        <svg class="size-3 mt-0.5 shrink-0" :class="role.checkClass" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
          <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        <span>{{ perm }}</span>
      </li>
    </ul>
  </button>
</template>
