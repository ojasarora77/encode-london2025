'use client'

import { useState, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'react-hot-toast'
import { usePaymentAuth, type PaymentInfo } from '@/lib/hooks/use-payment-auth'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface ChatProps {
  className?: string
}

export function ChatCleanFixed({ className }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [paymentDialog, setPaymentDialog] = useState(false)
  const [pendingPayment, setPendingPayment] = useState<PaymentInfo | null>(null)
  const [pendingMessage, setPendingMessage] = useState<string | null>(null)

  const {
    address,
    isConnecting,
    connectWallet,
    generateSignature
  } = usePaymentAuth()

  const handleSubmit = useCallback(async (message: string) => {
    if (!message.trim() || isLoading) return

    // Add user message immediately
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: message,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat-simple', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          id: 'clean-chat'
        })
      })

      if (response.status === 402) {
        // Payment required
        const amount = response.headers.get('X-402-Amount') || '0.01'
        const currency = response.headers.get('X-402-Currency') || 'USDC'
        const recipient = response.headers.get('X-402-Recipient') || ''
        const network = response.headers.get('X-402-Network') || 'arbitrum-sepolia'

        setPendingPayment({ amount, currency, recipient, network })
        setPendingMessage(message)
        setPaymentDialog(true)
        setIsLoading(false)
        return
      }

      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`)
      }

      // Handle streaming response
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let assistantContent = ''

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value)
          const lines = chunk.split('\n')

          for (const line of lines) {
            if (line.startsWith('data: ') && !line.includes('[DONE]')) {
              try {
                const data = JSON.parse(line.slice(6))
                const content = data.choices?.[0]?.delta?.content
                if (content) {
                  // Check for payment required marker
                  if (content.includes('[PAYMENT_REQUIRED:')) {
                    const paymentMatch = content.match(/\[PAYMENT_REQUIRED:(.+?)\]/)
                    if (paymentMatch) {
                      try {
                        const paymentInfo = JSON.parse(paymentMatch[1])
                        setPendingPayment({
                          amount: paymentInfo.amount || '0.01',
                          currency: paymentInfo.currency || 'USDC',
                          recipient: paymentInfo.recipient || '',
                          network: paymentInfo.network || 'arbitrum-sepolia'
                        })
                        setPendingMessage(message)
                        setPaymentDialog(true)
                        setIsLoading(false)
                        return
                      } catch (e) {
                        console.error('Error parsing payment info:', e)
                      }
                    }
                  } else {
                    assistantContent += content
                  }
                }
              } catch (e) {
                // Ignore parse errors
              }
            }
          }
        }
      }

      // Add assistant message
      if (assistantContent.trim()) {
        const assistantMessage: Message = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: assistantContent.trim(),
          timestamp: new Date()
        }
        setMessages(prev => [...prev, assistantMessage])
      }

    } catch (error) {
      console.error('Chat error:', error)
      toast.error('Failed to send message')
    } finally {
      setIsLoading(false)
    }
  }, [messages, address])

  const handlePayment = useCallback(async () => {
    if (!pendingPayment || !pendingMessage) return

    if (!address) {
      await connectWallet()
      return
    }

    try {
      setIsLoading(true)
      const signature = await generateSignature(pendingPayment)
      
      setPaymentDialog(false)
      setPendingPayment(null)

      // Retry the request with signature
      const response = await fetch('/api/chat-simple', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: [...messages, {
            id: `user-${Date.now()}`,
            role: 'user',
            content: pendingMessage,
            timestamp: new Date()
          }],
          id: 'clean-chat',
          x402Signature: signature
        })
      })

      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`)
      }

      // Handle streaming response
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let assistantContent = ''

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value)
          const lines = chunk.split('\n')

          for (const line of lines) {
            if (line.startsWith('data: ') && !line.includes('[DONE]')) {
              try {
                const data = JSON.parse(line.slice(6))
                const content = data.choices?.[0]?.delta?.content
                if (content) {
                  assistantContent += content
                }
              } catch (e) {
                // Ignore parse errors
              }
            }
          }
        }
      }

      // Add assistant message
      if (assistantContent.trim()) {
        const assistantMessage: Message = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: assistantContent.trim(),
          timestamp: new Date()
        }
        setMessages(prev => [...prev, assistantMessage])
      }

      toast.success('Payment processed!')
    } catch (error) {
      console.error('Payment error:', error)
      toast.error('Payment failed')
    } finally {
      setIsLoading(false)
      setPendingMessage(null)
    }
  }, [pendingPayment, pendingMessage, address, connectWallet, generateSignature, messages])

  return (
    <div className={`${className} flex flex-col h-full`}>
      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-muted-foreground">
            Start a conversation
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}
              >
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  {message.content.split('\n').map((line, idx) => {
                    // Handle headers
                    if (line.startsWith('# ')) {
                      return <h1 key={idx} className="text-lg font-bold text-foreground">{line.slice(2)}</h1>
                    }
                    if (line.startsWith('## ')) {
                      return <h2 key={idx} className="text-base font-semibold text-foreground">{line.slice(3)}</h2>
                    }
                    if (line.startsWith('### ')) {
                      return <h3 key={idx} className="text-sm font-semibold text-foreground">{line.slice(4)}</h3>
                    }
                    
                    // Handle bold text
                    if (line.includes('**') && line.includes('**')) {
                      const parts = line.split('**')
                      return (
                        <p key={idx} className="mb-2">
                          {parts.map((part, partIdx) => 
                            partIdx % 2 === 1 ? <strong key={partIdx}>{part}</strong> : part
                          )}
                        </p>
                      )
                    }
                    
                    // Handle code blocks
                    if (line.startsWith('`') && line.endsWith('`')) {
                      return <code key={idx} className="bg-muted-foreground/10 px-1 py-0.5 rounded text-xs font-mono">{line.slice(1, -1)}</code>
                    }
                    
                    // Handle separators
                    if (line.startsWith('---')) {
                      return <hr key={idx} className="my-3 border-border" />
                    }
                    
                    
                    // Handle emojis and special formatting
                    if (line.includes('🔍') || line.includes('❌') || line.includes('🟢') || line.includes('🟡') || line.includes('🔴')) {
                      return <p key={idx} className="mb-2">{line}</p>
                    }
                    
                    // Handle regular paragraphs
                    if (line.trim()) {
                      return <p key={idx} className="mb-2">{line}</p>
                    }
                    
                    return <br key={idx} />
                  })}
                </div>
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-lg px-4 py-2">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-current rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input - Sticky at bottom */}
      <div className="sticky bottom-0 bg-background border-t p-4 shadow-lg">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleSubmit(input)
          }}
          className="flex space-x-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Send a message..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button type="submit" disabled={isLoading || !input.trim()}>
            Send
          </Button>
        </form>
      </div>

      {/* Payment Dialog */}
      <Dialog open={paymentDialog} onOpenChange={setPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Payment Required</DialogTitle>
            <DialogDescription>
              This search requires a micropayment to execute. Payment will be signed automatically.
            </DialogDescription>
            {address && (
              <div className="mt-2 text-sm">
                <strong>Wallet:</strong>{' '}
                <code className="font-mono text-xs">
                  {address.slice(0, 6)}...{address.slice(-4)}
                </code>
              </div>
            )}
          </DialogHeader>
          {pendingPayment && (
            <div className="space-y-2 rounded-lg bg-muted p-4">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Amount:</span>
                <span className="text-sm">{pendingPayment.amount} {pendingPayment.currency}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">Network:</span>
                <span className="text-sm">{pendingPayment.network}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">Recipient:</span>
                <span className="text-sm font-mono text-xs">
                  {pendingPayment.recipient.slice(0, 6)}...{pendingPayment.recipient.slice(-4)}
                </span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handlePayment} disabled={isLoading}>
              {isLoading ? 'Processing...' : 'Authorize Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
