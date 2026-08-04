<script setup>
import DefaultTheme from 'vitepress/theme-without-fonts'
import MobileSearchButton from './MobileSearchButton.vue'
import ThemeBehaviorBridge from './ThemeBehaviorBridge.vue'

const DefaultLayout = DefaultTheme.Layout
</script>

<template>
  <DefaultLayout>
    <template #nav-bar-content-after>
      <MobileSearchButton />
    </template>
    <template #layout-bottom>
      <ThemeBehaviorBridge />
    </template>
  </DefaultLayout>
</template>
