<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import MarkdownIt from 'markdown-it'
import { SvgIcon } from '@/components/common'

const props = defineProps<{
  thinking: string
}>()

const mdi = new MarkdownIt({
  html: true,
  linkify: true,
})

const renderedThinking = computed(() => mdi.render(props.thinking))
const thinkingContentRef = ref<HTMLDivElement | null>(null)
const isOpen = ref(false) // Default to collapsed

watch(() => props.thinking, async () => {
  await nextTick()
  if (thinkingContentRef.value) {
    thinkingContentRef.value.scrollTop = thinkingContentRef.value.scrollHeight
  }
})
</script>

<template>
  <div class="thinking-container">
    <div class="summary-header" @click="isOpen = !isOpen">
      <SvgIcon icon="ri:lightbulb-flash-line" />
      <span>Thinking...</span>
      <SvgIcon
        class="toggle-icon"
        :class="{ 'is-open': isOpen }"
        icon="ri:arrow-down-s-line"
      />
    </div>
    <div
      ref="thinkingContentRef"
      class="thinking-box"
      :class="{ 'is-open': isOpen }"
    >
      <div class="thinking-content markdown-body" v-html="renderedThinking" />
    </div>
  </div>
</template>

<style scoped>
.thinking-container {
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  margin-bottom: 0.5rem;
  background-color: #f9fafb;
}

.summary-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  cursor: pointer;
  padding: 0.75rem;
}

.toggle-icon {
  margin-left: auto;
  transition: transform 0.2s;
}

.toggle-icon.is-open {
  transform: rotate(180deg);
}

.thinking-box {
  max-height: 100px; /* Collapsed by default, showing ~4-5 lines */
  overflow: hidden;
  transition: max-height 0.3s ease-in-out;
  padding: 0 0.75rem;
}

.thinking-box.is-open {
  max-height: 1000px; /* Expanded */
  overflow-y: auto;
  padding-bottom: 0.75rem;
}

.thinking-box:not(.is-open) {
  overflow-y: scroll; /* Always show scrollbar in collapsed mode */
}
</style>
