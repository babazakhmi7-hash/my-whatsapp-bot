const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

client.on('qr', (qr) => {
    console.log('--- SCAN THIS REAL QR CODE ---');
    qrcode.generate(qr, { small: false }); // اس بار سائز بڑا اور بالکل صاف آئے گا
});

client.on('ready', () => {
    console.log('Client is ready and connected to WhatsApp successfully!');
});

client.on('auth_failure', (msg) => {
    console.error('Authentication failed', msg);
});

client.on('disconnected', (reason) => {
    console.log('Client was logged out', reason);
});

client.initialize();
