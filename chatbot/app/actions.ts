'use server'

// No database actions needed for Venice chatbot
// All chat state is client-side only
export async function getChats() {
  return []
}

export async function getChat(id: string) {
  return null
}

export async function removeChat({ id, path }: { id: string; path: string }) {
  return { error: 'Not implemented' }
}

export async function clearChats() {
  return { error: 'Not implemented' }
}

export async function getSharedChat(id: string) {
  return null
}

export async function shareChat(chat: any) {
  return { error: 'Not implemented' }
}
