// DOM Elements
const appContainer = document.querySelector('.app-container');
const chatList = document.getElementById('chat-list');
const messageArea = document.getElementById('message-area');
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');
const typingIndicator = document.getElementById('typing-indicator');
const typingText = document.getElementById('typing-text');
const partnerIdDisplay = document.getElementById('partner-id');
const statusText = document.getElementById('status-text');
const statusDot = document.querySelector('.status-dot');
const newChatBtn = document.getElementById('new-chat-btn');
const createRoomBtn = document.getElementById('create-room-btn');
const roomLinkBox = document.getElementById('room-link-box');
const roomLinkInput = document.getElementById('room-link');
const copyLinkBtn = document.getElementById('copy-link-btn');
const leaveRoomBtn = document.getElementById('leave-room-btn');
const emptyState = document.querySelector('.empty-state');
const activeChat = document.getElementById('active-chat');
const connectionModal = document.getElementById('connection-modal');
const roomIdInput = document.getElementById('room-id-input');
const joinRoomBtn = document.getElementById('join-room-btn');
const cancelJoinBtn = document.getElementById('cancel-join-btn');

// PeerJS & Connection Variables
let peer;
let currentPeerId;
let dataChannel;
let activeConnection = null;
let currentRoomId = null;
let isTyping = false;
let typingTimeout;

// Initialize the app
function initApp() {
    // Generate random peer ID
    currentPeerId = `user-${Math.floor(Math.random() * 1000000)}`;
    
    // Initialize PeerJS
    peer = new Peer(currentPeerId);
    
    // PeerJS event handlers
    peer.on('open', (id) => {
        console.log('Connected to PeerJS server with ID:', id);
    });
    
    peer.on('connection', (conn) => {
        console.log('Incoming connection from:', conn.peer);
        setupDataConnection(conn);
    });
    
    peer.on('error', (err) => {
        console.error('PeerJS error:', err);
        updateConnectionStatus('disconnected');
    });
    
    // Load recent chats from localStorage
    loadRecentChats();
    
    // Set up event listeners
    setupEventListeners();
}

// Set up UI event listeners
function setupEventListeners() {
    // Message sending
    sendButton.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });
    
    // Typing indicator
    messageInput.addEventListener('input', () => {
        if (!isTyping) {
            isTyping = true;
            if (dataChannel) {
                dataChannel.send({ type: 'typing', isTyping: true });
            }
        }
        
        clearTimeout(typingTimeout);
        typingTimeout = setTimeout(() => {
            isTyping = false;
            if (dataChannel) {
                dataChannel.send({ type: 'typing', isTyping: false });
            }
        }, 1000);
    });
    
    // Room creation
    createRoomBtn.addEventListener('click', createNewRoom);
    copyLinkBtn.addEventListener('click', copyRoomLink);
    
    // Room joining
    newChatBtn.addEventListener('click', () => {
        connectionModal.style.display = 'flex';
    });
    
    joinRoomBtn.addEventListener('click', joinRoom);
    cancelJoinBtn.addEventListener('click', () => {
        connectionModal.style.display = 'none';
    });
    
    leaveRoomBtn.addEventListener('click', leaveRoom);
}

// Create a new chat room
function createNewRoom() {
    currentRoomId = `room-${Math.floor(Math.random() * 1000000)}`;
    const roomLink = `${window.location.origin}${window.location.pathname}?room=${currentRoomId}`;
    
    roomLinkInput.value = roomLink;
    roomLinkBox.style.display = 'flex';
    createRoomBtn.style.display = 'none';
    
    // Check if we're joining from a URL
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('room')) {
        joinRoom(urlParams.get('room'));
    }
}

// Join a room
function joinRoom(roomId = null) {
    const roomToJoin = roomId || roomIdInput.value.trim();
    
    if (!roomToJoin) {
        alert('Please enter a valid room ID');
        return;
    }
    
    connectionModal.style.display = 'none';
    
    // Connect to the other peer (room creator)
    const conn = peer.connect(roomToJoin);
    setupDataConnection(conn);
    
    // Update UI
    emptyState.style.display = 'none';
    activeChat.style.display = 'flex';
    partnerIdDisplay.textContent = `Anonymous (${roomToJoin.slice(0, 6)}...)`;
    updateConnectionStatus('connecting');
}

// Set up data connection
function setupDataConnection(conn) {
    dataChannel = conn;
    activeConnection = conn.peer;
    
    // Update recent chats
    addToRecentChats(conn.peer);
    
    // Data channel event handlers
    conn.on('data', (data) => {
        switch (data.type) {
            case 'message':
                displayMessage(data.sender, data.text, false);
                // Send read receipt
                if (dataChannel) {
                    dataChannel.send({ 
                        type: 'read_receipt', 
                        messageId: data.messageId 
                    });
                }
                break;
                
            case 'typing':
                if (data.isTyping) {
                    typingText.textContent = 'Anonymous is typing...';
                    typingIndicator.style.display = 'block';
                } else {
                    typingText.textContent = '';
                    typingIndicator.style.display = 'none';
                }
                break;
                
            case 'read_receipt':
                updateMessageStatus(data.messageId, 'read');
                break;
        }
    });
    
    conn.on('open', () => {
        console.log('Data connection established with:', conn.peer);
        updateConnectionStatus('connected');
    });
    
    conn.on('close', () => {
        console.log('Connection closed with:', conn.peer);
        updateConnectionStatus('disconnected');
        dataChannel = null;
        activeConnection = null;
    });
    
    conn.on('error', (err) => {
        console.error('Connection error:', err);
        updateConnectionStatus('error');
    });
}

