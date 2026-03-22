import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { dummyChatResponses } from '../../utils/dummyData'
import DashboardLayout from '../../components/DashboardLayout'
import ClickSpark from '../../components/reactbits/ClickSpark'

function detectIntent(message) {
  const lower = message.toLowerCase()
  const intents = {
    career_guidance: ['career', 'job', 'profession', 'future', 'work', 'field', 'path'],
    study_help: ['study', 'learn', 'course', 'content', 'video', 'material', 'topic'],
    motivation: ['sad', 'stressed', 'tired', "can't", 'difficult', 'hard', 'help me', 'overwhelm'],
    greeting: ['hi', 'hello', 'hey', 'good morning', 'good evening'],
  }
  for (const [intent, keywords] of Object.entries(intents)) {
    if (keywords.some(kw => lower.includes(kw))) return intent
  }
  return 'fallback'
}

export default function ChatBot() {
  const [messages, setMessages] = useState([
    { role: 'bot', message: dummyChatResponses.greeting.message, quick_replies: dummyChatResponses.greeting.quick_replies }
  ])
  const [input, setInput] = useState('')
  const messagesEnd = useRef(null)

  useEffect(() => { messagesEnd.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const sendMessage = (text) => {
    const msg = text || input.trim()
    if (!msg) return
    setInput('')

    const newMessages = [...messages, { role: 'user', message: msg }]
    setMessages(newMessages)

    setTimeout(() => {
      const intent = detectIntent(msg)
      const response = dummyChatResponses[intent] || dummyChatResponses.fallback
      setMessages(prev => [...prev, { role: 'bot', message: response.message, quick_replies: response.quick_replies }])
    }, 600)
  }

  const handleSubmit = (e) => { e.preventDefault(); sendMessage() }

  return (
    <DashboardLayout title="AI Chatbot">
      <div className="page-header" style={{ marginBottom: '1rem' }}>
        <h1>AI Chatbot 💬</h1>
        <p>Get instant guidance on careers, study tips, and more
          <span className="badge badge-warning" style={{ marginLeft: '0.75rem' }}>Demo Mode</span>
        </p>
      </div>

      <div className="chat-container">
        <div className="chat-messages">
          <AnimatePresence>
          {messages.map((m, i) => (
            <motion.div
              key={i}
              className={`chat-bubble ${m.role}`}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              {m.message.split('\n').map((line, j) => <span key={j}>{line}<br /></span>)}
            </motion.div>
          ))}
          </AnimatePresence>
          <div ref={messagesEnd} />
        </div>

        {messages.length > 0 && messages[messages.length - 1].quick_replies && (
          <div className="quick-replies">
            {messages[messages.length - 1].quick_replies.map((qr, i) => (
              <button key={i} className="quick-reply-btn" onClick={() => sendMessage(qr)}>{qr}</button>
            ))}
          </div>
        )}

        <ClickSpark sparkColor="#667eea" sparkCount={10}>
          <form className="chat-input-area" onSubmit={handleSubmit}>
            <input
              value={input} onChange={e => setInput(e.target.value)}
              placeholder="Type your message..." maxLength={1000}
            />
            <motion.button
              type="submit"
              className="btn btn-primary"
              whileTap={{ scale: 0.95 }}
            >
              Send
            </motion.button>
          </form>
        </ClickSpark>
      </div>
    </DashboardLayout>
  )
}
