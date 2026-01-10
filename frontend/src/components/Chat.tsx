import { useState, useEffect, useRef } from 'react'
import { WS_URL } from '../config'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

// Strip markdown formatting from text
const stripMarkdown = (text: string): string => {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1') // Remove **bold**
    .replace(/\*(.+?)\*/g, '$1') // Remove *italic*
    .replace(/`(.+?)`/g, '$1') // Remove `code`
    .replace(/^#+\s*/gm, '') // Remove # headers
    .replace(/\[(.+?)\]\(.+?\)/g, '$1') // Remove [links](url)
}

// Terminal color palette
const colors = {
  bg: '#0a0a0a',
  green: '#33ff33',
  greenDim: 'rgba(51,255,51,0.5)',
  greenFaint: 'rgba(51,255,51,0.3)',
  greenGhost: 'rgba(51,255,51,0.15)',
  cyan: '#00ffff',
  cyanDim: 'rgba(0,255,255,0.5)',
  yellow: '#ffcc00',
  red: '#ff3333',
  gray: '#666666',
}

// Node status data
const NODES = [
  { name: 'bastion', ip: '10.0.2.10', role: 'LOCAL', status: 'READY' },
  { name: 'k3s-cp-1', ip: '10.0.1.10', role: 'CP', status: 'READY' },
  { name: 'k3s-cp-2', ip: '10.0.1.11', role: 'CP', status: 'READY' },
  { name: 'k3s-cp-3', ip: '10.0.1.13', role: 'CP', status: 'READY' },
  { name: 'wt-worker', ip: '10.0.1.12', role: 'WORKER', status: 'READY' },
]

export function Chat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isConnected, setIsConnected] = useState(false)
  const [isThinking, setIsThinking] = useState(false)
  const [currentResponse, setCurrentResponse] = useState('')
  const [currentTime, setCurrentTime] = useState(new Date())
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [commandHistory, setCommandHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)

  const wsRef = useRef<WebSocket | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const currentResponseRef = useRef('')

  // Copy to clipboard
  const copyToClipboard = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedIndex(index)
      setTimeout(() => setCopiedIndex(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  // Clear conversation
  const clearConversation = () => {
    setMessages([])
    setCurrentResponse('')
    inputRef.current?.focus()
  }

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Keep ref in sync
  useEffect(() => {
    currentResponseRef.current = currentResponse
  }, [currentResponse])

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, currentResponse])

  // WebSocket connection
  useEffect(() => {
    const connect = () => {
      const ws = new WebSocket(`${WS_URL}/chat/ws`)
      wsRef.current = ws

      ws.onopen = () => setIsConnected(true)

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data)

        switch (data.type) {
          case 'connected':
            if (data.history?.length > 0) {
              setMessages(data.history)
            }
            break

          case 'assistant_start':
            setIsThinking(true)
            setCurrentResponse('')
            currentResponseRef.current = ''
            break

          case 'assistant_chunk':
            setCurrentResponse((prev) => {
              const newVal = prev + data.content + '\n'
              currentResponseRef.current = newVal
              return newVal
            })
            break

          case 'assistant_done':
            setIsThinking(false)
            const finalResponse = currentResponseRef.current
            if (finalResponse) {
              setMessages((prev) => [
                ...prev,
                { role: 'assistant', content: finalResponse.trim(), timestamp: data.timestamp },
              ])
            }
            setCurrentResponse('')
            currentResponseRef.current = ''
            break

          case 'error':
            setIsThinking(false)
            setMessages((prev) => [
              ...prev,
              { role: 'assistant', content: `[ERROR] ${data.content}`, timestamp: data.timestamp },
            ])
            setCurrentResponse('')
            break
        }
      }

      ws.onclose = () => {
        setIsConnected(false)
        setTimeout(connect, 3000)
      }
    }

    connect()
    return () => wsRef.current?.close()
  }, [])

  const sendMessage = () => {
    if (!input.trim() || !wsRef.current || !isConnected || isThinking) return

    const message = input.trim()
    setInput('')
    // Add to command history
    setCommandHistory((prev) => [...prev, message])
    setHistoryIndex(-1)
    setMessages((prev) => [
      ...prev,
      { role: 'user', content: message, timestamp: new Date().toISOString() },
    ])
    wsRef.current.send(JSON.stringify({ type: 'message', content: message }))
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      sendMessage()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (commandHistory.length > 0) {
        const newIndex = historyIndex === -1 ? commandHistory.length - 1 : Math.max(0, historyIndex - 1)
        setHistoryIndex(newIndex)
        setInput(commandHistory[newIndex])
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (historyIndex !== -1) {
        const newIndex = historyIndex + 1
        if (newIndex >= commandHistory.length) {
          setHistoryIndex(-1)
          setInput('')
        } else {
          setHistoryIndex(newIndex)
          setInput(commandHistory[newIndex])
        }
      }
    }
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour12: false })
  }

  const formatTimestamp = (iso: string) => {
    return new Date(iso).toLocaleTimeString('en-US', { hour12: false })
  }

  return (
    <div
      style={{
        height: '100dvh',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: colors.bg,
        fontFamily: '"SF Mono", "Fira Code", "Consolas", monospace',
        color: colors.green,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Scanlines overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: `repeating-linear-gradient(
            0deg,
            rgba(0,0,0,0.1) 0px,
            rgba(0,0,0,0.1) 1px,
            transparent 1px,
            transparent 2px
          )`,
          zIndex: 100,
        }}
      />

      {/* Header */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 16px',
          borderBottom: `1px solid ${colors.greenFaint}`,
          backgroundColor: 'rgba(0,0,0,0.5)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px', fontWeight: 'bold' }}>WARDEN</span>
          <span style={{ color: colors.greenDim, fontSize: '12px' }}>v1.0.0</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px' }}>
          <span
            className={isConnected ? 'connected-status' : ''}
            style={{ color: isConnected ? colors.green : colors.red }}
          >
            {isConnected ? 'CONNECTED' : 'DISCONNECTED'}
          </span>
          <span style={{ color: colors.greenDim }}>{formatTime(currentTime)}</span>
        </div>
      </header>

      {/* Node status bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 16px',
          borderBottom: `1px solid ${colors.greenGhost}`,
          fontSize: '10px',
          color: colors.greenDim,
          overflowX: 'auto',
        }}
      >
        <span style={{ color: colors.green, marginRight: '8px', whiteSpace: 'nowrap' }}>[ NODES ]</span>
        {NODES.map((node, i) => (
          <div
            key={node.name}
            title={`${node.name} - ${node.ip}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 8px',
              border: `1px solid ${node.role === 'LOCAL' ? colors.cyanDim : colors.greenGhost}`,
              backgroundColor: node.role === 'LOCAL' ? 'rgba(0,255,255,0.05)' : 'transparent',
              whiteSpace: 'nowrap',
            }}
          >
            <span
              className={node.status === 'READY' ? `node-dot node-dot-${i}` : ''}
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: node.status === 'READY' ? colors.green : colors.red,
              }}
            />
            <span style={{ color: node.role === 'LOCAL' ? colors.cyan : colors.greenDim }}>
              {node.name}
            </span>
            <span
              style={{
                color: colors.bg,
                backgroundColor: node.role === 'LOCAL' ? colors.cyan : node.role === 'CP' ? colors.green : colors.yellow,
                padding: '0 4px',
                fontSize: '8px',
                fontWeight: 'bold',
              }}
            >
              {node.role}
            </span>
          </div>
        ))}
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px',
        }}
      >
        {messages.length === 0 && !isThinking && (
          <div
            style={{
              textAlign: 'center',
              padding: '48px 16px',
              color: colors.greenDim,
            }}
          >
            <pre
              className="warden-logo"
              style={{
                fontSize: '10px',
                lineHeight: 1.2,
                marginBottom: '24px',
                color: colors.greenFaint,
              }}
            >
              {`
    ██╗    ██╗ █████╗ ██████╗ ██████╗ ███████╗███╗   ██╗
    ██║    ██║██╔══██╗██╔══██╗██╔══██╗██╔════╝████╗  ██║
    ██║ █╗ ██║███████║██████╔╝██║  ██║█████╗  ██╔██╗ ██║
    ██║███╗██║██╔══██║██╔══██╗██║  ██║██╔══╝  ██║╚██╗██║
    ╚███╔███╔╝██║  ██║██║  ██║██████╔╝███████╗██║ ╚████║
     ╚══╝╚══╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝ ╚══════╝╚═╝  ╚═══╝
              `}
            </pre>
            <p style={{ marginBottom: '8px' }}>HOMELAB COMMAND INTERFACE</p>
            <p style={{ fontSize: '11px', color: colors.gray }}>
              SSH access to K3s cluster and Proxmox nodes via bastion
            </p>
            <div
              style={{
                marginTop: '24px',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px',
                justifyContent: 'center',
              }}
            >
              {[
                'Check K3s cluster status',
                "What's on proxmox-1?",
                'Show disk usage',
                'List pods',
              ].map((cmd) => (
                <button
                  key={cmd}
                  className="quick-btn"
                  onClick={() => {
                    setInput(cmd)
                    inputRef.current?.focus()
                  }}
                  style={{
                    background: 'transparent',
                    border: `1px solid ${colors.greenFaint}`,
                    color: colors.greenDim,
                    padding: '6px 12px',
                    fontSize: '11px',
                    fontFamily: 'inherit',
                    cursor: 'pointer',
                  }}
                >
                  {cmd}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => {
          // Check if this is start of a new conversation pair (user message after assistant)
          const showSeparator = i > 0 && msg.role === 'user' && messages[i - 1].role === 'assistant'

          return (
            <div key={i}>
              {/* Separator between conversation pairs */}
              {showSeparator && (
                <div
                  style={{
                    borderTop: `1px solid ${colors.greenGhost}`,
                    margin: '20px 0',
                  }}
                />
              )}
              <div
                style={{
                  marginBottom: '16px',
                  paddingLeft: '12px',
                  borderLeft: `2px solid ${msg.role === 'user' ? colors.cyan : colors.green}`,
                  position: 'relative',
                }}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <div
                  style={{
                    fontSize: '10px',
                    marginBottom: '4px',
                    color: msg.role === 'user' ? colors.cyanDim : colors.greenDim,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span>
                    {msg.role === 'user' ? '▶ OPERATOR' : '◀ WARDEN'} @ {formatTimestamp(msg.timestamp)}
                  </span>
                  {msg.role === 'assistant' && (
                    <button
                      onClick={() => copyToClipboard(msg.content, i)}
                      style={{
                        background: 'transparent',
                        border: `1px solid ${copiedIndex === i ? colors.green : colors.greenFaint}`,
                        color: copiedIndex === i ? colors.green : colors.greenDim,
                        padding: '2px 6px',
                        fontSize: '9px',
                        fontFamily: 'inherit',
                        cursor: 'pointer',
                        opacity: hoveredIndex === i || copiedIndex === i ? 1 : 0.5,
                        transition: 'opacity 0.2s',
                      }}
                    >
                      {copiedIndex === i ? '[COPIED]' : '[COPY]'}
                    </button>
                  )}
                </div>
                <pre
                  style={{
                    margin: 0,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    fontSize: '13px',
                    lineHeight: 1.5,
                    color: msg.role === 'user' ? colors.cyan : colors.green,
                  }}
                >
                  {msg.role === 'assistant' ? stripMarkdown(msg.content) : msg.content}
                </pre>
              </div>
            </div>
          )
        })}

        {/* Streaming response */}
        {(isThinking || currentResponse) && (
          <div
            style={{
              marginBottom: '16px',
              paddingLeft: '12px',
              borderLeft: `2px solid ${colors.green}`,
            }}
          >
            <div style={{ fontSize: '10px', marginBottom: '4px', color: colors.greenDim }}>
              ◀ WARDEN @ {formatTime(new Date())}
            </div>
            {currentResponse ? (
              <pre
                style={{
                  margin: 0,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  fontSize: '13px',
                  lineHeight: 1.5,
                  color: colors.green,
                }}
              >
                {stripMarkdown(currentResponse)}
              </pre>
            ) : (
              <span
                style={{
                  color: colors.greenDim,
                  animation: 'blink 1s step-end infinite',
                }}
              >
                Processing...
                <span style={{ animation: 'blink 0.5s step-end infinite' }}>_</span>
              </span>
            )}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '12px 16px',
          borderTop: `1px solid ${colors.greenFaint}`,
          backgroundColor: 'rgba(0,0,0,0.5)',
        }}
      >
        <span style={{ color: colors.cyan, fontSize: '14px' }}>▶</span>
        <input
          ref={inputRef}
          className="terminal-input"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter command..."
          disabled={!isConnected || isThinking}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: colors.cyan,
            fontSize: '14px',
            fontFamily: 'inherit',
          }}
        />
        <button
          onClick={clearConversation}
          disabled={messages.length === 0 || isThinking}
          style={{
            background: 'transparent',
            border: `1px solid ${colors.yellow}`,
            color: colors.yellow,
            padding: '6px 12px',
            fontSize: '12px',
            fontFamily: 'inherit',
            cursor: messages.length > 0 && !isThinking ? 'pointer' : 'not-allowed',
            opacity: messages.length > 0 && !isThinking ? 1 : 0.5,
          }}
        >
          [CLEAR]
        </button>
        <button
          onClick={sendMessage}
          disabled={!input.trim() || !isConnected || isThinking}
          style={{
            background: 'transparent',
            border: `1px solid ${colors.green}`,
            color: colors.green,
            padding: '6px 12px',
            fontSize: '12px',
            fontFamily: 'inherit',
            cursor: input.trim() && isConnected && !isThinking ? 'pointer' : 'not-allowed',
            opacity: input.trim() && isConnected && !isThinking ? 1 : 0.5,
          }}
        >
          [SEND]
        </button>
      </div>

      {/* Status bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          padding: '4px 16px',
          paddingBottom: 'max(4px, env(safe-area-inset-bottom))',
          fontSize: '10px',
          color: colors.gray,
          borderTop: `1px solid ${colors.greenGhost}`,
        }}
      >
        <span>bastion → K3s + Proxmox</span>
        <span>↑↓ history | Enter to send</span>
      </div>

      {/* Animations */}
      <style>{`
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }

        /* Node status dots pulse */
        @keyframes node-pulse {
          0%, 100% {
            opacity: 1;
            box-shadow: 0 0 4px #33ff33;
          }
          50% {
            opacity: 0.6;
            box-shadow: 0 0 8px #33ff33, 0 0 12px #33ff33;
          }
        }

        .node-dot {
          animation: node-pulse 2s ease-in-out infinite;
        }
        .node-dot-0 { animation-delay: 0s; }
        .node-dot-1 { animation-delay: 0.4s; }
        .node-dot-2 { animation-delay: 0.8s; }
        .node-dot-3 { animation-delay: 1.2s; }
        .node-dot-4 { animation-delay: 1.6s; }

        /* Connected status glow */
        @keyframes connected-glow {
          0%, 100% {
            text-shadow: 0 0 5px rgba(51, 255, 51, 0.5);
          }
          50% {
            text-shadow: 0 0 10px rgba(51, 255, 51, 0.8), 0 0 20px rgba(51, 255, 51, 0.4);
          }
        }

        .connected-status {
          animation: connected-glow 3s ease-in-out infinite;
        }

        /* Logo flicker */
        @keyframes logo-flicker {
          0%, 94%, 100% { opacity: 1; }
          95% { opacity: 0.8; }
          96% { opacity: 1; }
          97% { opacity: 0.85; }
          98% { opacity: 0.95; }
        }

        .warden-logo {
          animation: logo-flicker 8s infinite;
        }

        /* Quick action button hover */
        .quick-btn {
          position: relative;
          overflow: hidden;
          transition: all 0.2s ease;
        }

        .quick-btn:hover {
          border-color: #33ff33 !important;
          background: rgba(51, 255, 51, 0.1) !important;
          box-shadow: 0 0 10px rgba(51, 255, 51, 0.3);
          color: #33ff33 !important;
        }

        .quick-btn::before {
          content: '';
          position: absolute;
          top: -100%;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            transparent 0%,
            rgba(51, 255, 51, 0.15) 50%,
            transparent 100%
          );
          transition: top 0.3s ease;
        }

        .quick-btn:hover::before {
          top: 100%;
        }

        /* Input placeholder cursor */
        .terminal-input::placeholder {
          color: rgba(51, 255, 51, 0.4);
        }

        /* Scanlines subtle animation */
        @keyframes scanline-move {
          0% { background-position: 0 0; }
          100% { background-position: 0 4px; }
        }
      `}</style>
    </div>
  )
}
