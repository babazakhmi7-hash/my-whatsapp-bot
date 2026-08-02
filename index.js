const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const pino = require('pino');
const qrcode = require('qrcode-terminal');

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    
    const sock = makeWASocket({
        logger: pino({ level: 'silent' }),
        auth: state
    });

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            console.log('Scan this QR Code:');
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'close') {
            console.log('Connection closed, reconnecting...');
            startBot();
        } else if (connection === 'open') {
            console.log('Bot connected successfully!');
        }
    });

    sock.ev.on('creds.update', saveCreds);
}

startBot();
