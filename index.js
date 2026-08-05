const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, downloadMediaMessage } = require('@whiskeysockets/baileys');
const pino = require('pino');
const qrcode = require('qrcode-terminal');

const BOT_NAME = "✿شہزاد زخمی✿";
const CREATOR_NAME = "شہزاد زخمی 007";

const deletedMessages = new Map();
const linkWarnings = new Map();

const reactions = {
    tagall: '📢',
    k: '👢',
    allk: '💀',
    del: '🔄',
    s: '🎨',
    vv: '👁️',
    d: '🗑️',
    a: '👑',
    des: '⚡',
    mp3: '🎵',
    play: '🎧',
    default: '🔥'
};

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    const sock = makeWASocket({
        logger: pino({ level: 'silent' }),
        auth: state,
        browser: ["Chrome (Linux)", "", ""]
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) {
            console.log(`\n📱 Scan this QR Code for ${BOT_NAME}:\n`);
            qrcode.generate(qr, { small: true });
        }
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) {
                startBot();
            } else {
                console.log('⚠️ Connection logged out. Please re-scan.');
            }
        } else if (connection === 'open') {
            console.log(`\n🔥 ${BOT_NAME} Connected Successfully!\n`);
        }
    });

    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message) return;
        
        const sender = msg.key.remoteJid;
        if (!deletedMessages.has(sender)) {
            deletedMessages.set(sender, []);
        }
        const chatStore = deletedMessages.get(sender);
        chatStore.push({ key: msg.key, message: msg.message, pushName: msg.pushName, time: Date.now() });
        
        const fiveMinsAgo = Date.now() - (5 * 60 * 1000);
        while (chatStore.length > 0 && chatStore[0].time < fiveMinsAgo) {
            chatStore.shift();
        }

        const messageType = Object.keys(msg.message)[0];
        let body = '';
        if (messageType === 'conversation') {
            body = msg.message.conversation;
        } else if (messageType === 'extendedTextMessage') {
            body = msg.message.extendedTextMessage.text;
        } else if (messageType === 'imageMessage') {
            body = msg.message.imageMessage.caption || '';
        } else if (messageType === 'videoMessage') {
            body = msg.message.videoMessage.caption || '';
        }

        const isGroup = sender.endsWith('@g.us');
        let groupMembers = [];
        let botNumber = sock.user.id ? sock.user.id.split(':')[0] + '@s.whatsapp.net' : '';
        let isSenderAdmin = false;
        let isBotAdmin = true;

        if (isGroup) {
            try {
                const meta = await sock.groupMetadata(sender);
                groupMembers = meta.participants;
                const senderId = msg.key.participant || msg.participant;
                isSenderAdmin = groupMembers.find(p => p.id === senderId)?.admin;
                const botParticipant = groupMembers.find(p => p.id === botNumber);
                if (botParticipant && botParticipant.admin === null) {
                    isBotAdmin = false;
                }
            } catch (e) {}
        }

        if (isGroup && body && !msg.key.fromMe && !isSenderAdmin) {
            const hasLink = /https?:\/\/|chat\.whatsapp\.com|t\.me|wa\.me/i.test(body);
            if (hasLink) {
                try {
                    await sock.sendMessage(sender, { delete: msg.key });
                    const badUser = msg.key.participant || msg.participant;
                    
                    if (!linkWarnings.has(sender)) linkWarnings.set(sender, new Map());
                    let userWarnings = linkWarnings.get(sender);
                    let count = userWarnings.get(badUser) || 0;

                    if (count === 0) {
                        userWarnings.set(badUser, 1);
                        await sock.sendMessage(sender, { text: `⚠️ Warning! Group mein link bhejna allowed nahi hai. Dobara bheja toh action liya jaega! ~ ${BOT_NAME}` });
                    } else {
                        if (isBotAdmin) {
                            await sock.groupParticipantsUpdate(sender, [badUser], "remove");
                            await sock.sendMessage(sender, { text: `🚫 Doosri baar link bhejne par user ko remove kar diya gaya hai! ~ ${BOT_NAME}` });
                        }
                    }
                } catch (e) {}
                return;
            }
        }

        if (!body.startsWith('.')) return;

        const args = body.slice(1).trim().split(/ +/);
        const command = args.shift().toLowerCase();
        const q = args.join(' ');
        
        try {
            const emoji = reactions[command] || reactions.default;
            await sock.sendMessage(sender, { react: { text: emoji, key: msg.key } });
        } catch (e) {}

        const contextInfo = msg.message.extendedTextMessage?.contextInfo;
        let targetUser = contextInfo?.participant || contextInfo?.remoteJid;
        
        if (!targetUser && contextInfo && contextInfo.stanzaId) {
            const store = deletedMessages.get(sender) || [];
            const foundMsg = store.find(item => item.key.id === contextInfo.stanzaId);
            if (foundMsg) {
                targetUser = foundMsg.key.participant || foundMsg.key.remoteJid;
            }
        }

        switch (command) {
            case 'tagall':
                if (!isGroup) return;
                let teks = `╔═════════════════╗\n║  👑 *${BOT_NAME}* 👑\n╚═════════════════╝\n\n📢 *Message:* ${q || 'Attention Everyone!'}\n\n`;
                for (let mem of groupMembers) {
                    teks += `╠➥ @${mem.id.split('@')[0]}\n`;
                }
                teks += `╚═════════════════╝`;
                await sock.sendMessage(sender, { text: teks, mentions: groupMembers.map(a => a.id) }, { quoted: msg });
                break;

            case 'k':
                if (!isGroup || !targetUser) return;
                try {
                    await sock.groupParticipantsUpdate(sender, [targetUser], "remove");
                    await sock.sendMessage(sender, { text: `✅ Member kicked successfully! ~ ${BOT_NAME}` });
                } catch (e) {}
                break;

            case 'allk':
                if (!isGroup || !isBotAdmin || !isSenderAdmin) return;
                await sock.sendMessage(sender, { text: `⚠️ Group saaf kiya ja raha hai... ~ ${BOT_NAME}` });
                for (let mem of groupMembers) {
                    if (mem.id !== botNumber && !mem.admin) {
                        try { await sock.groupParticipantsUpdate(sender, [mem.id], "remove"); } catch (e) {}
                    }
                }
                break;

            case 'del':
                if (!deletedMessages.has(sender)) return;
                const store = deletedMessages.get(sender);
                if (store.length > 1) {
                    const lastMsg = store[store.length - 2];
                    const recoverUser = lastMsg.key.participant || sender;
                    await sock.sendMessage(sender, { text: `🔄 *Deleted Message Recovered!*\n👤 *Sender:* @${recoverUser.split('@')[0]}`, mentions: [recoverUser] }, { quoted: lastMsg });
                } else {
                    await sock.sendMessage(sender, { text: `❌ Koi deleted message nahi mila. ~ ${BOT_NAME}` });
                }
                break;

            case 's':
                try {
                    let mediaMsg = contextInfo?.quotedMessage ? { message: contextInfo.quotedMessage } : msg;
                    let buffer = await downloadMediaMessage(mediaMsg, 'buffer', {}, { logger: pino({ level: 'silent' }) });
                    await sock.sendMessage(sender, { sticker: buffer }, { quoted: msg });
                } catch (e) {
                    await sock.sendMessage(sender, { text: `⚠️ Kisi Image par reply karke .s likhein! ~ ${BOT_NAME}` });
                }
                break;

            case 'vv':
                try {
                    let quotedMsg = contextInfo?.quotedMessage;
                    if (!quotedMsg) return;
                    let mediaType = Object.keys(quotedMsg)[0];
                    if (mediaType.includes('Message')) {
                        let mediaMsg = { message: quotedMsg };
                        let buffer = await downloadMediaMessage(mediaMsg, 'buffer', {}, { logger: pino({ level: 'silent' }) });
                        if (mediaType.includes('image')) {
                            await sock.sendMessage(sender, { image: buffer, caption: `👁️ View Once Opened by ${BOT_NAME}` }, { quoted: msg });
                        } else if (mediaType.includes('video')) {
                            await sock.sendMessage(sender, { video: buffer, caption: `👁️ View Once Opened by ${BOT_NAME}` }, { quoted: msg });
                        } else if (mediaType.includes('audio')) {
                            await sock.sendMessage(sender, { audio: buffer, mimetype: 'audio/mp4', ptt: true }, { quoted: msg });
                        }
                    }
                } catch (e) {
                    await sock.sendMessage(sender, { text: `⚠️ View Once media par reply karke .vv likhein!` });
                }
                break;

            case 'd':
                if (!contextInfo?.stanzaId) return;
                try {
                    let targetKey = { remoteJid: sender, id: contextInfo.stanzaId, fromMe: false, participant: targetUser };
                    await sock.sendMessage(sender, { delete: targetKey });
                } catch (e) {
                    try {
                        await sock.sendMessage(sender, { delete: { remoteJid: sender, id: contextInfo.stanzaId } });
                    } catch (err) {}
                }
                break;

            case 'a':
                if (!isGroup || !targetUser) return;
                try {
                    await sock.groupParticipantsUpdate(sender, [targetUser], "promote");
                    await sock.sendMessage(sender, { text: `✅ Member ko Admin bana diya gaya hai! ~ ${BOT_NAME}` });
                } catch (e) {}
                break;

            case 'des':
                if (!isGroup || !targetUser) return;
                try {
                    await sock.groupParticipantsUpdate(sender, [targetUser], "demote");
                    await sock.sendMessage(sender, { text: `✅ Member ko Admin se hata diya gaya hai! ~ ${BOT_NAME}` });
                } catch (e) {}
                break;

            case 'mp3':
                try {
                    let mediaMsg = contextInfo?.quotedMessage ? { message: contextInfo.quotedMessage } : msg;
                    let buffer = await downloadMediaMessage(mediaMsg, 'buffer', {}, { logger: pino({ level: 'silent' }) });
                    await sock.sendMessage(sender, { 
                        audio: buffer, 
                        mimetype: 'audio/mp4', 
                        ptt: false,
                        caption: `🎵 Audio converted by: *${CREATOR_NAME}*`
                    }, { quoted: msg });
                } catch (e) {
                    await sock.sendMessage(sender, { text: `⚠️ Kisi Video par reply karke .mp3 likhein! ~ ${BOT_NAME}` });
                }
                break;

            case 'play':
                if (!q) {
                    await sock.sendMessage(sender, { text: `⚠️ Gaane ka naam likhein! Jaise: .play Sajni ~ ${BOT_NAME}` });
                    return;
                }
                await sock.sendMessage(sender, { text: `🎵 *${BOT_NAME}* \n🔍 Searching for "${q}"...\n✨ Powered by: *${CREATOR_NAME}*` }, { quoted: msg });
                break;

            default:
                break;
        }
    });
}

startBot();
