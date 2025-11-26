const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const ip = require('ip');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3000;
const LAN_IP = ip.address();

const users = {};
const typingUsers = new Set();

const getRandomAvatar = (name) => {
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#52B788'];
  const initial = name.charAt(0).toUpperCase();
  const colorIndex = name.charCodeAt(0) % colors.length;
  return {
    initial,
    color: colors[colorIndex]
  };
};

io.on('connection', (socket) => {
  console.log('New user connected:', socket.id);

  socket.on('join', ({ deviceKey, username }) => {
    const avatarData = getRandomAvatar(username);

    users[socket.id] = {
      id: socket.id,
      name: username,
      deviceKey: deviceKey,
      avatar: avatarData,
      online: true
    };

    io.emit('users', Object.values(users));
    console.log(`User joined: ${username}`);
  });

  socket.on('message', (text) => {
    const user = users[socket.id];
    if (user && text.trim()) {
      const message = {
        id: Date.now().toString() + Math.random(),
        text: text,
        sender: user.name,
        senderId: user.deviceKey,
        avatar: user.avatar,
        timestamp: new Date().toISOString()
      };
      io.emit('message', message);
    }
  });

  socket.on('dm', ({ to, message }) => {
    const sender = users[socket.id];
    if (sender && message.trim()) {
      const dmMessage = {
        id: Date.now().toString() + Math.random(),
        text: message,
        sender: sender.name,
        senderId: sender.deviceKey,
        avatar: sender.avatar,
        timestamp: new Date().toISOString()
      };

      // Send to recipient
      io.to(to).emit('dm', { from: socket.id, message: dmMessage });

      // Send back to sender for confirmation
      socket.emit('dm', { from: to, message: { ...dmMessage, senderId: sender.deviceKey } });
    }
  });

  socket.on('typing', (isTyping) => {
    const user = users[socket.id];
    if (user) {
      if (isTyping) {
        typingUsers.add(socket.id);
      } else {
        typingUsers.delete(socket.id);
      }
      socket.broadcast.emit('userTyping', {
        userId: socket.id,
        userName: user.name,
        isTyping
      });
    }
  });

  // Voice call signaling
  socket.on('call-offer', ({ to, offer }) => {
    const caller = users[socket.id];
    if (caller) {
      io.to(to).emit('call-offer', {
        from: socket.id,
        fromName: caller.name,
        offer
      });
    }
  });

  socket.on('call-answer', ({ to, answer }) => {
    io.to(to).emit('call-answer', { answer });
  });

  socket.on('ice-candidate', ({ to, candidate }) => {
    io.to(to).emit('ice-candidate', { candidate });
  });

  socket.on('call-ended', ({ to }) => {
    io.to(to).emit('call-ended');
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    typingUsers.delete(socket.id);
    delete users[socket.id];
    io.emit('users', Object.values(users));
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`
🚀 Server running!
--------------------------
Local:   http://localhost:${PORT}
LAN:     http://${LAN_IP}:${PORT}
--------------------------
Share the LAN link with your friends!
  `);
});
