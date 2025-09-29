import { useChatStore } from '@/store'

export function useChat() {
  const chatStore = useChatStore()

  const getChatByUuidAndIndex = (uuid: number, index: number) => {
    return chatStore.getChatByUuidAndIndex(uuid, index)
  }

  const addChat = (uuid: number, chat: Chat.Chat) => {
    chatStore.addChatByUuid(uuid, chat)
  }

  const updateChat = (uuid: number, index: number, chat: Chat.Chat) => {
    chatStore.updateChatByUuid(uuid, index, chat)
  }

  const updateChatSome = (uuid: number, index: number, chat: Partial<Chat.Chat>) => {
    chatStore.updateChatSomeByUuid(uuid, index, chat)
  }

  // Method to append text to the last message
  const appendText = (uuid: number, index: number, text: string) => {
    const existingChat = chatStore.getChatByUuidAndIndex(uuid, index)
    if (existingChat) {
      const updatedText = existingChat.text + text
      chatStore.updateChatSomeByUuid(uuid, index, { text: updatedText })
    }
  }

  return {
    addChat,
    updateChat,
    updateChatSome,
    getChatByUuidAndIndex,
    appendText, // Expose the new method
  }
}
