import React, { useState, useEffect, useRef } from 'react';
import { Send, MessageSquare, FileText } from 'lucide-react';

function ChatPanel({ socket, roomId, username }) {
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' or 'notepad'
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [notepadContent, setNotepadContent] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!socket) return;

    // Listen for text chat messages
    socket.on('chat-message', (data) => {
      setMessages((prev) => [...prev, {
        sender: data.sender,
        message: data.message,
        timestamp: new Date(data.timestamp),
        self: false
      }]);
    });

    // Listen for shared notepad sync
    socket.on('notepad-change', (data) => {
      setNotepadContent(data.notepadContent);
    });

    return () => {
      socket.off('chat-message');
      socket.off('notepad-change');
    };
  }, [socket]);

  // Auto scroll chat list to bottom
  useEffect(() => {
    if (activeTab === 'chat' && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeTab]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const messageData = {
      roomId,
      sender: username,
      message: inputValue.trim()
    };

    // Emit message to server
    if (socket) {
      socket.emit('chat-message', messageData);
    }

    // Add to local message list
    setMessages((prev) => [...prev, {
      sender: username,
      message: inputValue.trim(),
      timestamp: new Date(),
      self: true
    }]);

    setInputValue('');
  };

  const handleNotepadChange = (e) => {
    const content = e.target.value;
    setNotepadContent(content);

    // Emit notepad changes to room
    if (socket && roomId) {
      socket.emit('notepad-change', { roomId, notepadContent: content });
    }
  };

  return (
    <div className="chat-panel glass-panel">
      <div className="chat-tabs">
        <button 
          onClick={() => setActiveTab('chat')} 
          className={`chat-tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
        >
          <MessageSquare size={14} />
          <span>Chat</span>
        </button>
        <button 
          onClick={() => setActiveTab('notepad')} 
          className={`chat-tab-btn ${activeTab === 'notepad' ? 'active' : ''}`}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
        >
          <FileText size={14} />
          <span>Notepad</span>
        </button>
      </div>

      <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {activeTab === 'chat' ? (
          <>
            <div className="chat-messages">
              {messages.length === 0 ? (
                <div style={{
                  color: 'var(--text-muted)',
                  textAlign: 'center',
                  marginTop: 'auto',
                  marginBottom: 'auto',
                  fontSize: '0.85rem'
                }}>
                  No messages yet. Start chatting!
                </div>
              ) : (
                messages.map((msg, i) => (
                  <div key={i} className={`chat-message-row ${msg.self ? 'self' : ''}`}>
                    <span className="chat-message-sender">
                      {msg.self ? 'You' : msg.sender} • {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <div className="chat-message-bubble">
                      {msg.message}
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSendMessage} className="chat-input-form">
              <input
                type="text"
                className="chat-input"
                placeholder="Type a message..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
              />
              <button type="submit" className="chat-send-btn">
                <Send size={14} />
              </button>
            </form>
          </>
        ) : (
          <div className="panel-body" style={{ padding: '1rem', height: '100%' }}>
            <textarea
              className="notepad-textarea"
              placeholder="Shared notepad scratch space. Scribble down notes, ideas, pseudo-code here..."
              value={notepadContent}
              onChange={handleNotepadChange}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default ChatPanel;
