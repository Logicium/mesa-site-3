<script setup lang="ts">
import MealOrderStatus from '@apotome/archetype-shared/components/commerce/MealOrderStatus.vue'

defineProps<{ id: string }>()
</script>

<template>
  <MealOrderStatus :order-id="id" menu-path="/menu" />
</template>
