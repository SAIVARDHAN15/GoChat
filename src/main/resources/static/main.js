'use strict';

const chatPage = document.querySelector('#chat-page');
const loginPage = document.querySelector('#login-page');
const usernameForm = document.querySelector('#loginForm');
const messageForm = document.querySelector('#messageForm');
const messageInput = document.querySelector('#message');
const messageArea = document.querySelector('#messageArea');
const userListElement = document.querySelector('#usersList');
const userSearchInput = document.querySelector('#userSearch');
const chatTitle = document.querySelector('#chatTitle');
const loginError = document.querySelector('#login-error');
const onlineCountSpan = document.querySelector('#onlineCount');
const genderSelect = document.querySelector('#gender');
const encryptionIcon = document.querySelector('#encryptionIcon');

var stompClient = null;
var username = null;
var selectedGender = null;
var selectedUser = null;

var chatHistory = { 'public': [] };
var onlineUsers = {};

// Generates a symmetric key by combining the usernames.
function getSharedKey(userA, userB) {
    return [userA, userB].sort().join('');
}

function columnarEncrypt(message, key) {
    const colCount = key.length;
    let padding = (colCount - (message.length % colCount)) % colCount;
    let paddedMessage = message + '_'.repeat(padding);

    const rowCount = paddedMessage.length / colCount;

    let grid = [];
    let idx = 0;
    for(let r = 0; r < rowCount; r++) {
        let row = [];
        for(let c = 0; c < colCount; c++) {
            row.push(paddedMessage[idx++]);
        }
        grid.push(row);
    }

    let keyMap = key.split('').map((char, index) => ({ char, index }));
    keyMap.sort((a, b) => a.char.localeCompare(b.char));

    let cipherText = '';
    for(let k = 0; k < colCount; k++) {
        let originalIndex = keyMap[k].index;
        for(let r = 0; r < rowCount; r++) {
            cipherText += grid[r][originalIndex];
        }
    }
    return cipherText;
}

function columnarDecrypt(cipher, key) {
    const colCount = key.length;
    const rowCount = cipher.length / colCount;

    let keyMap = key.split('').map((char, index) => ({ char, index }));
    keyMap.sort((a, b) => a.char.localeCompare(b.char));

    let grid = Array.from({ length: rowCount }, () => Array(colCount).fill(''));

    let idx = 0;
    for(let k = 0; k < colCount; k++) {
        let originalIndex = keyMap[k].index;
        for(let r = 0; r < rowCount; r++) {
            grid[r][originalIndex] = cipher[idx++];
        }
    }

    let plainText = '';
    for(let r = 0; r < rowCount; r++) {
        for(let c = 0; c < colCount; c++) {
            plainText += grid[r][c];
        }
    }

    return plainText.replace(/_+$/, '');
}

