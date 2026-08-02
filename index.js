const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const qrcode = require('qrcode-terminal');
const fs = require('fs');

// پرانا خراب ڈیٹا خود بخود صاف کرنے کے لیے
if (fs.existsSync('./auth_info_baileys')) {
    fs.rmSync('./auth_info_baileys', { recursive: true, force: true });
}

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    
    const sock = makeWASocket({
        logger: pino({ level: 'silent' }),
        auth: state,
        printQRInTerminal: true
    });

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            console.log('--------------------------------------------------');
            console.log('SCAN THIS QR CODE BELOW WITH WHATSAPP:');
            console.log('--------------------------------------------------');
            // یہاں small: true کی بجائے false رکھا ہے تاکہ کیو آر کوڈ کے ڈبے بڑے اور واضح بنیں
            qrcode.generate(qr, { small: false });
        }

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
