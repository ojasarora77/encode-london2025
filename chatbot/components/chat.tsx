'use client'

import { useChat, type Message } from 'ai/react'

import { cn } from '@/lib/utils'
import { ChatList } from '@/components/chat-list'
import { ChatPanel } from '@/components/chat-panel'
import { EmptyScreen } from '@/components/empty-screen'
import { ChatScrollAnchor } from '@/components/chat-scroll-anchor'
import { useLocalStorage } from '@/lib/hooks/use-local-storage'
import { usePaymentAuth, type PaymentInfo } from '@/lib/hooks/use-payment-auth'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { useState, useCallback } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { toast } from 'react-hot-toast'

const IS_PREVIEW = process.env.VERCEL_ENV === 'preview'
export interface ChatProps extends React.ComponentProps<'div'> {
  initialMessages?: Message[]
  id?: string
}

export function Chat({ id, initialMessages, className }: ChatProps) {
  const [previewToken, setPreviewToken] = useLocalStorage<string | null>(
    'ai-token',
    null
  )
  const [previewTokenDialog, setPreviewTokenDialog] = useState(IS_PREVIEW)
  const [previewTokenInput, setPreviewTokenInput] = useState(previewToken ?? '')
  const [paymentDialog, setPaymentDialog] = useState(false)
  const [pendingPayment, setPendingPayment] = useState<PaymentInfo | null>(null)
  const [pendingMessageContent, setPendingMessageContent] = useState<string | null>(null)

  const {
    address,
    isConnecting,
    connectWallet,
    generateSignature
  } = usePaymentAuth()

  const { messages, append, reload, stop, isLoading, input, setInput } =
    useChat({
      initialMessages,
      id,
      body: {
        id,
        previewToken
      },
      onResponse(response: Response) {
        console.log('🔔 Chat received response:', response.status)
        
        if (response.status === 401) {
          toast.error(response.statusText)
        }
        // Handle 402 Payment Required - check headers instead of reading body
        if (response.status === 402) {
          console.log('💳 402 Payment Required detected')
          const paymentHeader = response.headers.get('X-402-Payment-Required')
          console.log('   Payment header:', paymentHeader)
          
          if (paymentHeader) {
            // Extract payment info from headers
            const amount = response.headers.get('X-402-Amount') || '0.01'
            const currency = response.headers.get('X-402-Currency') || 'USDC'
            const recipient = response.headers.get('X-402-Recipient') || ''
            
            console.log('   Payment info:', { amount, currency, recipient })
            
            // Store the message content that triggered the payment
            // Get it from the last message in the request (which won't be in messages array yet)
            const lastRequestMessage = messages[messages.length - 1]?.content || input
            console.log('   Storing message for retry:', lastRequestMessage)
            setPendingMessageContent(lastRequestMessage)
            
            setPendingPayment({
              amount,
              currency,
              recipient,
              network: 'arbitrum-sepolia'
            })
            setPaymentDialog(true)
            console.log('   Payment dialog opened')
          } else {
            console.warn('   No X-402-Payment-Required header found')
          }
        }
      },
      onError(error: Error) {
        console.log('❌ useChat error:', error)
        // Suppress 402 errors since we handle them manually
        if (error.message && error.message.includes('paymentRequired')) {
          console.log('   (Suppressing 402 error - handled by payment dialog)')
          return
        }
        toast.error('Chat error: ' + error.message)
      }
    })

  const handlePayment = useCallback(async () => {
    if (!pendingPayment || !pendingMessageContent) {
      console.error('Missing payment info or message content')
      return
    }

    try {
      console.log('💰 Starting payment flow')
      console.log('   Payment info:', pendingPayment)
      console.log('   Message to retry:', pendingMessageContent)
      
      // Auto-sign with local private key (no user interaction needed)
      toast.loading('Signing payment authorization...', { id: 'payment-sign' })
      const signature = await generateSignature(pendingPayment)
      console.log('✍️ Signature generated:', signature.slice(0, 20) + '...')
      toast.success('Payment signed!', { id: 'payment-sign' })

      // Close dialog
      setPaymentDialog(false)
      setPendingPayment(null)

      // Create the message to send
      const messagesToSend = [
        ...messages,
        { role: 'user' as const, content: pendingMessageContent }
      ]
      
      console.log('🔄 Retrying request with signature')
      console.log('   Total messages:', messagesToSend.length)
      console.log('   Signature to send:', signature.slice(0, 30) + '...')
      toast.loading('Processing payment...', { id: 'payment-process' })
      
      // Directly call the API with signature
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: messagesToSend,
          id,
          previewToken,
          x402Signature: signature
        })
      })
      
      console.log('📡 Response status:', response.status)
      
      if (response.ok) {
        toast.success('Payment processed!', { id: 'payment-process' })
        console.log('✅ Payment processed, reloading chat')
        // Clear the pending message
        setPendingMessageContent(null)
        // Reload the chat to show the new response
        reload()
      } else if (response.status === 402) {
        toast.error('Payment failed. Please try again.', { id: 'payment-process' })
        console.error('❌ Still getting 402 after payment')
      } else {
        const errorText = await response.text()
        toast.error('Request failed', { id: 'payment-process' })
        console.error('❌ Request failed:', response.status, errorText)
      }
    } catch (error) {
      console.error('❌ Payment error:', error)
      toast.error(error instanceof Error ? error.message : 'Payment failed')
      setPaymentDialog(false)
      setPendingPayment(null)
      setPendingMessageContent(null)
    }
  }, [pendingPayment, pendingMessageContent, generateSignature, messages, id, previewToken, reload])

  return (
    <>
      <div className={cn('pb-[200px] pt-4 md:pt-10', className)}>
        {messages.length ? (
          <>
            <ChatList messages={messages} />
            <ChatScrollAnchor trackVisibility={isLoading} />
          </>
        ) : (
          <EmptyScreen setInput={setInput} />
        )}
      </div>
      <ChatPanel
        id={id}
        isLoading={isLoading}
        stop={stop}
        append={append}
        reload={reload}
        messages={messages}
        input={input}
        setInput={setInput}
      />

      {/* Payment Dialog */}
      <Dialog open={paymentDialog} onOpenChange={setPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Payment Required</DialogTitle>
            <DialogDescription>
              This search requires a micropayment to execute. Payment will be signed automatically.
              {address && (
                <div className="mt-2 text-sm">
                  <strong>Wallet:</strong>{' '}
                  <code className="font-mono text-xs">
                    {address.slice(0, 6)}...{address.slice(-4)}
                  </code>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          {pendingPayment && (
            <div className="space-y-2 rounded-lg bg-muted p-4">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Amount:</span>
                <span className="font-mono text-sm">
                  {pendingPayment.amount} {pendingPayment.currency}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">Network:</span>
                <span className="text-sm">Arbitrum Sepolia</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">Recipient:</span>
                <span className="font-mono text-xs">
                  {pendingPayment.recipient.slice(0, 6)}...
                  {pendingPayment.recipient.slice(-4)}
                </span>
              </div>
            </div>
          )}
          <DialogFooter className="items-center gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setPaymentDialog(false)
                setPendingPayment(null)
              }}
            >
              Cancel
            </Button>
            <Button onClick={handlePayment} disabled={isConnecting}>
              {isConnecting ? 'Signing...' : 'Authorize Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Token Dialog */}
      <Dialog open={previewTokenDialog} onOpenChange={setPreviewTokenDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enter your OpenAI Key</DialogTitle>
            <DialogDescription>
              If you have not obtained your OpenAI API key, you can do so by{' '}
              <a
                href="https://platform.openai.com/signup/"
                className="underline"
              >
                signing up
              </a>{' '}
              on the OpenAI website. This is only necessary for preview
              environments so that the open source community can test the app.
              The token will be saved to your browser&apos;s local storage under
              the name <code className="font-mono">ai-token</code>.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={previewTokenInput}
            placeholder="OpenAI API key"
            onChange={e => setPreviewTokenInput(e.target.value)}
          />
          <DialogFooter className="items-center">
            <Button
              onClick={() => {
                setPreviewToken(previewTokenInput)
                setPreviewTokenDialog(false)
              }}
            >
              Save Token
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
