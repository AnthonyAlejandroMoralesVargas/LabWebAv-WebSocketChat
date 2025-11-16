// ========== VARIABLES GLOBALES ==========
let ws = null;
let username = '';
let currentTheme = 'light';
let isConnected = false;

// ========== ELEMENTOS DEL DOM ==========
const loginScreen = document.getElementById('loginScreen');
const chatScreen = document.getElementById('chatScreen');
const loginForm = document.getElementById('loginForm');
const usernameInput = document.getElementById('usernameInput');
const currentUsernameSpan = document.getElementById('currentUsername');
const messagesContainer = document.getElementById('messagesContainer');
const messageForm = document.getElementById('messageForm');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const themeToggle = document.getElementById('themeToggle');
const logoutBtn = document.getElementById('logoutBtn');
const connectionStatus = document.getElementById('connectionStatus');
const statusText = document.getElementById('statusText');

// ========== INICIALIZACIÓN ==========
document.addEventListener('DOMContentLoaded', () => {
    loadTheme();
    setupEventListeners();
    usernameInput.focus();
});

// ========== CONFIGURAR EVENT LISTENERS ==========
function setupEventListeners() {
    loginForm.addEventListener('submit', handleLogin);
    messageForm.addEventListener('submit', handleSendMessage);
    themeToggle.addEventListener('click', toggleTheme);
    logoutBtn.addEventListener('click', handleLogout);
    
    // Enter en el input de mensaje
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage(e);
        }
    });
}

// ========== MANEJAR LOGIN ==========
function handleLogin(e) {
    e.preventDefault();
    const usernameValue = usernameInput.value.trim();
    
    if (usernameValue) {
        username = usernameValue;
        showChatScreen();
        connectWebSocket();
    }
}

// ========== CONECTAR WEBSOCKET ==========
function connectWebSocket() {
    // Conectar al backend en el puerto 3000
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//localhost:3000`;
    
    updateConnectionStatus('connecting');
    
    try {
        ws = new WebSocket(wsUrl);
        
        ws.onopen = () => {
            console.log('✅ Conectado al servidor WebSocket');
            isConnected = true;
            updateConnectionStatus('connected');
            addSystemMessage('Conectado al chat');
            messageInput.disabled = false;
            sendBtn.disabled = false;
            messageInput.focus();
        };
        
        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                addReceivedMessage(data);
            } catch (error) {
                console.error('Error al parsear mensaje:', error);
            }
        };
        
        ws.onerror = (error) => {
            console.error('❌ Error en WebSocket:', error);
            isConnected = false;
            updateConnectionStatus('error');
        };
        
        ws.onclose = () => {
            console.log('🔌 Desconectado del servidor WebSocket');
            isConnected = false;
            updateConnectionStatus('disconnected');
            addSystemMessage('Desconectado del chat. Intentando reconectar...');
            messageInput.disabled = true;
            sendBtn.disabled = true;
            
            // Intentar reconexión después de 3 segundos
            setTimeout(() => {
                if (username) {
                    connectWebSocket();
                }
            }, 3000);
        };
    } catch (error) {
        console.error('Error al crear WebSocket:', error);
        updateConnectionStatus('error');
    }
}

// ========== ACTUALIZAR ESTADO DE CONEXIÓN ==========
function updateConnectionStatus(status) {
    connectionStatus.className = 'connection-status mt-2';
    
    switch (status) {
        case 'connected':
            connectionStatus.classList.add('connected');
            statusText.textContent = 'Conectado';
            break;
        case 'disconnected':
            connectionStatus.classList.add('disconnected');
            statusText.textContent = 'Desconectado';
            break;
        case 'connecting':
            statusText.textContent = 'Conectando...';
            break;
        case 'error':
            connectionStatus.classList.add('disconnected');
            statusText.textContent = 'Error de conexión';
            break;
    }
}

