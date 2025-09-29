import { ss } from '@/utils/storage'

const LOCAL_NAME = 'promptStore'

export interface PromptItem {
  key: string
  value: string
}

export type PromptList = PromptItem[]

export interface PromptStore {
  promptList: PromptList
}

export function getLocalPromptList(): PromptStore {
  const promptStore: PromptStore | undefined = ss.get(LOCAL_NAME)
  return promptStore ?? { promptList: [] }
}

export function setLocalPromptList(promptStore: PromptStore): void {
  ss.set(LOCAL_NAME, promptStore)
}
