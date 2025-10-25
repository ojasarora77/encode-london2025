import { getChats, removeChat, shareChat } from '@/app/actions'
import { SidebarActions } from '@/components/sidebar-actions'
import { SidebarItem } from '@/components/sidebar-item'

export interface SidebarListProps {
  userId?: string
}

export async function SidebarList({ userId }: SidebarListProps) {
  return (
    <div className="flex-1 overflow-auto">
      <div className="p-8 text-center">
        <p className="text-sm text-muted-foreground">No chat history</p>
      </div>
    </div>
  )
}
