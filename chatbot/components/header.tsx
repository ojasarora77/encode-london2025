import * as React from 'react'
import Link from 'next/link'

import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'
import {
  IconGitHub,
  IconNextChat
} from '@/components/ui/icons'
import { ThemeToggle } from '@/components/theme-toggle'

export function Header() {
  return (
    <header className="sticky top-0 z-50 flex h-16 w-full shrink-0 items-center justify-between border-b bg-gradient-to-b from-background/10 via-background/50 to-background/80 px-4 backdrop-blur-xl">
      <div className="flex items-center">
        <Link href="/" rel="nofollow">
          <IconNextChat className="mr-2 h-6 w-6 dark:hidden" inverted />
          <IconNextChat className="mr-2 hidden h-6 w-6 dark:block" />
        </Link>
        <span className="ml-2 text-lg font-semibold">Venice AI Chat</span>
      </div>
      <div className="flex items-center justify-end space-x-2">
        <ThemeToggle />
        <a
          target="_blank"
          href="https://github.com/ojasarora77/encode-london2025"
          rel="noopener noreferrer"
          className={cn(buttonVariants({ variant: 'outline' }))}
        >
          <IconGitHub />
          <span className="ml-2 hidden md:flex">GitHub</span>
        </a>
      </div>
    </header>
  )
}
