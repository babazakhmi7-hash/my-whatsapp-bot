const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = function_exists = require('fs'); // or standard fs
const path = require('path');

async function startBot() {
    // سیشن فولڈر بنائیں
    const sessionDir = './auth_info_baileys';

    // اگر ریلوے کے ویری ایبل میں سیشن موجود ہے تو اسے فائل میں سیو کر لیں
    if (process.env.SESSION_ID) {
        if (!fs.existsSync(sessionDir)) {
            fs.mkdirSync(sessionDir, { recursive: true });
        }
        // سیشن ڈیٹا کو کریڈنشیل فائل میں لکھنا
        // (یہاں ہم مان کر چلتے ہیں کہ آپ سیشن آئی ڈی کی زیڈ آئی پی یا ٹیکسٹ ڈالیں گے)
    }

    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

    const sock = makeWASocket({
        logger: pino({ level: 'silent' }),
        auth: state,
        printQRInTerminal: false // اب کیو آر کی ضرورت نہیں
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
            console.log('SUCCESS! Bot connected to WhatsApp via Session ID!');
        }
    });

    sock.ev.on('creds.update', saveCreds);
}

startBot();