// Send a message
function sendMessage() {
    const messageText = messageInput.value.trim();
    if (!messageText || !dataChannel) return;
    
    const messageId = Date.now().toString();
    const messageData = {
        type: 'message',
        text: messageText,
        sender: 'You',
        messageId: messageId
    };
    
    // Display message locally
    displayMessage('You', messageText, true, messageId);
    
    // Send message through data channel
    dataChannel.send(messageData);
    
    // Clear input
    messageInput.value = '';
}

// Display a message in the chat
function displayMessage(sender, text, isSent = false, messageId = null) {
    const messageElement = document.createElement('div');
    messageElement.className = `message ${isSent ? 'sent' : 'received'}`;
    
    const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    messageElement.innerHTML = `
        <div class="message-text">${text}</div>
        <div class="message-time">
            ${timeString}
            ${isSent ? '<span class="message-status" id="status-' + messageId + '">✓</span>' : ''}
        </div>
    `;
    
    messageArea.appendChild(messageElement);
    messageArea.scrollTop = messageArea.scrollHeight;
    
    // If this is a received message, mark it as delivered
    if (!isSent && dataChannel) {
        dataChannel.send({ 
            type: 'delivery_receipt', 
            messageId: messageId 
        });
    }
}

// Update message status (delivered/read)
function updateMessageStatus(messageId, status) {
    const statusElement = document.getElementById(`status-${messageId}`);
    if (statusElement) {
        if (status === 'delivered') {
            statusElement.textContent = '✓✓';
        } else if (status === 'read') {
            statusElement.textContent = '✓✓✓';
            statusElement.style.color = '#4CAF50';
        }
    }
}

// Update connection status UI
function updateConnectionStatus(status) {
    switch (status) {
        case 'connecting':
            statusDot.style.backgroundColor = 'var(--status-typing)';
            statusText.textContent = 'Connecting...';
            break;
        case 'connected':
            statusDot.style.backgroundColor = 'var(--status-online)';
            statusText.textContent = 'Online';
            break;
        case 'disconnected':
            statusDot.style.backgroundColor = 'var(--status-offline)';
            statusText.textContent = 'Offline';
            break;
        case 'error':
            statusDot.style.backgroundColor = 'var(--status-offline)';
            statusText.textContent = 'Connection error';
            break;
    }
}

// Leave the current room
function leaveRoom() {
    if (dataChannel) {
        dataChannel.close();
    }
    
    dataChannel = null;
    activeConnection = null;
    
    // Clear chat
    messageArea.innerHTML = '';
    
    // Reset UI
    activeChat.style.display = 'none';
    emptyState.style.display = 'flex';
    roomLinkBox.style.display = 'none';
    createRoomBtn.style.display = 'block';
}

// Copy room link to clipboard
function copyRoomLink() {
    roomLinkInput.select();
    document.execCommand('copy');
    
    // Visual feedback
    const originalText = copyLinkBtn.innerHTML;
    copyLinkBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
    setTimeout(() => {
        copyLinkBtn.innerHTML = originalText;
    }, 2000);
}

// Recent chats functionality
function loadRecentChats() {
    const recentChats = JSON.parse(localStorage.getItem('recentChats')) || [];
    
    recentChats.forEach(chat => {
        addChatToSidebar(chat.id, chat.lastMessage);
    });
}

function addToRecentChats(peerId, lastMessage = 'New connection') {
    let recentChats = JSON.parse(localStorage.getItem('recentChats')) || [];
    
    // Remove if already exists
    recentChats = recentChats.filter(chat => chat.id !== peerId);
    
    // Add to beginning
    recentChats.unshift({
        id: peerId,
        lastMessage: lastMessage,
        timestamp: Date.now()
    });
    
    // Keep only last 10 chats
    if (recentChats.length > 10) {
        recentChats = recentChats.slice(0, 10);
    }
    
    localStorage.setItem('recentChats', JSON.stringify(recentChats));
    addChatToSidebar(peerId, lastMessage);
}

function addChatToSidebar(peerId, lastMessage) {
    const chatItem = document.createElement('div');
    chatItem.className = 'chat-item';
    chatItem.innerHTML = `
        <div class="chat-item-avatar">${peerId.slice(0, 2)}</div>
        <div class="chat-item-info">
            <div class="chat-item-name">Anonymous (${peerId.slice(0, 6)}...)</div>
            <div class="chat-item-lastmsg">${lastMessage}</div>
        </div>
        <div class="chat-item-time">Just now</div>
    `;
    
    chatItem.addEventListener('click', () => {
        // Reconnect to this peer
        joinRoom(peerId);
    });
    
    chatList.insertBefore(chatItem, chatList.firstChild);
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);

// Handle room ID in URL
window.addEventListener('load', () => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('room')) {
        createRoomBtn.click();
    }
});
