// Generate a random room ID if not in URL
let roomId = window.location.hash.substring(1);
if (!roomId) {
    roomId = Math.random().toString(36).substring(2, 8);
    window.location.hash = roomId;
}

document.getElementById('room-id').value = `${window.location.origin}${window.location.pathname}#${roomId}`;

// Copy Room Link
document.getElementById('copy-btn').addEventListener('click', () => {
    const roomInput = document.getElementById('room-id');
    roomInput.select();
    document.execCommand('copy');
    alert("Room link copied! Share it with your friend.");
});

// WebRTC Setup
let peerConnection;
const chatBox = document.getElementById('chat-box');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const typingIndicator = document.getElementById('typing-indicator');

// Create a simple data channel for messaging
async function setupWebRTC() {
    peerConnection = new RTCPeerConnection();

    // Handle incoming messages
    peerConnection.ondatachannel = (event) => {
        const dataChannel = event.channel;
        setupDataChannel(dataChannel);
    };

    // Create a data channel for sending messages
    const dataChannel = peerConnection.createDataChannel('chat');
    setupDataChannel(dataChannel);

    // Create an offer and set it as local description
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    // Simulate signaling (in a real app, this would go through a server)
    const offerString = JSON.stringify(peerConnection.localDescription);
    const simulatedRemoteAnswer = await simulateSignaling(offerString);

    // Set the remote description
    await peerConnection.setRemoteDescription(JSON.parse(simulatedRemoteAnswer));
}

// Simulate signaling (for demo purposes)
async function simulateSignaling(offer) {
    // In a real app, this would be sent to another peer via a server
    const tempPeer = new RTCPeerConnection();
    await tempPeer.setRemoteDescription(JSON.parse(offer));
    const answer = await tempPeer.createAnswer();
    await tempPeer.setLocalDescription(answer);
    return JSON.stringify(tempPeer.localDescription);
}

// Handle data channel events
function setupDataChannel(channel) {
    channel.onopen = () => {
        document.querySelector('.connection-status').textContent = "🟢 Connected";
    };

    channel.onmessage = (event) => {
        const message = JSON.parse(event.data);
        if (message.type === 'text') {
            addMessage(message.content, 'remote');
        } else if (message.type === 'typing') {
            typingIndicator.textContent = "Peer is typing...";
            setTimeout(() => {
                typingIndicator.textContent = "";
            }, 2000);
        }
    };
}

// Send a message
sendBtn.addEventListener('click', () => {
    const message = messageInput.value;
    if (message.trim() === '') return;

    // Send via WebRTC data channel
    if (peerConnection && peerConnection.dataChannel) {
        peerConnection.dataChannel.send(JSON.stringify({
            type: 'text',
            content: message
        }));
    }

    addMessage(message, 'local');
    messageInput.value = '';
});

// Typing indicator
messageInput.addEventListener('input', () => {
    if (peerConnection && peerConnection.dataChannel) {
        peerConnection.dataChannel.send(JSON.stringify({
            type: 'typing'
        }));
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

// Initialize WebRTC
setupWebRTC();
