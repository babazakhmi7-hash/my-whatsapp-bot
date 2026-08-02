const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');
const path = require('path');

async function startBot() {
    const sessionDir = './auth_info_baileys';
    
    if (!fs.existsSync(sessionDir)) {
        fs.mkdirSync(sessionDir, { recursive: true });
    }

    // اگر آپ نے Railway کے Variables میں SESSION_ID ڈالا ہے تو یہ اسے خود بخود فائل بنا لے گا
    if (process.env.SESSION_ID) {
        const sessFile = path.join(sessionDir, 'creds.json');
        if (!fs.existsSync(sessFile)) {
            // سیشن آئی ڈی کو یہاں سیو کیا جا رہا ہے
            let sessData = process.env.SESSION_ID;
            // اگر سیشن آئی ڈی کسی پریفکس کے ساتھ ہو تو اسے صاف کیا جا سکتا ہے
            if (sessData.startsWith('Session_')) {
                sessData = sessData.replace('Session_', '');
            }
            try {
                // بیس 64 یا ڈائریکٹ جےسن کو رائٹ کرنا
                fs.writeFileSync(sessFile, Buffer.from(sessData, 'base64').toString('utf-8'));
            } catch (e) {
                fs.writeFileSync(sessFile, sessData);
            }
        }
    }

    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
    
    const sock = makeWASocket({
        logger: pino({ level: 'silent' }),
        auth: state,
        printQRInTerminal: false
    });

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('Connection closed, reconnecting...', shouldReconnect);
            if (shouldReconnect) {
                startBot();
            }
        } else if (connection === 'open') {
            console.log('SUCCESS! Bot connected to WhatsApp successfully via Session ID!');
        }
    });

    sock.ev.on('creds.update', saveCreds);
}

startBot();
