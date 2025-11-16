const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') }); // Buscar .env en la raíz
const express = require('express');
const WebSocket = require('ws');
const cors = require('cors');
const admin = require('firebase-admin');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;


let firebaseConfig;
const serviceAccountPath = path.join(__dirname, 'firebase-service-account.json');

if (fs.existsSync(serviceAccountPath)) {

  const serviceAccount = require(serviceAccountPath);
  firebaseConfig = {
    credential: admin.credential.cert(serviceAccount)
  };
  console.log('✅ Firebase configurado desde archivo JSON');
} else if (process.env.FIREBASE_PROJECT_ID) {
  
  firebaseConfig = {
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL
    })
  };
  console.log('✅ Firebase configurado desde variables de entorno');
} else {
  console.error('❌ ERROR: No se encontró configuración de Firebase');
  console.error('Por favor configura:');
  console.error('1. Crea el archivo firebase-service-account.json');
  console.error('2. O configura las variables en .env');
  process.exit(1);
}

admin.initializeApp(firebaseConfig);

const db = admin.firestore();
const MESSAGES_COLLECTION = process.env.FIRESTORE_COLLECTION_MESSAGES || 'messages';
const USERS_COLLECTION = process.env.FIRESTORE_COLLECTION_USERS || 'users';

// ========== CONFIGURACIÓN DE CORS ==========
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:4000'];

app.use(cors({
  origin: (origin, callback) => {
    // Permitir requests sin origin (como mobile apps o curl)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`❌ Origen bloqueado: ${origin}`);
      callback(new Error('Origen no permitido por CORS'));
    }
  },
  credentials: true
}));

app.use(express.json());

// ========== ENDPOINT DE SALUD ==========
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    connections: clients.size,
    firebase: admin.apps.length > 0 ? 'connected' : 'disconnected'
  });
});

// ========== ENDPOINT PARA OBTENER HISTORIAL DE MENSAJES ==========
app.get('/api/messages', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    
    const snapshot = await db.collection(MESSAGES_COLLECTION)
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .get();
    
    const messages = [];
    snapshot.forEach(doc => {
      messages.push({ id: doc.id, ...doc.data() });
    });
    
    res.json({ messages: messages.reverse() });
  } catch (error) {
    console.error('Error obteniendo mensajes:', error);
    res.status(500).json({ error: 'Error al obtener mensajes' });
  }
});

// ========== CREAR SERVIDOR HTTP ==========
const server = app.listen(port, () => {
  console.log(`🚀 Backend WebSocket corriendo en http://localhost:${port}`);
  console.log(`🔒 Orígenes permitidos: ${allowedOrigins.join(', ')}`);
});

// ========== CREAR SERVIDOR WEBSOCKET ==========
const wss = new WebSocket.Server({ 
  server,
  verifyClient: (info, callback) => {
    const origin = info.origin || info.req.headers.origin;
    
    // Verificar origen
    if (origin && !allowedOrigins.includes(origin)) {
      console.warn(`❌ WebSocket bloqueado desde: ${origin}`);
      callback(false, 403, 'Origen no permitido');
      return;
    }
    
    callback(true);
  }
});

// Almacenar conexiones activas con información del usuario
const clients = new Map();

// ========== FUNCIÓN PARA VERIFICAR TOKEN JWT ==========
async function verifyToken(token) {
  try {
    // Verificar token de Firebase
    const decodedToken = await admin.auth().verifyIdToken(token);
    return {
      valid: true,
      uid: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name || decodedToken.email
    };
  } catch (error) {
    console.error('Error verificando token:', error);
    return { valid: false };
  }
}

// ========== GUARDAR MENSAJE EN FIRESTORE ==========
async function saveMessage(messageData) {
  try {
    const messageRef = await db.collection(MESSAGES_COLLECTION).add({
      ...messageData,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: new Date().toISOString()
    });
    
    console.log(`💾 Mensaje guardado con ID: ${messageRef.id}`);
    return messageRef.id;
  } catch (error) {
    console.error('❌ Error guardando mensaje:', error);
    throw error;
  }
}

