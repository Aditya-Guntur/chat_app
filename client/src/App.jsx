import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';
import './App.css';
import './Landing.css';

// Components
const MessageBubble = ({ message, isOwn }) => (
  <div className={`message-bubble ${isOwn ? 'own' : 'other'}`}>
    <div className="bubble-content">
      {!isOwn && <span className="sender-name">{message.sender}</span>}
      <span>{message.text}</span>
      <div className="meta-info">
        <span className="timestamp">
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
        {isOwn && <span className="ticks">✓✓</span>}
      </div>
    </div>
  </div>
);

const Avatar = ({ avatar, name, showOnline }) => (
  <div style={{ position: 'relative', display: 'inline-block' }}>
    <div
      style={{
        width: '49px',
        height: '49px',
        borderRadius: '50%',
        background: `linear-gradient(135deg, ${avatar?.color || '#667eea'} 0%, ${adjustColor(avatar?.color || '#667eea')} 100%)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontSize: '20px',
        fontWeight: '600',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        transition: 'transform 0.3s ease',
      }}
      className="avatar-circle"
    >
      {avatar?.initial || name?.charAt(0).toUpperCase() || '?'}
    </div>
    {showOnline && <div className="online-indicator"></div>}
  </div>
);

const adjustColor = (color) => {
  const hex = color.replace('#', '');
  const r = Math.max(0, parseInt(hex.substr(0, 2), 16) - 30);
  const g = Math.max(0, parseInt(hex.substr(2, 2), 16) - 30);
  const b = Math.max(0, parseInt(hex.substr(4, 2), 16) - 30);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};

const UserList = ({ users }) => (
  <div className="user-list-glass">
    <ul>
      {users.map(user => (
        <li key={user.id}>
          <Avatar avatar={user.avatar} name={user.name} showOnline={user.online} />
          <div className="user-info">
            <span className="user-name">{user.name}</span>
            <span className="user-status">Online</span>
          </div>
        </li>
      ))}
    </ul>
  </div>
);

const TypingIndicator = ({ userName }) => (
  <div className="typing-indicator">
    <span>{userName} is typing</span>
    <div className="typing-dots">
      <span></span>
      <span></span>
      <span></span>
    </div>
  </div>
);

function App() {
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [deviceKey, setDeviceKey] = useState('');
  const [typingUsers, setTypingUsers] = useState([]);
  const [showLanding, setShowLanding] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showUsernameEntry, setShowUsernameEntry] = useState(false);
  const [username, setUsername] = useState('');
  const [selectedChat, setSelectedChat] = useState('community');
  const [dmMessages, setDmMessages] = useState({});
  const [inCall, setInCall] = useState(false);
  const [callWith, setCallWith] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const callTimerRef = useRef(null);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  useEffect(scrollToBottom, [messages]);

  useEffect(() => {
    // Get or Create Device Key
    let storedKey = localStorage.getItem('chat_device_key');
    if (!storedKey) {
      storedKey = uuidv4();
      localStorage.setItem('chat_device_key', storedKey);
    }
    setDeviceKey(storedKey);
  }, []);

  const handleTyping = (e) => {
    setInputValue(e.target.value);

    if (!socket) return;

    socket.emit('typing', true);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing', false);
    }, 1000);
  };

  const sendMessage = (e) => {
    e.preventDefault();
    console.log('Send message called:', { inputValue, socket: !!socket, selectedChat });
    if (inputValue.trim() && socket) {
      if (selectedChat === 'community') {
        console.log('Sending community message:', inputValue);
        socket.emit('message', inputValue);
      } else {
        console.log('Sending DM:', { to: selectedChat, message: inputValue });
        socket.emit('dm', { to: selectedChat, message: inputValue });
      }
      socket.emit('typing', false);
      setInputValue('');
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    } else {
      console.log('Cannot send - missing:', { hasInput: !!inputValue.trim(), hasSocket: !!socket });
    }
  };

  const startCall = async (userId) => {
    if (selectedChat === 'community') return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;

      const peerConnection = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });
      peerConnectionRef.current = peerConnection;

      stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));

      peerConnection.ontrack = (event) => {
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = event.streams[0];
        }
      };

      peerConnection.onicecandidate = (event) => {
        if (event.candidate && socket) {
          socket.emit('ice-candidate', { to: userId, candidate: event.candidate });
        }
      };

      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      socket.emit('call-offer', { to: userId, offer });
      setInCall(true);
      setCallWith(userId);
      startCallTimer();
    } catch (err) {
      console.error('Error starting call:', err);
      alert('Could not access microphone. Please allow microphone access.');
    }
  };

  const answerCall = async () => {
    if (!incomingCall) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;

      const peerConnection = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });
      peerConnectionRef.current = peerConnection;

      stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));

      peerConnection.ontrack = (event) => {
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = event.streams[0];
        }
      };

      peerConnection.onicecandidate = (event) => {
        if (event.candidate && socket) {
          socket.emit('ice-candidate', { to: incomingCall.from, candidate: event.candidate });
        }
      };

      await peerConnection.setRemoteDescription(new RTCSessionDescription(incomingCall.offer));
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      socket.emit('call-answer', { to: incomingCall.from, answer });
      setInCall(true);
      setCallWith(incomingCall.from);
      setIncomingCall(null);
      startCallTimer();
    } catch (err) {
      console.error('Error answering call:', err);
      alert('Could not access microphone. Please allow microphone access.');
    }
  };

  const rejectCall = () => {
    if (incomingCall && socket) {
      socket.emit('call-ended', { to: incomingCall.from });
      setIncomingCall(null);
    }
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const startCallTimer = () => {
    setCallDuration(0);
    callTimerRef.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
  };

  const formatCallDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const endCall = () => {
    if (callWith && socket) {
      socket.emit('call-ended', { to: callWith });
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }

    setInCall(false);
    setCallWith(null);
    setIsMuted(false);
    setCallDuration(0);
  };

  const enterChat = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      setShowLanding(false);
      setShowUsernameEntry(true);
    }, 2000);
  };

  const joinWithUsername = () => {
    if (!username.trim()) return;

    setShowUsernameEntry(false);

    // ⚠️ IMPORTANT: Change this to your server's IP address
    // If hosting the server, use your local IP (e.g., '192.168.1.105')
    // If testing locally, keep 'localhost'
    // Find your IP: Windows (ipconfig), Mac/Linux (ifconfig)
    const SERVER_IP = '10.0.11.228'
    const serverUrl = `http://${SERVER_IP}:3000`;
    const newSocket = io(serverUrl);

    newSocket.on('connect', () => {
      console.log('Connected to server');
      newSocket.emit('join', { deviceKey, username });
    });

    newSocket.on('message', (msg) => {
      console.log('Received message:', msg);
      setMessages(prev => [...prev, msg]);
    });

    newSocket.on('dm', ({ from, message }) => {
      console.log('Received DM:', from, message);
      setDmMessages(prev => ({
        ...prev,
        [from]: [...(prev[from] || []), message]
      }));
    });

    newSocket.on('users', (userList) => {
      console.log('Users updated:', userList);
      setUsers(userList);
    });

    newSocket.on('userTyping', ({ userId, userName, isTyping }) => {
      setTypingUsers(prev => {
        if (isTyping) {
          return prev.includes(userName) ? prev : [...prev, userName];
        } else {
          return prev.filter(u => u !== userName);
        }
      });
    });

    // Voice call events
    newSocket.on('call-offer', async ({ from, fromName, offer }) => {
      console.log('Incoming call from:', fromName);
      setIncomingCall({ from, fromName, offer });
    });

    newSocket.on('call-answer', async ({ answer }) => {
      console.log('Call answered');
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
      }
    });

    newSocket.on('ice-candidate', async ({ candidate }) => {
      console.log('Received ICE candidate');
      if (peerConnectionRef.current && candidate) {
        await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      }
    });

    newSocket.on('call-ended', () => {
      console.log('Call ended by other user');
      endCall();
    });

    setSocket(newSocket);
  };

  if (showLanding) {
    return (
      <div className={`landing-container ${isTransitioning ? 'transitioning' : ''}`}>
        <div className="tunnel">
          <div className="tunnel-ring ring-1"></div>
          <div className="tunnel-ring ring-2"></div>
          <div className="tunnel-ring ring-3"></div>
          <div className="tunnel-ring ring-4"></div>
          <div className="tunnel-ring ring-5"></div>
          <div className="tunnel-ring ring-6"></div>
        </div>
        <div className="landing-content">
          <h1 className="landing-title">
            <span className="gradient-text">HYPERCHAT</span>
          </h1>
          <p className="landing-subtitle">Enter the dimension of instant connection</p>
          <button className="enter-button" onClick={enterChat}>
            <span>POWER UP</span>
            <div className="button-glow"></div>
          </button>
        </div>
        <div className="particles">
          {[...Array(50)].map((_, i) => (
            <div key={i} className="particle" style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 3}s`
            }}></div>
          ))}
        </div>
      </div>
    );
  }

  if (showUsernameEntry) {
    return (
      <div className="username-container">
        <div className="username-box">
          <h2 className="username-title">
            <span className="gradient-text">IDENTIFY YOURSELF</span>
          </h2>
          <input
            type="text"
            className="username-input"
            placeholder="Enter your username..."
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && joinWithUsername()}
            autoFocus
          />
          <button className="join-button" onClick={joinWithUsername}>
            <span>JOIN THE NETWORK</span>
            <div className="button-glow"></div>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container chat-active">
      <div className="glass-panel">
        <div className="sidebar">
          <div className="sidebar-header">
            <div style={{ width: '40px', height: '40px', position: 'relative' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'transform 0.3s ease',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                }}
                onMouseEnter={(e) => e.target.style.transform = 'scale(1.1)'}
                onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
              >
                Me
              </div>
              <div className="online-indicator"></div>
            </div>
            <div className="header-icons">
              <span style={{ fontSize: '20px', cursor: 'pointer', opacity: 0.6, transition: 'opacity 0.3s' }}
                onMouseEnter={(e) => e.target.style.opacity = '1'}
                onMouseLeave={(e) => e.target.style.opacity = '0.6'}>⚙️</span>
            </div>
          </div>
          <div className="chat-list">
            <div
              className={`chat-list-item ${selectedChat === 'community' ? 'active' : ''}`}
              onClick={() => setSelectedChat('community')}
            >
              <div style={{
                width: '49px',
                height: '49px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #4ECDC4 0%, #44A08D 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                marginRight: '15px'
              }}>
                🌐
              </div>
              <div className="user-info">
                <span className="user-name">Community Chat</span>
                <span className="user-status">{users.length} online</span>
              </div>
            </div>
            <div className="divider"></div>
            {users.map(user => (
              <div
                key={user.id}
                className={`chat-list-item ${selectedChat === user.id ? 'active' : ''}`}
                onClick={() => setSelectedChat(user.id)}
              >
                <Avatar avatar={user.avatar} name={user.name} showOnline={user.online} />
                <div className="user-info">
                  <span className="user-name">{user.name}</span>
                  <span className="user-status">Online</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="chat-area">
          <div className="chat-header">
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #4ECDC4 0%, #44A08D 100%)',
                  marginRight: '15px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '18px',
                  fontWeight: '600',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                }}
              >
                🌐
              </div>
              <div>
                <div style={{ fontWeight: '600', fontSize: '16px' }}>
                  {selectedChat === 'community' ? 'Community Chat' : users.find(u => u.id === selectedChat)?.name || 'Chat'}
                </div>
                <div style={{ fontSize: '12px', color: '#667781' }}>
                  {selectedChat === 'community'
                    ? `${users.length} ${users.length === 1 ? 'user' : 'users'} online`
                    : 'Direct Message'}
                </div>
              </div>
            </div>
            {selectedChat !== 'community' && (
              <div style={{ display: 'flex', gap: '10px' }}>
                {inCall ? (
                  <button className="call-button hangup" onClick={endCall}>
                    📞 End Call
                  </button>
                ) : (
                  <button className="call-button" onClick={() => startCall(selectedChat)}>
                    📞 Voice Call
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Incoming Call UI */}
          {incomingCall && (
            <div className="incoming-call-overlay">
              <div className="incoming-call-box">
                <h2>📞 Incoming Call</h2>
                <p>{incomingCall.fromName} is calling you...</p>
                <div style={{ display: 'flex', gap: '20px', marginTop: '20px' }}>
                  <button className="accept-button" onClick={answerCall}>
                    ✅ Accept
                  </button>
                  <button className="reject-button" onClick={rejectCall}>
                    ❌ Reject
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Hidden audio element for remote stream */}
          <audio ref={remoteAudioRef} autoPlay />

          {/* Mobile Phone Call Interface */}
          {inCall && (
            <div className="phone-call-interface">
              <div className="phone-screen">
                <div className="phone-header">
                  <div className="call-status">Voice Call</div>
                  <div className="call-timer">{formatCallDuration(callDuration)}</div>
                </div>

                <div className="caller-info">
                  <div className="caller-avatar">
                    {users.find(u => u.id === callWith)?.avatar?.initial || '?'}
                  </div>
                  <div className="caller-name">
                    {users.find(u => u.id === callWith)?.name || 'Unknown'}
                  </div>
                  <div className="call-state">
                    {isMuted ? '🔇 Muted' : '🔊 Unmuted'}
                  </div>
                </div>

                <div className="phone-controls">
                  <button
                    className={`phone-button mute-button ${isMuted ? 'active' : ''}`}
                    onClick={toggleMute}
                  >
                    <span className="button-icon">{isMuted ? '🔇' : '🎤'}</span>
                    <span className="button-label">{isMuted ? 'Unmute' : 'Mute'}</span>
                  </button>
                  <button className="phone-button end-call-button" onClick={endCall}>
                    <span className="button-icon">📞</span>
                    <span className="button-label">End Call</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="messages-container">
            {selectedChat === 'community' ? (
              <>
                {messages.map((msg) => (
                  <MessageBubble
                    key={msg.id}
                    message={msg}
                    isOwn={msg.senderId === deviceKey}
                  />
                ))}
              </>
            ) : (
              <>
                {(dmMessages[selectedChat] || []).map((msg, idx) => (
                  <MessageBubble
                    key={idx}
                    message={msg}
                    isOwn={msg.senderId === deviceKey}
                  />
                ))}
              </>
            )}
            {typingUsers.length > 0 && (
              <TypingIndicator userName={typingUsers[0]} />
            )}
            <div ref={messagesEndRef} />
          </div>

          <form className="input-area" onSubmit={sendMessage}>
            <button type="button">😊</button>
            <button type="button">📎</button>
            <input
              type="text"
              placeholder="Type a message..."
              value={inputValue}
              onChange={handleTyping}
            />
            <button type="submit">🚀</button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default App;
