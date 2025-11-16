const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

console.log('========== TEST DE VARIABLES DE ENTORNO ==========\n');

console.log('📍 Directorio actual:', __dirname);
console.log('📍 Ruta del .env:', path.join(__dirname, '..', '.env'));
console.log('📍 ¿Existe el .env?:', require('fs').existsSync(path.join(__dirname, '..', '.env')));

console.log('\n========== VARIABLES CARGADAS ==========\n');

console.log('PORT:', process.env.PORT || '❌ NO DEFINIDO');
console.log('NODE_ENV:', process.env.NODE_ENV || '❌ NO DEFINIDO');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? '✅ DEFINIDO' : '❌ NO DEFINIDO');
console.log('ALLOWED_ORIGINS:', process.env.ALLOWED_ORIGINS || '❌ NO DEFINIDO');

console.log('\n========== FIREBASE ==========\n');

console.log('FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID || '❌ NO DEFINIDO (usará JSON)');
console.log('FIREBASE_CLIENT_EMAIL:', process.env.FIREBASE_CLIENT_EMAIL ? '✅ DEFINIDO' : '❌ NO DEFINIDO (usará JSON)');
console.log('FIREBASE_PRIVATE_KEY:', process.env.FIREBASE_PRIVATE_KEY ? '✅ DEFINIDO' : '❌ NO DEFINIDO (usará JSON)');

console.log('\n========== ARCHIVO JSON DE FIREBASE ==========\n');

const jsonPath = path.join(__dirname, 'firebase-service-account.json');
console.log('📍 Ruta del JSON:', jsonPath);
console.log('📍 ¿Existe el JSON?:', require('fs').existsSync(jsonPath));

if (require('fs').existsSync(jsonPath)) {
    try {
        const serviceAccount = require(jsonPath);
        console.log('✅ Archivo JSON válido');
        console.log('   - project_id:', serviceAccount.project_id || '❌ NO ENCONTRADO');
        console.log('   - client_email:', serviceAccount.client_email || '❌ NO ENCONTRADO');
        console.log('   - private_key:', serviceAccount.private_key ? '✅ PRESENTE' : '❌ NO ENCONTRADO');
    } catch (error) {
        console.log('❌ Error leyendo JSON:', error.message);
    }
}

console.log('\n========== RECOMENDACIÓN ==========\n');

const hasEnvVars = process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL;
const hasJsonFile = require('fs').existsSync(jsonPath);

if (!hasEnvVars && !hasJsonFile) {
    console.log('❌ NO HAY CONFIGURACIÓN DE FIREBASE');
    console.log('\n📝 OPCIONES:');
    console.log('   1. Crea backend/firebase-service-account.json (RECOMENDADO)');
    console.log('   2. O configura FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL y FIREBASE_PRIVATE_KEY en .env');
} else if (hasJsonFile) {
    console.log('✅ Configuración OK: Usando archivo JSON');
} else if (hasEnvVars) {
    console.log('✅ Configuración OK: Usando variables de entorno');
}

console.log('\n===========================================\n');