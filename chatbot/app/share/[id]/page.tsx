import { type Metadata } from 'next'
import { notFound } from 'next/navigation'

import { formatDate } from '@/lib/utils'
import { getSharedChat } from '@/app/actions'
import { ChatList } from '@/components/chat-list'
import { FooterText } from '@/components/footer'

export const runtime = 'edge'
export const preferredRegion = 'home'

interface SharePageProps {
  params: {
    id: string
  }
}

export async function generateMetadata({
  params
}: SharePageProps): Promise<Metadata> {
  return {
    title: 'Chat'
  }
}

export default async function SharePage({ params }: SharePageProps) {
  notFound()
}
