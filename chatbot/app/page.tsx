import { ChatClean } from '@/components/chat-clean'

export const runtime = 'edge'

export default function IndexPage() {
  return (
    <div className="flex flex-col h-screen">
      <ChatClean className="flex-1" />
    </div>
  )
}