// ========== MANEJAR ENVÍO DE MENSAJE ==========
function handleSendMessage(e) {
    e.preventDefault();
    
    const messageText = messageInput.value.trim();
    
    if (!messageText) {
        return;
    }
    
    if (!isConnected || !ws || ws.readyState !== WebSocket.OPEN) {
        alert('No hay conexión con el servidor. Por favor espera...');
        return;
    }
    
    const message = {
        username: username,
        text: messageText
    };
    
    try {
        // Enviar mensaje al servidor
        ws.send(JSON.stringify(message));
        
        // Limpiar input
        messageInput.value = '';
        messageInput.focus();
    } catch (error) {
        console.error('Error al enviar mensaje:', error);
        alert('Error al enviar el mensaje. Por favor intenta de nuevo.');
    }
}

// ========== AGREGAR MENSAJE RECIBIDO (Alineado a la DERECHA) ==========
function addReceivedMessage(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message message-received';
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    const usernameDiv = document.createElement('div');
    usernameDiv.className = 'message-username';
    usernameDiv.textContent = message.username;
    
    const textDiv = document.createElement('div');
    textDiv.className = 'message-text';
    textDiv.textContent = message.text;
    
    const timeDiv = document.createElement('div');
    timeDiv.className = 'message-time';
    timeDiv.textContent = message.timestamp || formatTime(new Date());
    
    contentDiv.appendChild(usernameDiv);
    contentDiv.appendChild(textDiv);
    contentDiv.appendChild(timeDiv);
    messageDiv.appendChild(contentDiv);
    
    messagesContainer.appendChild(messageDiv);
    scrollToBottom();
}

// ========== AGREGAR MENSAJE DEL SISTEMA ==========
function addSystemMessage(text) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'system-message';
    messageDiv.innerHTML = `<i class="bi bi-info-circle me-1"></i>${text}`;
    messagesContainer.appendChild(messageDiv);
    scrollToBottom();
}

// ========== FORMATEAR TIEMPO ==========
function formatTime(date) {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
}

// ========== SCROLL AL FINAL ==========
function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// ========== MOSTRAR PANTALLA DE CHAT ==========
function showChatScreen() {
    loginScreen.classList.add('d-none');
    chatScreen.classList.remove('d-none');
    currentUsernameSpan.textContent = username;
}

// ========== MOSTRAR PANTALLA DE LOGIN ==========
function showLoginScreen() {
    chatScreen.classList.add('d-none');
    loginScreen.classList.remove('d-none');
    usernameInput.value = '';
    usernameInput.focus();
}

// ========== MANEJAR LOGOUT ==========
function handleLogout() {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
    }
    
    ws = null;
    username = '';
    isConnected = false;
    messagesContainer.innerHTML = '';
    
    showLoginScreen();
}

// ========== TOGGLE TEMA ==========
function toggleTheme() {
    currentTheme = currentTheme === 'light' ? 'dark' : 'light';
    applyTheme();
    saveTheme();
}

// ========== APLICAR TEMA ==========
function applyTheme() {
    if (currentTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        themeToggle.innerHTML = '<i class="bi bi-sun-fill"></i>';
    } else {
        document.documentElement.removeAttribute('data-theme');
        themeToggle.innerHTML = '<i class="bi bi-moon-stars-fill"></i>';
    }
}

// ========== GUARDAR TEMA EN LOCALSTORAGE ==========
function saveTheme() {
    try {
        localStorage.setItem('chatTheme', currentTheme);
    } catch (error) {
        console.warn('No se pudo guardar el tema:', error);
    }
}

// ========== CARGAR TEMA DESDE LOCALSTORAGE ==========
function loadTheme() {
    try {
        const savedTheme = localStorage.getItem('chatTheme');
        if (savedTheme) {
            currentTheme = savedTheme;
            applyTheme();
        }
    } catch (error) {
        console.warn('No se pudo cargar el tema:', error);
    }
}

// ========== PREVENIR CIERRE ACCIDENTAL ==========
window.addEventListener('beforeunload', (e) => {
    if (isConnected) {
        e.preventDefault();
        e.returnValue = '';
    }
});