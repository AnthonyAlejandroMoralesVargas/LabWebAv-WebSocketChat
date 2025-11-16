var currentUser = null;
var authToken = null;

document.addEventListener('DOMContentLoaded', () => {
    updateLoginForm();
});

function updateLoginForm() {
    const loginForm = document.getElementById('loginForm');
    loginForm.innerHTML = `
        <div class="mb-3">
            <label for="emailInput" class="form-label">Email</label>
            <input 
                type="email" 
                class="form-control form-control-lg" 
                id="emailInput" 
                placeholder="tu@email.com" 
                required
                autocomplete="email"
            >
        </div>
        <div class="mb-3">
            <label for="passwordInput" class="form-label">Contraseña</label>
            <input 
                type="password" 
                class="form-control form-control-lg" 
                id="passwordInput" 
                placeholder="Mínimo 6 caracteres" 
                required
                minlength="6"
                autocomplete="current-password"
            >
        </div>
        <div class="mb-3">
            <label for="usernameInput" class="form-label">Nombre de Usuario</label>
            <input 
                type="text" 
                class="form-control form-control-lg" 
                id="usernameInput" 
                placeholder="Tu nombre" 
                required
                maxlength="20"
                autocomplete="username"
            >
        </div>
        <button type="submit" class="btn btn-primary btn-lg w-100 mb-2">
            <i class="bi bi-box-arrow-in-right me-2"></i>Iniciar Sesión
        </button>
        <button type="button" id="registerBtn" class="btn btn-outline-primary btn-lg w-100">
            <i class="bi bi-person-plus me-2"></i>Registrarse
        </button>
        <div class="text-center mt-3">
            <button type="button" id="randomUserBtn" class="btn btn-link btn-sm">
                <i class="bi bi-shuffle me-1"></i>Usar usuario aleatorio
            </button>
        </div>
    `;

    loginForm.addEventListener('submit', handleLoginSubmit);
    document.getElementById('registerBtn').addEventListener('click', handleRegister);
    document.getElementById('randomUserBtn').addEventListener('click', handleRandomUser);
}

async function handleLoginSubmit(e) {
    e.preventDefault();
    const email = document.getElementById('emailInput').value.trim();
    const password = document.getElementById('passwordInput').value;
    const displayName = document.getElementById('usernameInput').value.trim();

    try {
        showLoading(true);
        
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        currentUser = userCredential.user;
        
        if (displayName && currentUser.displayName !== displayName) {
            await currentUser.updateProfile({ displayName });
        }
        
        authToken = await currentUser.getIdToken();
        username = currentUser.displayName || displayName;
        
        console.log('✅ Login exitoso:', username);
        
        if (typeof showChatScreen === 'function') {
            showChatScreen();
            connectWebSocket();
        }
        
    } catch (error) {
        console.error('Error en login:', error);
        alert(getErrorMessage(error.code));
    } finally {
        showLoading(false);
    }
}

async function handleRegister() {
    const email = document.getElementById('emailInput').value.trim();
    const password = document.getElementById('passwordInput').value;
    const displayName = document.getElementById('usernameInput').value.trim();

    if (!email || !password || !displayName) {
        alert('Por favor completa todos los campos');
        return;
    }

    try {
        showLoading(true);
        
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        currentUser = userCredential.user;
        
        await currentUser.updateProfile({ displayName });
        
        await db.collection('users').doc(currentUser.uid).set({
            email: currentUser.email,
            displayName: displayName,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            lastLogin: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        authToken = await currentUser.getIdToken();
        username = displayName;
        
        console.log('✅ Registro exitoso:', username);
        alert('¡Cuenta creada exitosamente!');
        
        if (typeof showChatScreen === 'function') {
            showChatScreen();
            connectWebSocket();
        }
        
    } catch (error) {
        console.error('Error en registro:', error);
        alert(getErrorMessage(error.code));
    } finally {
        showLoading(false);
    }
}

async function handleRandomUser() {
    try {
        showLoading(true);
        
        const response = await fetch('https://randomuser.me/api/');
        const data = await response.json();
                 
        const user = data.results[0];
                
        const email = user.email;
        const password = 'Random123!';
        const displayName = `${user.name.first} ${user.name.last}`;
                
        document.getElementById('emailInput').value = email;
        document.getElementById('passwordInput').value = password;
        document.getElementById('usernameInput').value = displayName;
                
        alert(`Usuario generado: ${displayName}\nEmail: ${email}\nContraseña: ${password}\n\nPuedes registrarte con estos datos o modificarlos.`);
        
    } catch (error) {
        console.error('Error al obtener usuario aleatorio:', error);
        alert('Error al generar usuario aleatorio. Por favor intenta manualmente.');
    } finally {
        showLoading(false);
    }
}

function getErrorMessage(errorCode) {
    const errorMessages = {
        'auth/email-already-in-use': 'Este email ya está registrado',
        'auth/invalid-email': 'Email inválido',
        'auth/user-not-found': 'Usuario no encontrado',
        'auth/wrong-password': 'Contraseña incorrecta',
        'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres',
        'auth/network-request-failed': 'Error de conexión. Verifica tu internet.',
        'auth/too-many-requests': 'Demasiados intentos. Intenta más tarde.',
        'auth/invalid-credential': 'Credenciales inválidas. Verifica tu email y contraseña.'
    };
    
    return errorMessages[errorCode] || 'Error de autenticación: ' + errorCode;
}

function showLoading(show) {
    const loginForm = document.getElementById('loginForm');
    const buttons = loginForm.querySelectorAll('button');
    const inputs = loginForm.querySelectorAll('input');
    
    buttons.forEach(btn => btn.disabled = show);
    inputs.forEach(input => input.disabled = show);
    
    if (show) {
        loginForm.style.opacity = '0.6';
    } else {
        loginForm.style.opacity = '1';
    }
}

auth.onAuthStateChanged(async (user) => {
    if (user && !currentUser) {
        currentUser = user;
        authToken = await user.getIdToken();
        username = user.displayName || user.email;
        
        console.log('✅ Estado de autenticación:', username);

        try {
            await db.collection('users').doc(user.uid).update({
                lastLogin: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (error) {
            console.error('Error actualizando último login:', error);
        }
    }
});

console.log('✅ auth.js cargado');