
import { ChatCleanFixed } from '@/components/chat-clean-fixed'

export const runtime = 'edge'

export default function IndexPage() {
  return (
    <div className="flex flex-col h-screen">
      <ChatCleanFixed className="flex-1" />
    </div>
  )
}
