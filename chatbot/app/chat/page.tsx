import { ChatCleanFixed } from '@/components/chat-clean-fixed'

// Removed: export const runtime = 'edge' - using Node.js runtime instead

export default function ChatPage() {
  return (
    <div className="flex flex-col h-full">
      <ChatCleanFixed className="flex-1 min-h-0" />
    </div>
  )
}
