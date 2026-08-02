const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, Browsers } = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');

if (fs.existsSync('./auth_info_baileys')) {
    fs.rmSync('./auth_info_baileys', { recursive: true, force: true });
}

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    
    const sock = makeWASocket({
        logger: pino({ level: 'silent' }),
        auth: state,
        printQRInTerminal: false,
        browser: Browsers.macOS('Desktop') // اسے براؤزر کا فیک سگنل ملے گا تاکہ کنکشن بند نہ ہو
    });

    // اپنا واٹس ایپ نمبر یہاں لکھیں (بغیر پلس کے، ملک کے کوڈ کے ساتھ)
    const phoneNumber = "923336368652"; 

    if (!sock.authState.creds.registered) {
        setTimeout(async () => {
            try {
                console.log('Requesting pairing code from WhatsApp...');
                let code = await sock.requestPairingCode(phoneNumber);
                console.log(`\n========================================`);
                console.log(` NEW PAIRING CODE IS: ${code} `);
                console.log(`========================================\n`);
            } catch (err) {
                console.log('Error getting pairing code:', err);
            }
        }, 8000); // یہاں وقت بڑھا کر 8 سیکنڈ کر دیا ہے تاکہ کنکشن پکا بن جائے
    }

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('Connection closed, reconnecting...', shouldReconnect);
            if (shouldReconnect) {
                startBot();
            }
        } else if (connection === 'open') {
            console.log('SUCCESS! Bot connected to WhatsApp successfully!');
        }
    });

    sock.ev.on('creds.update', saveCreds);
}

startBot();
