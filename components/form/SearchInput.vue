<script setup>
import Search from "~/components/Icons/Search.vue";
</script>

<template>
  <div class="relative min-w-fit">
    <Search
        class="absolute left-5 top-1/2 transform -translate-y-1/2 size-6  text-placeholder"
    />
    <input
        type="text"
        placeholder="Rechercher"
        class="w-full placeholder:text-placeholder border focus:ring-1 focus:ring-primary focus:outline-none border-input-stroke bg-white rounded-10 pl-14 py-3"
    />
  </div>
</template>