// ========== CONEXIÓN WEBSOCKET ==========
wss.on('connection', async (ws, req) => {
  console.log('🔌 Nueva conexión WebSocket recibida');
  
  let clientInfo = {
    authenticated: false,
    uid: null,
    username: 'Anónimo'
  };
  
  // Esperar mensaje de autenticación
  const authTimeout = setTimeout(() => {
    if (!clientInfo.authenticated) {
      console.log('⏱️ Timeout de autenticación');
      ws.close(1008, 'Autenticación requerida');
    }
  }, 10000); // 10 segundos para autenticarse

  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data);
      
      // Manejar autenticación
      if (message.type === 'auth') {
        const verification = await verifyToken(message.token);
        
        if (verification.valid) {
          clearTimeout(authTimeout);
          clientInfo = {
            authenticated: true,
            uid: verification.uid,
            username: message.username || verification.name,
            email: verification.email
          };
          
          clients.set(ws, clientInfo);
          console.log(`✅ Usuario autenticado: ${clientInfo.username} (${clientInfo.uid})`);
          
          // Enviar confirmación
          ws.send(JSON.stringify({
            type: 'auth_success',
            message: 'Autenticación exitosa'
          }));
          
          // Enviar historial reciente
          try {
            const snapshot = await db.collection(MESSAGES_COLLECTION)
              .orderBy('timestamp', 'desc')
              .limit(20)
              .get();
            
            const history = [];
            snapshot.forEach(doc => {
              const data = doc.data();
              history.push({
                username: data.username,
                text: data.text,
                timestamp: data.createdAt || new Date().toISOString(),
                uid: data.uid
              });
            });
            
            ws.send(JSON.stringify({
              type: 'history',
              messages: history.reverse()
            }));
          } catch (error) {
            console.error('Error cargando historial:', error);
          }
          
        } else {
          ws.close(1008, 'Token inválido');
        }
        return;
      }
      
      // Verificar que esté autenticado para otros mensajes
      if (!clientInfo.authenticated) {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Debe autenticarse primero'
        }));
        return;
      }
      
      // Manejar mensaje de chat
      if (message.type === 'message' || message.text) {
        const messageData = {
          username: clientInfo.username,
          text: message.text,
          uid: clientInfo.uid,
          email: clientInfo.email,
          timestamp: new Date().toISOString()
        };
        
        // Guardar en Firestore
        await saveMessage(messageData);
        
        // Broadcast a todos los clientes autenticados
        const broadcastMessage = JSON.stringify({
          type: 'message',
          username: messageData.username,
          text: messageData.text,
          timestamp: new Date().toLocaleTimeString(),
          uid: messageData.uid
        });
        
        clients.forEach((info, client) => {
          if (client.readyState === WebSocket.OPEN && info.authenticated) {
            client.send(broadcastMessage);
          }
        });
      }
      
    } catch (error) {
      console.error('❌ Error procesando mensaje:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Error procesando mensaje'
      }));
    }
  });

  ws.on('close', () => {
    clearTimeout(authTimeout);
    const info = clients.get(ws);
    if (info) {
      console.log(`🔌 Cliente desconectado: ${info.username}`);
      clients.delete(ws);
    }
    console.log(`📊 Clientes conectados: ${clients.size}`);
  });

  ws.on('error', (error) => {
    console.error('❌ Error WebSocket:', error);
    clearTimeout(authTimeout);
    clients.delete(ws);
  });
});

// ========== MANEJO DE CIERRE GRACEFUL ==========
process.on('SIGTERM', () => {
  console.log('SIGTERM recibido. Cerrando servidor...');
  server.close(() => {
    console.log('Servidor cerrado');
    process.exit(0);
  });
});