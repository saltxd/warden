import { useState, useEffect, useRef } from 'react'
import { API_URL, getAuthWsUrl, getHeaders } from '../config'
import { showToast } from './Toast'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

const stripMarkdown = (text: string): string => {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/^#+\s*/gm, '')
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
}

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

interface NodeStatus {
  name: string
  ip: string
  role: string
  status: 'ready' | 'down' | 'unknown'
}

const DEFAULT_NODES: NodeStatus[] = [
  { name: 'bastion', ip: '10.0.2.10', role: 'local', status: 'unknown' },
  { name: 'k3s-cp-1', ip: '10.0.1.10', role: 'control-plane', status: 'unknown' },
  { name: 'k3s-cp-2', ip: '10.0.1.11', role: 'control-plane', status: 'unknown' },
  { name: 'k3s-cp-3', ip: '10.0.1.13', role: 'control-plane', status: 'unknown' },
  { name: 'wt-worker', ip: '10.0.1.12', role: 'worker', status: 'unknown' },
]

const getRoleLabel = (role: string) => {
  if (role === 'local') return 'LOCAL'
  if (role === 'control-plane') return 'CP'
  return 'WORKER'
}

const getStatusColor = (status: string) => {
  if (status === 'ready') return colors.green
  if (status === 'down') return colors.red
  return colors.yellow
}

function ChatHeader({ isConnected, currentTime }: { isConnected: boolean; currentTime: Date }) {
  const formatTime = (date: Date) => date.toLocaleTimeString('en-US', { hour12: false })

  return (
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
        <span className="hidden sm:inline" style={{ color: colors.greenDim, fontSize: '12px' }}>v3.1.0</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px' }}>
        <span
          role="status"
          aria-label={isConnected ? 'Connected' : 'Disconnected'}
          className={isConnected ? 'connected-status' : ''}
          style={{ color: isConnected ? colors.green : colors.red }}
        >
          {isConnected ? 'CONNECTED' : 'DISCONNECTED'}
        </span>
        <span className="hidden sm:inline" style={{ color: colors.greenDim }}>{formatTime(currentTime)}</span>
      </div>
    </header>
  )
}

