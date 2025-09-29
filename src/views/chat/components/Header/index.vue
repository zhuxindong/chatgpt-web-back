<script lang="ts" setup>
import { computed, nextTick, ref, onMounted, watch } from 'vue'
import { NSelect } from 'naive-ui'
import { HoverButton, SvgIcon } from '@/components/common'
import { useAppStore, useChatStore } from '@/store'
import { fetchModelList } from '@/api'

interface Props {
  usingContext: boolean
  currentModel: string
}

interface Emit {
  (ev: 'export'): void
  (ev: 'handleClear'): void
  (ev: 'update:model', model: string): void
}

const props = defineProps<Props>()

const emit = defineEmits<Emit>()

const appStore = useAppStore()
const chatStore = useChatStore()

const collapsed = computed(() => appStore.siderCollapsed)
const currentChatHistory = computed(() => chatStore.getChatHistoryByCurrentActive)

// 模型选择相关
const modelOptions = ref<Array<{ label: string; value: string }>>([])
const selectedModel = ref(props.currentModel)

// 监听currentModel的变化
watch(() => props.currentModel, (newModel: string) => {
  selectedModel.value = newModel
})

onMounted(async () => {
  try {
    const response = await fetchModelList()
    if (response.data.models) {
      modelOptions.value = response.data.models.map((model: string) => ({
        label: model,
        value: model,
      }))
      // 如果当前选中的模型在列表中，保持选中状态
      // 否则默认选中第一个模型
      if (!selectedModel.value && modelOptions.value.length > 0) {
        selectedModel.value = modelOptions.value[0].value
        emit('update:model', selectedModel.value)
      }
    }
  } catch (error) {
    console.error('Failed to fetch model list:', error)
  }
})

function handleUpdateCollapsed() {
  appStore.setSiderCollapsed(!collapsed.value)
}

function onScrollToTop() {
  const scrollRef = document.querySelector('#scrollRef')
  if (scrollRef)
    nextTick(() => scrollRef.scrollTop = 0)
}

function handleExport() {
  emit('export')
}

function handleClear() {
  emit('handleClear')
}

function handleModelChange(model: string) {
  selectedModel.value = model
  emit('update:model', model)
}
</script>

<template>
  <header
    class="sticky top-0 left-0 right-0 z-30 border-b dark:border-neutral-800 bg-white/80 dark:bg-black/20 backdrop-blur"
  >
    <div class="relative flex items-center justify-between min-w-0 overflow-hidden h-14">
      <div class="flex items-center">
        <button
          class="flex items-center justify-center w-11 h-11"
          @click="handleUpdateCollapsed"
        >
          <SvgIcon v-if="collapsed" class="text-2xl" icon="ri:align-justify" />
          <SvgIcon v-else class="text-2xl" icon="ri:align-right" />
        </button>
        <NSelect
          v-if="modelOptions.length > 0"
          v-model:value="selectedModel"
          :options="modelOptions"
          size="small"
          class="ml-2 w-40"
          @update:value="handleModelChange"
        />
      </div>
      <h1
        class="flex-1 px-4 pr-6 overflow-hidden cursor-pointer select-none text-ellipsis whitespace-nowrap"
        @dblclick="onScrollToTop"
      >
        {{ currentChatHistory?.title ?? '' }}
      </h1>
      <div class="flex items-center space-x-2">
        <HoverButton @click="handleExport">
          <span class="text-xl text-[#4f555e] dark:text-white">
            <SvgIcon icon="ri:download-2-line" />
          </span>
        </HoverButton>
        <HoverButton @click="handleClear">
          <span class="text-xl text-[#4f555e] dark:text-white">
            <SvgIcon icon="ri:delete-bin-line" />
          </span>
        </HoverButton>
      </div>
    </div>
  </header>
</template>
