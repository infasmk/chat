// Simple mock for PeerJS when not available
class MockPeer {
    constructor() {
        this.id = Math.random().toString(36).substring(2, 8);
        setTimeout(() => {
            if (this.onopen) this.onopen(this.id);
        }, 100);
    }
    
    on(event, callback) {
        if (event === 'open') {
            this.onopen = callback;
        }
    }
    
    connect(id) {
        return new MockConnection();
    }
}

class MockConnection {
    constructor() {
        this.isOpen = false;
        setTimeout(() => {
            this.isOpen = true;
            if (this.onopen) this.onopen();
        }, 200);
    }
    
    on(event, callback) {
        if (event === 'open') {
            this.onopen = callback;
        } else if (event === 'data') {
            this.ondata = callback;
        }
    }
    
    send(data) {
        // In a real app, this would send to the peer
        console.log('Mock send:', data);
    }
}

// Use PeerJS for easier WebRTC connections, or mock if not available
const peer = typeof Peer !== 'undefined' ? new Peer() : new MockPeer();

// Room ID from URL (or generate one)
let roomId = window.location.hash.substring(1);
if (!roomId) {
    roomId = Math.random().toString(36).substring(2, 8);
    window.location.hash = roomId;
}

// Display room link
document.getElementById('room-id').value = `${window.location.origin}${window.location.pathname}#${roomId}`;

// Copy Room Link
document.getElementById('copy-btn').addEventListener('click', () => {
    const roomInput = document.getElementById('room-id');
    roomInput.select();
    document.execCommand('copy');
    alert("Room link copied! Share it with your friend.");
});

// Chat elements
const chatBox = document.getElementById('chat-box');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const typingIndicator = document.getElementById('typing-indicator');
let dataChannel;

// When PeerJS is ready
peer.on('open', (id) => {
    console.log("My peer ID:", id);
    
    // If URL has a room ID, connect to the other peer
    if (roomId) {
        connectToPeer(roomId);
    }
});

// Handle incoming connections
peer.on('connection', (conn) => {
    console.log("Someone connected to me!");
    setupDataChannel(conn);
});

// Connect to another peer
function connectToPeer(roomId) {
    const conn = peer.connect(roomId);
    setupDataChannel(conn);
}

// Set up data channel for messaging
function setupDataChannel(conn) {
    conn.on('open', () => {
        document.querySelector('.connection-status').textContent = "🟢 Connected";
        dataChannel = conn;
        addMessage('Hello! You are now connected and can start chatting.', 'system');
    });

    conn.on('data', (data) => {
        if (data.type === 'text') {
            addMessage(data.content, 'remote');
        } else if (data.type === 'typing') {
            typingIndicator.textContent = "Peer is typing...";
            setTimeout(() => {
                typingIndicator.textContent = "";
            }, 2000);
        }
    });
}

// Send a message
sendBtn.addEventListener('click', sendMessage);

// Allow Enter key to send message
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

function sendMessage() {
    const message = messageInput.value;
    if (message.trim() === '') return;

    if (dataChannel) {
        dataChannel.send({
            type: 'text',
            content: message
        });
    }

    addMessage(message, 'local');
    messageInput.value = '';
}

// Typing indicator
messageInput.addEventListener('input', () => {
    if (dataChannel) {
        dataChannel.send({
            type: 'typing'
        });
    }
});

// Add message to chat box
function addMessage(text, sender) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message');
    messageElement.textContent = text;
    if (sender === 'local') {
        messageElement.style.background = '#d4edda';
    } else if (sender === 'system') {
        messageElement.style.background = '#f8f9fa';
        messageElement.style.fontStyle = 'italic';
        messageElement.style.color = '#6c757d';
    }
    chatBox.appendChild(messageElement);
    chatBox.scrollTop = chatBox.scrollHeight;
}

// Add welcome message when page loads
document.addEventListener('DOMContentLoaded', () => {
    addMessage('Hello! Welcome to Anonymous Chat. Share the room link to start chatting.', 'system');
});
