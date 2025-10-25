'use client'

import { useChat, type Message } from 'ai/react'

import { cn } from '@/lib/utils'
import { ChatList } from '@/components/chat-list'
import { ChatPanel } from '@/components/chat-panel'
import { EmptyScreen } from '@/components/empty-screen'
import { ChatScrollAnchor } from '@/components/chat-scroll-anchor'
import { useLocalStorage } from '@/lib/hooks/use-local-storage'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { useState, useCallback, useRef } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { toast } from 'react-hot-toast'
import { usePaymentAuth, type PaymentInfo } from '@/lib/hooks/use-payment-auth'

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
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)
  const isProcessingPaymentRef = useRef(false)
  const hasProcessedPaymentRef = useRef(false)

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
      api: '/api/chat-simple',
      body: {
        id,
        previewToken
      },
      onResponse(response: Response) {
        console.log('🔔 Chat received response:', response.status)
        console.log('   Response headers:', Object.fromEntries(response.headers.entries()))
        console.log('   Is processing payment:', isProcessingPayment)
        
        if (response.status === 401) {
          toast.error(response.statusText)
        }
        // Handle 402 Payment Required (but not if we're already processing payment or have processed payment)
        if (response.status === 402 && !isProcessingPayment && !isProcessingPaymentRef.current && !hasProcessedPaymentRef.current) {
          console.log('💳 402 Payment Required detected')
          const paymentHeader = response.headers.get('X-402-Payment-Required')
          console.log('   Payment header:', paymentHeader)
          
          if (paymentHeader) {
            // Extract payment info from headers
            const amount = response.headers.get('X-402-Amount') || '0.01'
            const currency = response.headers.get('X-402-Currency') || 'USDC'
            const recipient = response.headers.get('X-402-Recipient') || ''
            const network = response.headers.get('X-402-Network') || 'arbitrum-sepolia'
            
            console.log('   Payment info:', { amount, currency, recipient, network })
            
            // Store the message content that triggered the payment
            const lastRequestMessage = messages[messages.length - 1]?.content || input
            console.log('   Storing message for retry:', lastRequestMessage)
            setPendingMessageContent(lastRequestMessage)
            
            setPendingPayment({
              amount,
              currency,
              recipient,
              network
            })
            setPaymentDialog(true)
            console.log('   Payment dialog opened')
          }
        } else if (response.status === 402) {
          // Completely suppress 402 errors - only show payment dialog
          console.log('💳 402 received - suppressing error, payment dialog will handle')
        } else if (response.status !== 200) {
          console.log('❌ Unexpected response status:', response.status)
          toast.error(`Unexpected response: ${response.status}`)
        }
      },
      onError(error: Error) {
        console.log('❌ useChat error:', error)
        // Suppress 402 payment errors - only show for other errors
        if (!error.message.includes('402') && !error.message.includes('Payment required')) {
          toast.error('Chat error: ' + error.message)
        } else {
          console.log('💳 Suppressing 402 payment error - payment dialog will handle')
        }
      }
    })

  const handlePayment = useCallback(async () => {
    if (!pendingPayment || !pendingMessageContent) {
      console.error('Missing payment info or message content')
      return
    }

    if (!address) {
      console.log('🔗 Connecting wallet...')
      await connectWallet()
      return
    }

    try {
      console.log('💰 Starting payment flow')
      console.log('   Payment info:', pendingPayment)
      console.log('   Message to retry:', pendingMessageContent)
      
      // Store payment info before clearing state
      const paymentInfo = pendingPayment
      
      // Set processing state to prevent duplicate requests
      setIsProcessingPayment(true)
      isProcessingPaymentRef.current = true
      hasProcessedPaymentRef.current = true
      
      // Stop any ongoing useChat requests immediately
      stop()
      
      // Clear pending payment immediately to disable useChat
      setPendingPayment(null)
      
      // Auto-sign with local private key (no user interaction needed)
      toast.loading('Signing payment authorization...', { id: 'payment-sign' })
      const signature = await generateSignature(paymentInfo)
      console.log('✍️ Signature generated:', signature.slice(0, 20) + '...')
      toast.success('Payment signed!', { id: 'payment-sign' })

      // Close dialog
      setPaymentDialog(false)

      console.log('🔄 Retrying request with signature')
      console.log('   Signature to send:', signature.slice(0, 30) + '...')
      toast.loading('Processing payment...', { id: 'payment-process' })
      
      // Make a direct API call with signature
      console.log('🔄 Making direct API call with signature')
      const response = await fetch('/api/chat-simple', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: [
            ...messages,
            { role: 'user', content: pendingMessageContent || '' }
          ],
          id,
          previewToken,
          x402Signature: signature
        })
      })
      
      if (response.ok) {
        toast.success('Payment processed!', { id: 'payment-process' })
        console.log('✅ Payment processed successfully')
        
        // Clear the pending state
        setPendingMessageContent(null)
        
        // Add the user message first
        await append({ 
          role: 'user', 
          content: pendingMessageContent || '',
          id: `user-${Date.now()}`
        })
        
        // Read the streaming response and add assistant message
        const reader = response.body?.getReader()
        const decoder = new TextDecoder()
        let accumulatedText = ''
        
        if (reader) {
          console.log('📖 Reading streaming response...')
          
          try {
            while (true) {
              const { done, value } = await reader.read()
              if (done) {
                console.log('✅ Stream complete')
                break
              }
              
              const chunk = decoder.decode(value)
              const lines = chunk.split('\n')
              
              for (const line of lines) {
                if (line.startsWith('data: ') && !line.includes('[DONE]')) {
                  try {
                    const data = JSON.parse(line.slice(6))
                    const content = data.choices?.[0]?.delta?.content
                    if (content) {
                      accumulatedText += content
                    }
                  } catch (e) {
                    // Ignore parse errors
                  }
                }
              }
            }
            
            console.log('📝 Final response length:', accumulatedText.length)
            
            // Add the assistant's response to the conversation
            if (accumulatedText.trim()) {
              await append({ 
                role: 'assistant', 
                content: accumulatedText,
                id: `assistant-${Date.now()}`
              })
            }
            
          } catch (streamError) {
            console.error('❌ Error reading stream:', streamError)
            // Fallback: just reload to get the conversation
            reload()
          }
        } else {
          // No stream, just reload
          reload()
        }
      } else {
        toast.error('Payment failed. Please try again.', { id: 'payment-process' })
        console.error('❌ Payment failed:', response.status)
      }
      
      // Clear processing state
      setIsProcessingPayment(false)
      isProcessingPaymentRef.current = false
    } catch (error) {
      console.error('❌ Payment error:', error)
      // Suppress 402 payment errors during payment flow
      if (error instanceof Error && (error.message.includes('402') || error.message.includes('Payment required'))) {
        console.log('💳 Suppressing 402 error during payment flow')
        toast.error('Payment processing failed. Please try again.')
      } else {
        toast.error(error instanceof Error ? error.message : 'Payment failed')
      }
      setPaymentDialog(false)
      setPendingPayment(null)
      setPendingMessageContent(null)
      setIsProcessingPayment(false)
      isProcessingPaymentRef.current = false
    }
  }, [pendingPayment, pendingMessageContent, address, connectWallet, generateSignature, messages, id, previewToken, append, reload])

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
