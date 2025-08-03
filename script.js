// DOM Elements
const messageArea = document.getElementById('message-area');
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');
const typingStatus = document.getElementById('typing-status');
const startCallButton = document.getElementById('start-call');
const endCallButton = document.getElementById('end-call');
const localVideo = document.getElementById('local-video');
const remoteVideo = document.getElementById('remote-video');

// WebRTC Variables
let localStream;
let peerConnection;

// Typing Indicator
let typingTimeout;
messageInput.addEventListener('input', () => {
    typingStatus.textContent = "Typing...";
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
        typingStatus.textContent = "";
    }, 1000);
});

// Send Message Function
function sendMessage() {
    const message = messageInput.value.trim();
    if (message) {
        displayMessage('You', message, true);
        messageInput.value = '';
        // In a real app, send to the other user via WebSocket/PeerJS
    }
}

sendButton.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

// Display Message in Chat
function displayMessage(sender, message, isYou = false) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', isYou ? 'you' : 'other');
    
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    messageElement.innerHTML = `
        <div>${message}</div>
        <div class="message-time">${sender} • ${time}</div>
    `;
    
    messageArea.appendChild(messageElement);
    messageArea.scrollTop = messageArea.scrollHeight;
}

// WebRTC Video Call
startCallButton.addEventListener('click', async () => {
    try {
        // Get user media (camera & mic)
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localVideo.srcObject = localStream;

        // Create peer connection (simplified)
        const config = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
        peerConnection = new RTCPeerConnection(config);

        // Add local stream to connection
        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
        });

        // Handle remote stream
        peerConnection.ontrack = (event) => {
            remoteVideo.srcObject = event.streams[0];
        };

        startCallButton.disabled = true;
        endCallButton.disabled = false;

    } catch (err) {
        console.error("Error starting call:", err);
    }
});

// End Call
endCallButton.addEventListener('click', () => {
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
    }
    if (peerConnection) {
        peerConnection.close();
    }
    localVideo.srcObject = null;
    remoteVideo.srcObject = null;
    startCallButton.disabled = false;
    endCallButton.disabled = true;
});

// Demo: Simulate receiving a message after 3 seconds
setTimeout(() => {
    displayMessage('Friend', 'Hey there! 👋');
}, 3000);