function NodeStatusBar({ nodes }: { nodes: NodeStatus[] }) {
  return (
    <div
      className="hidden sm:flex"
      style={{
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
      {nodes.map((node, i) => {
        const roleLabel = getRoleLabel(node.role)
        return (
          <div
            key={node.name}
            title={`${node.name} - ${node.ip} - ${node.status.toUpperCase()}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 8px',
              border: `1px solid ${node.role === 'local' ? colors.cyanDim : node.status === 'down' ? colors.red : colors.greenGhost}`,
              backgroundColor: node.role === 'local' ? 'rgba(0,255,255,0.05)' : node.status === 'down' ? 'rgba(255,51,51,0.05)' : 'transparent',
              whiteSpace: 'nowrap',
            }}
          >
            <span
              className={node.status === 'ready' ? `node-dot node-dot-${i}` : ''}
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: getStatusColor(node.status),
              }}
            />
            <span style={{ color: node.role === 'local' ? colors.cyan : colors.greenDim }}>
              {node.name}
            </span>
            <span
              style={{
                color: colors.bg,
                backgroundColor: node.role === 'local' ? colors.cyan : node.role === 'control-plane' ? colors.green : colors.yellow,
                padding: '0 4px',
                fontSize: '8px',
                fontWeight: 'bold',
              }}
            >
              {roleLabel}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function WelcomeScreen({ onQuickCommand }: { onQuickCommand: (cmd: string) => void }) {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: '48px 16px',
        color: colors.greenDim,
      }}
    >
      <pre
        className="warden-logo hidden sm:block"
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
      {/* Mobile-friendly title */}
      <h1 className="sm:hidden" style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>WARDEN</h1>
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
            onClick={() => onQuickCommand(cmd)}
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
  )
}

function MessageBubble({
  msg,
  index,
  showSeparator,
  copiedIndex,
  hoveredIndex,
  onCopy,
  onHover,
  onLeave,
}: {
  msg: Message
  index: number
  showSeparator: boolean
  copiedIndex: number | null
  hoveredIndex: number | null
  onCopy: (text: string, i: number) => void
  onHover: (i: number) => void
  onLeave: () => void
}) {
  const formatTimestamp = (iso: string) =>
    new Date(iso).toLocaleTimeString('en-US', { hour12: false })

  return (
    <div key={index}>
      {showSeparator && (
        <div style={{ borderTop: `1px solid ${colors.greenGhost}`, margin: '20px 0' }} />
      )}
      <div
        style={{
          marginBottom: '16px',
          paddingLeft: '12px',
          borderLeft: `2px solid ${msg.role === 'user' ? colors.cyan : colors.green}`,
          position: 'relative',
        }}
        onMouseEnter={() => onHover(index)}
        onMouseLeave={onLeave}
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
            {msg.role === 'user' ? '> OPERATOR' : '< WARDEN'} @ {formatTimestamp(msg.timestamp)}
          </span>
          {msg.role === 'assistant' && (
            <button
              onClick={() => onCopy(msg.content, index)}
              aria-label="Copy response"
              style={{
                background: 'transparent',
                border: `1px solid ${copiedIndex === index ? colors.green : colors.greenFaint}`,
                color: copiedIndex === index ? colors.green : colors.greenDim,
                padding: '2px 6px',
                fontSize: '9px',
                fontFamily: 'inherit',
                cursor: 'pointer',
                opacity: hoveredIndex === index || copiedIndex === index ? 1 : 0.5,
                transition: 'opacity 0.2s',
              }}
            >
              {copiedIndex === index ? '[COPIED]' : '[COPY]'}
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
}

function ChatInput({
  input,
  isConnected,
  isThinking,
  hasMessages,
  onInputChange,
  onKeyDown,
  onSend,
  onClear,
  inputRef,
}: {
  input: string
  isConnected: boolean
  isThinking: boolean
  hasMessages: boolean
  onInputChange: (val: string) => void
  onKeyDown: (e: React.KeyboardEvent) => void
  onSend: () => void
  onClear: () => void
  inputRef: React.RefObject<HTMLInputElement | null>
}) {
  return (
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
      <span style={{ color: colors.cyan, fontSize: '14px' }}>&gt;</span>
      <input
        ref={inputRef}
        className="terminal-input"
        type="text"
        value={input}
        onChange={(e) => onInputChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Enter command..."
        disabled={!isConnected || isThinking}
        aria-label="Command input"
        style={{
          flex: 1,
          background: 'transparent',
          border: 'none',
          outline: 'none',
          color: colors.cyan,
          fontSize: '14px',
          fontFamily: 'inherit',
          minWidth: 0,
        }}
      />
      <button
        onClick={onClear}
        disabled={!hasMessages || isThinking}
        aria-label="Clear conversation"
        className="hidden sm:block"
        style={{
          background: 'transparent',
          border: `1px solid ${colors.yellow}`,
          color: colors.yellow,
          padding: '6px 12px',
          fontSize: '12px',
          fontFamily: 'inherit',
          cursor: hasMessages && !isThinking ? 'pointer' : 'not-allowed',
          opacity: hasMessages && !isThinking ? 1 : 0.5,
        }}
      >
        [CLR]
      </button>
      <button
        onClick={onSend}
        disabled={!input.trim() || !isConnected || isThinking}
        aria-label="Send message"
        style={{
          background: 'transparent',
          border: `1px solid ${colors.green}`,
          color: colors.green,
          padding: '6px 12px',
          fontSize: '12px',
          fontFamily: 'inherit',
          cursor: input.trim() && isConnected && !isThinking ? 'pointer' : 'not-allowed',
          opacity: input.trim() && isConnected && !isThinking ? 1 : 0.5,
          flexShrink: 0,
        }}
      >
        [SEND]
      </button>
    </div>
  )
}

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
  const [nodes, setNodes] = useState<NodeStatus[]>(DEFAULT_NODES)

  const wsRef = useRef<WebSocket | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const currentResponseRef = useRef('')

  const copyToClipboard = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedIndex(index)
      showToast('success', 'Copied to clipboard')
      setTimeout(() => setCopiedIndex(null), 2000)
    } catch {
      showToast('error', 'Failed to copy to clipboard')
    }
  }

  const clearConversation = () => {
    setMessages([])
    setCurrentResponse('')
    inputRef.current?.focus()
  }

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Fetch node status from API
  const fetchNodeStatus = async () => {
    try {
      const res = await fetch(`${API_URL}/api/nodes/status`, { headers: getHeaders() })
      if (res.ok) {
        const data = await res.json()
        setNodes(data)
      }
    } catch {
      // Keep current node state on error
    }
  }

  useEffect(() => {
    fetchNodeStatus()
    const interval = setInterval(fetchNodeStatus, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    currentResponseRef.current = currentResponse
  }, [currentResponse])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, currentResponse])

  // WebSocket connection with auth
  useEffect(() => {
    const connect = () => {
      const ws = new WebSocket(getAuthWsUrl('/chat/ws'))
      wsRef.current = ws

      ws.onopen = () => {
        setIsConnected(true)
        showToast('info', 'Connected to Warden')
        fetchNodeStatus()
      }

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

          case 'assistant_done': {
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
          }

          case 'error':
            setIsThinking(false)
            showToast('error', data.content || 'An error occurred')
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

  const handleQuickCommand = (cmd: string) => {
    setInput(cmd)
    inputRef.current?.focus()
  }

  const formatTime = (date: Date) => date.toLocaleTimeString('en-US', { hour12: false })

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

      <ChatHeader isConnected={isConnected} currentTime={currentTime} />
      <NodeStatusBar nodes={nodes} />

      {/* Messages area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        {messages.length === 0 && !isThinking && (
          <WelcomeScreen onQuickCommand={handleQuickCommand} />
        )}

        {messages.map((msg, i) => (
          <MessageBubble
            key={`${msg.timestamp}-${i}`}
            msg={msg}
            index={i}
            showSeparator={i > 0 && msg.role === 'user' && messages[i - 1].role === 'assistant'}
            copiedIndex={copiedIndex}
            hoveredIndex={hoveredIndex}
            onCopy={copyToClipboard}
            onHover={setHoveredIndex}
            onLeave={() => setHoveredIndex(null)}
          />
        ))}

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
              &lt; WARDEN @ {formatTime(new Date())}
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
              <span style={{ color: colors.greenDim }}>
                Processing
                <span className="dot dot-1">.</span>
                <span className="dot dot-2">.</span>
                <span className="dot dot-3">.</span>
              </span>
            )}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <ChatInput
        input={input}
        isConnected={isConnected}
        isThinking={isThinking}
        hasMessages={messages.length > 0}
        onInputChange={setInput}
        onKeyDown={handleKeyDown}
        onSend={sendMessage}
        onClear={clearConversation}
        inputRef={inputRef}
      />

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
        <span>bastion &rarr; K3s + Proxmox</span>
        <span className="hidden sm:inline">&uarr;&darr; history | Enter to send</span>
      </div>

      {/* Animations */}
      <style>{`
        @keyframes dot-pulse {
          0%, 20% { opacity: 0.3; }
          40% { opacity: 1; color: #33ff33; text-shadow: 0 0 8px #33ff33; }
          60%, 100% { opacity: 0.3; }
        }
        .dot { animation: dot-pulse 1.4s ease-in-out infinite; }
        .dot-1 { animation-delay: 0s; }
        .dot-2 { animation-delay: 0.2s; }
        .dot-3 { animation-delay: 0.4s; }

        @keyframes node-pulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 4px #33ff33; }
          50% { opacity: 0.6; box-shadow: 0 0 8px #33ff33, 0 0 12px #33ff33; }
        }
        .node-dot { animation: node-pulse 2s ease-in-out infinite; }
        .node-dot-0 { animation-delay: 0s; }
        .node-dot-1 { animation-delay: 0.4s; }
        .node-dot-2 { animation-delay: 0.8s; }
        .node-dot-3 { animation-delay: 1.2s; }
        .node-dot-4 { animation-delay: 1.6s; }

        @keyframes connected-glow {
          0%, 100% { text-shadow: 0 0 5px rgba(51, 255, 51, 0.5); }
          50% { text-shadow: 0 0 10px rgba(51, 255, 51, 0.8), 0 0 20px rgba(51, 255, 51, 0.4); }
        }
        .connected-status { animation: connected-glow 3s ease-in-out infinite; }

        @keyframes logo-flicker {
          0%, 94%, 100% { opacity: 1; }
          95% { opacity: 0.8; }
          96% { opacity: 1; }
          97% { opacity: 0.85; }
          98% { opacity: 0.95; }
        }
        .warden-logo { animation: logo-flicker 8s infinite; }

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

        .terminal-input::placeholder { color: rgba(51, 255, 51, 0.4); }
      `}</style>
    </div>
  )
}