// --- Helper: Get Current Time ---
function getFormattedTime() {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// --- 1. CONNECT & JOIN ---
function connect(event) {
    event.preventDefault();
    username = document.querySelector('#username').value.trim();
    selectedGender = genderSelect.value;

    if (username) {
        loginPage.classList.add('hidden');
        chatPage.classList.remove('hidden');

        var socket = new SockJS('/ws');
        stompClient = Stomp.over(socket);
        stompClient.connect({}, onConnected, onError);
    }
}

function onConnected() {
    stompClient.subscribe('/topic/public', onMessageReceived);
    stompClient.subscribe('/topic/private.' + username, onPrivateMessageReceived);
    stompClient.subscribe('/topic/users', onUserListReceived);

    stompClient.send("/app/chat.addUser",
        {},
        JSON.stringify({
            sender: username,
            type: 'JOIN',
            gender: selectedGender,
            publicKey: 'N/A'
        })
    );
}

function onError(error) {
    loginPage.classList.remove('hidden');
    chatPage.classList.add('hidden');
    loginError.textContent = 'Connection failed. Please retry.';
    loginError.classList.remove('hidden');
}

// --- 2. SEND MESSAGES ---
function sendMessage(event) {
    event.preventDefault();
    var messageContent = messageInput.value.trim();

    if (messageContent && stompClient) {
        var chatMessage = {
            sender: username,
            type: 'CHAT',
            timestamp: getFormattedTime() // Add timestamp here
        };

        if (selectedUser) {
            // PRIVATE CHAT
            chatMessage.recipient = selectedUser;

            const sharedKey = getSharedKey(username, selectedUser);
            const encryptedContent = columnarEncrypt(messageContent, sharedKey);

            chatMessage.content = encryptedContent;

            stompClient.send("/app/chat.private", {}, JSON.stringify(chatMessage));

            // Show plaintext locally
            const displayMsg = { ...chatMessage, content: messageContent };
            saveMessage(selectedUser, displayMsg);
            displayMessage(displayMsg);

        } else {
            // PUBLIC CHAT
            chatMessage.content = messageContent;
            stompClient.send("/app/chat.sendMessage", {}, JSON.stringify(chatMessage));
        }

        messageInput.value = '';
    }
}

// --- 3. RECEIVE MESSAGES ---
function onMessageReceived(payload) {
    var message = JSON.parse(payload.body);
    saveMessage('public', message);
    if (!selectedUser) {
        displayMessage(message);
    }
}

function onPrivateMessageReceived(payload) {
    var message = JSON.parse(payload.body);
    var chatPartner = message.sender;

    const sharedKey = getSharedKey(username, chatPartner);
    const decryptedContent = columnarDecrypt(message.content, sharedKey);

    message.content = decryptedContent;

    saveMessage(chatPartner, message);

    if (selectedUser === chatPartner) {
        displayMessage(message);
    } else {
        notifyUser(chatPartner);
    }
}

function onUserListReceived(payload) {
    var users = JSON.parse(payload.body);
    onlineUsers = {};
    users.forEach(u => {
        if (u.username !== username) {
            onlineUsers[u.username] = u;
        }
    });
    onlineCountSpan.textContent = `${Object.keys(onlineUsers).length} Online`;
    renderUserList();
}

// --- 4. UI RENDERING ---
function getGenderStyles(gender) {
    switch(gender) {
        case 'MALE': return { color: 'var(--color-male)', icon: '♂' };
        case 'FEMALE': return { color: 'var(--color-female)', icon: '♀' };
        default: return { color: 'var(--color-other)', icon: '⚧' };
    }
}

function renderUserList() {
    userListElement.innerHTML = '';

    var publicLi = document.createElement('li');
    publicLi.className = `user-item public-chat-item ${selectedUser === null ? 'active' : ''}`;
    publicLi.innerHTML = `
        <div class="avatar small" style="background-color: #b58900">P</div>
        <span>Public Lounge</span>
    `;
    publicLi.onclick = () => selectUser(null);
    userListElement.appendChild(publicLi);

    const searchTerm = userSearchInput.value.toLowerCase();
    const userNames = Object.keys(onlineUsers).filter(u => u.toLowerCase().includes(searchTerm));

    userNames.forEach(name => {
        const user = onlineUsers[name];
        const genderStyle = getGenderStyles(user.gender);

        var li = document.createElement('li');
        li.className = `user-item ${selectedUser === name ? 'active' : ''}`;
        li.id = `user-${name}`;

        li.innerHTML = `
            <div class="avatar small" style="background-color: ${genderStyle.color}">
                ${name.charAt(0)}
                <div class="gender-indicator">${genderStyle.icon}</div>
            </div>
            <span>${name}</span>
            <span class="badge hidden">0</span>
        `;
        li.onclick = () => selectUser(name);
        userListElement.appendChild(li);
    });
}

function selectUser(user) {
    selectedUser = user;

    if(user) {
        chatTitle.textContent = `Private: ${user}`;
        encryptionIcon.classList.remove('hidden');
        const badge = document.querySelector(`#user-${user} .badge`);
        if(badge) badge.classList.add('hidden');
    } else {
        chatTitle.textContent = "Public Lounge";
        encryptionIcon.classList.add('hidden');
    }

    renderUserList();
    messageArea.innerHTML = '';

    const key = user || 'public';
    const messages = chatHistory[key] || [];
    messages.forEach(displayMessage);
}

function displayMessage(message) {
    var messageLi = document.createElement('li');

    if (message.type === 'JOIN') {
        messageLi.classList.add('event-message');
        messageLi.textContent = message.sender + ' joined the secure line.';
    } else if (message.type === 'LEAVE') {
        messageLi.classList.add('event-message');
        messageLi.textContent = message.sender + ' disconnected.';
    } else {
        messageLi.className = 'message-row';
        if (message.sender === username) messageLi.classList.add('self');

        let userGender = 'OTHER';
        if (message.sender === username) userGender = selectedGender;
        else if (onlineUsers[message.sender]) userGender = onlineUsers[message.sender].gender;

        const genderStyle = getGenderStyles(userGender);

        const avatarDiv = document.createElement('div');
        avatarDiv.className = 'avatar';
        avatarDiv.style.backgroundColor = genderStyle.color;
        avatarDiv.textContent = message.sender.charAt(0);

        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';

        const senderSpan = document.createElement('span');
        senderSpan.className = 'sender';
        senderSpan.textContent = message.sender;

        const textP = document.createElement('p');
        textP.textContent = message.content;

        // Add Timestamp
        if (message.timestamp) {
            const timeSpan = document.createElement('span');
            timeSpan.className = 'timestamp';
            timeSpan.textContent = message.timestamp;
            contentDiv.appendChild(timeSpan);
        }

        contentDiv.appendChild(senderSpan);
        contentDiv.appendChild(textP);

        messageLi.appendChild(avatarDiv);
        messageLi.appendChild(contentDiv);
    }

    messageArea.appendChild(messageLi);
    messageArea.scrollTop = messageArea.scrollHeight;
}

function saveMessage(key, message) {
    if (!chatHistory[key]) chatHistory[key] = [];
    chatHistory[key].push(message);
}

function notifyUser(user) {
    const li = document.querySelector(`#user-${user}`);
    if(li) {
        const badge = li.querySelector('.badge');
        let count = parseInt(badge.textContent || '0');
        badge.textContent = count + 1;
        badge.classList.remove('hidden');
    }
}

usernameForm.addEventListener('submit', connect, true);
messageForm.addEventListener('submit', sendMessage, true);
userSearchInput.addEventListener('input', renderUserList);