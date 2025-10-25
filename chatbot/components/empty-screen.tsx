import { UseChatHelpers } from 'ai/react'

export function EmptyScreen({ setInput }: Pick<UseChatHelpers, 'setInput'>) {
  return (
    <div className="mx-auto max-w-2xl px-4">
      <div className="rounded-lg border bg-background p-8 text-center">
        <h1 className="mb-2 text-lg font-semibold">
          Start a conversation
        </h1>
        <p className="text-muted-foreground">
          Ask me anything or search for AI agents to help with your tasks.
        </p>
      </div>
    </div>
  )
}
