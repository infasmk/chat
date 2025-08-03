// Use PeerJS for easier WebRTC connections
const peer = new Peer();

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
sendBtn.addEventListener('click', () => {
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
});

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
    }
    chatBox.appendChild(messageElement);
    chatBox.scrollTop = chatBox.scrollHeight;
}
