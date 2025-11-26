# 🚀 HYPERCHAT - Real-Time Chat Application

A futuristic, feature-rich real-time chat application with voice calling capabilities, built with React, Socket.IO, and WebRTC.

![HyperChat](https://img.shields.io/badge/status-active-success.svg)
![React](https://img.shields.io/badge/react-19.2.0-blue.svg)
![Socket.IO](https://img.shields.io/badge/socket.io-4.8.1-green.svg)

## ✨ Features

- 🎨 **Stunning UI** - Futuristic dark theme with animated tunnel landing page
- 💬 **Community Chat** - Public chat room for all connected users
- 📨 **Direct Messages** - Private 1-on-1 messaging
- 📞 **Voice Calls** - Peer-to-peer voice calling using WebRTC
- 👥 **Real-time User List** - See who's online instantly
- ⌨️ **Typing Indicators** - Know when someone is typing
- 🎭 **Custom Avatars** - Colorful gradient avatars with initials
- ✨ **Smooth Animations** - Fluid transitions and micro-interactions

## 🛠️ Tech Stack

**Frontend:**
- React 19.2.0
- Socket.IO Client
- Vite
- WebRTC

**Backend:**
- Node.js
- Express 5
- Socket.IO Server

## 📦 Installation

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Setup

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd chatapp
```

2. **Install server dependencies**
```bash
cd server
npm install
```

3. **Install client dependencies**
```bash
cd ../client
npm install
```

## 🚀 Running the Application

### Option 1: Local Testing (Single Machine)

**Terminal 1 - Start Server:**
```bash
cd server
npm start
```

**Terminal 2 - Start Client:**
```bash
cd client
npm run dev
```

Open `http://localhost:5173` in your browser.

### Option 2: LAN/Network Setup (Multiple Users)

**On the Host Machine:**

1. Find your local IP address:
   - **Windows:** `ipconfig` (look for IPv4 Address)
   - **Mac/Linux:** `ifconfig` or `ip addr`

2. Update `client/src/App.jsx` line 279:
```javascript
const SERVER_IP = '192.168.1.X'; // Your IP here
```

3. Start the server:
```bash
cd server
npm start
```

4. Build and serve the client:
```bash
cd client
npm run build
npm run dev
```

**Other Users:**
- Open `http://YOUR-HOST-IP:5173` in their browser
- They'll connect to your server automatically

## 🎮 Usage

1. **Landing Page** - Click "POWER UP" to enter
2. **Username Entry** - Enter your username to join
3. **Community Chat** - Default view shows public chat
4. **Direct Messages** - Click any user in sidebar to DM them
5. **Voice Calls** - In a DM, click "📞 Voice Call" to start a call
6. **Accept/Reject Calls** - Answer incoming calls with the popup

## 🔧 Configuration

### Change Server Port
Edit `server/index.js`:
```javascript
const PORT = process.env.PORT || 3000; // Change port here
```

### Change Server IP (for clients)
Edit `client/src/App.jsx` line 279:
```javascript
const SERVER_IP = 'YOUR_IP_HERE';
```

## 🎨 Customization

### Colors & Theme
Edit `client/src/index.css` and `client/src/App.css` to change:
- Color scheme (currently cyan/purple gradient theme)
- Background animations
- Message bubble styles

### Landing Page
Edit `client/src/Landing.css` to customize:
- Tunnel animation
- Particle effects
- Button styles

## 📱 Browser Compatibility

- ✅ Chrome/Edge (Recommended)
- ✅ Firefox
- ✅ Safari (may have WebRTC limitations)
- ⚠️ Mobile browsers (limited voice call support)

## 🐛 Troubleshooting

### "Connection Refused" Error
- Make sure the server is running on port 3000
- Check if `SERVER_IP` is correct in `client/src/App.jsx`

### Voice Call Not Working
- Allow microphone permissions in browser
- Check if both users are on the same network (or use TURN server for different networks)
- Ensure WebRTC is supported in your browser

### Messages Not Sending
- Check browser console for errors
- Verify Socket.IO connection (look for "Connected to server" log)
- Make sure server is running

## 📝 License

This project is open source and available under the MIT License.

## 🙏 Acknowledgments

- Socket.IO for real-time communication
- WebRTC for peer-to-peer voice calling
- React team for the amazing framework
- Vite for lightning-fast builds

## 🤝 Contributing

Feel free to fork, submit PRs, or report issues!

---

Made with ❤️ and lots of ☕
