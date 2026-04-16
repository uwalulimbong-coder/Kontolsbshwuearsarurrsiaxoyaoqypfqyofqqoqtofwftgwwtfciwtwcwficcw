require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const Database = require('../core/database.js');
const InstagramEngine = require('../core/instagram.js');

const TOKEN = process.env.REGISTER_BOT_TOKEN;
if (!TOKEN) {
    console.error('❌ REGISTER_BOT_TOKEN tidak ditemukan di .env');
    process.exit(1);
}

const bot = new TelegramBot(TOKEN, { polling: true });
const engine = new InstagramEngine();

const userState = new Map();
const userPhoneQueue = new Map();
const userCountryCode = new Map();

console.log('📋 Bot REGISTER siap.');

// ============================================
// MIDDLEWARE AKSES
// ============================================
function checkAccess(chatId, userId, requireAdmin = false) {
    if (requireAdmin) {
        if (!Database.isAdmin(userId)) {
            bot.sendMessage(chatId, '❌ *AKSES DITOLAK*\n\nPerintah ini hanya untuk Owner/Admin.', { parse_mode: 'Markdown' });
            return false;
        }
    } else {
        if (!Database.isPremium(userId) && !Database.isAdmin(userId)) {
            bot.sendMessage(chatId, '❌ *AKSES DITOLAK*\n\nKamu bukan pengguna Premium.\nHubungi Owner untuk akses.', { parse_mode: 'Markdown' });
            return false;
        }
    }
    return true;
}

// ============================================
// MENU /start
// ============================================
bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    const isOwner = Database.isOwner(userId);
    const isAdmin = Database.isAdmin(userId);
    const isPremium = Database.isPremium(userId);
    
    let status = isOwner ? '👑 Owner Utama' : (isAdmin ? '⭐ Admin' : (isPremium ? '💎 Premium' : '🆓 Free'));
    
    let menu = `
🤖 *BOT REGISTRASI INSTAGRAM*
🆔 Status: ${status}

📌 *Perintah Utama:*
/register - Mulai registrasi massal (kirim file .txt nomor)
/country - Set kode negara (reply +62, +1, +44)
/error - Skip nomor saat ini & lanjut berikutnya

📌 *Database:*
/addnam - Tambah nama random (reply daftar nama)
/addpass - Tambah password random (reply daftar password)
/listdb - Lihat database nama & password

📌 *Monitoring:*
/status - Cek progress registrasi
/accounts - Lihat akun yang berhasil dibuat
/cancel - Batalkan proses registrasi
/myid - Cek ID Telegram kamu
`;

    if (isAdmin) {
        menu += `
📌 *Owner/Admin Menu:*
/addprem [ID/reply] - Tambah user Premium
/delprem [ID/reply] - Hapus user Premium
/listprem - Lihat daftar Premium & Owner
`;
    }

    if (isOwner) {
        menu += `
📌 *Owner Utama Menu:*
/addown [ID/reply] - Tambah Admin/Owner
/delown [ID/reply] - Hapus Admin/Owner
`;
    }

    bot.sendMessage(chatId, menu, { parse_mode: 'Markdown' });
});

// ============================================
// FITUR OWNER & PREMIUM
// ============================================

// /myid - Cek ID sendiri
bot.onText(/\/myid/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const isOwner = Database.isOwner(userId);
    const isAdmin = Database.isAdmin(userId);
    const isPremium = Database.isPremium(userId);
    
    let status = isOwner ? '👑 Owner Utama' : (isAdmin ? '⭐ Admin' : (isPremium ? '💎 Premium' : '🆓 Free'));
    
    bot.sendMessage(chatId, 
        `🆔 *INFO AKUN*\n\n` +
        `ID: \`${userId}\`\n` +
        `Username: @${msg.from.username || 'tidak ada'}\n` +
        `Status: ${status}`,
        { parse_mode: 'Markdown' }
    );
});

// /addprem - Tambah user premium
bot.onText(/\/addprem(?: (\d+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    if (!checkAccess(chatId, userId, true)) return;

    let targetId;
    if (match[1]) {
        targetId = parseInt(match[1]);
    } else if (msg.reply_to_message) {
        targetId = msg.reply_to_message.from.id;
    } else {
        return bot.sendMessage(chatId, '❌ Reply pesan user atau /addprem [ID]');
    }

    if (Database.addPremium(targetId)) {
        bot.sendMessage(chatId, `✅ User ${targetId} ditambahkan ke Premium.`);
    } else {
        bot.sendMessage(chatId, `⚠️ User ${targetId} sudah Premium.`);
    }
});

// /delprem - Hapus user premium
bot.onText(/\/delprem(?: (\d+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    if (!checkAccess(chatId, userId, true)) return;

    let targetId;
    if (match[1]) {
        targetId = parseInt(match[1]);
    } else if (msg.reply_to_message) {
        targetId = msg.reply_to_message.from.id;
    } else {
        return bot.sendMessage(chatId, '❌ Reply pesan user atau /delprem [ID]');
    }

    Database.removePremium(targetId);
    bot.sendMessage(chatId, `✅ User ${targetId} dihapus dari Premium.`);
});

// /listprem - Lihat daftar premium
bot.onText(/\/listprem/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    if (!checkAccess(chatId, userId, true)) return;

    const premium = Database.getPremiumUsers();
    const owners = Database.getOwners();
    
    let reply = '👑 *DAFTAR PREMIUM & OWNER*\n\n';
    reply += `*Owner Utama:* ${Database.getOwnerId()}\n\n`;
    reply += `*Admin/Owner Tambahan (${owners.length - 1}):*\n`;
    owners.filter(id => id !== Database.getOwnerId()).forEach(id => reply += `• ${id}\n`);
    reply += `\n*Premium (${premium.length}):*\n`;
    if (premium.length === 0) reply += '• (kosong)\n';
    else premium.forEach(id => reply += `• ${id}\n`);
    
    bot.sendMessage(chatId, reply, { parse_mode: 'Markdown' });
});

// /addown - Tambah owner tambahan
bot.onText(/\/addown(?: (\d+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    if (!Database.isOwner(userId)) {
        return bot.sendMessage(chatId, '❌ Hanya Owner Utama yang bisa pakai perintah ini.');
    }

    let targetId;
    if (match[1]) {
        targetId = parseInt(match[1]);
    } else if (msg.reply_to_message) {
        targetId = msg.reply_to_message.from.id;
    } else {
        return bot.sendMessage(chatId, '❌ Reply pesan user atau /addown [ID]');
    }

    if (Database.addOwner(targetId)) {
        bot.sendMessage(chatId, `✅ User ${targetId} ditambahkan sebagai Admin/Owner.`);
    } else {
        bot.sendMessage(chatId, `⚠️ User ${targetId} sudah Admin/Owner.`);
    }
});

// /delown - Hapus owner tambahan
bot.onText(/\/delown(?: (\d+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    if (!Database.isOwner(userId)) {
        return bot.sendMessage(chatId, '❌ Hanya Owner Utama yang bisa pakai perintah ini.');
    }

    let targetId;
    if (match[1]) {
        targetId = parseInt(match[1]);
    } else if (msg.reply_to_message) {
        targetId = msg.reply_to_message.from.id;
    } else {
        return bot.sendMessage(chatId, '❌ Reply pesan user atau /delown [ID]');
    }

    if (targetId === Database.getOwnerId()) {
        return bot.sendMessage(chatId, '❌ Owner Utama tidak bisa dihapus.');
    }

    Database.removeOwner(targetId);
    bot.sendMessage(chatId, `✅ User ${targetId} dihapus dari Admin/Owner.`);
});

// ============================================
// FITUR REGISTRASI
// ============================================

// /register - Mulai
bot.onText(/\/register/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    if (!checkAccess(chatId, userId)) return;
    
    userState.set(chatId, 'waiting_file');
    bot.sendMessage(chatId, '📁 Kirim file .txt berisi nomor telepon (satu nomor per baris)');
});

// /country
bot.onText(/\/country/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    if (!checkAccess(chatId, userId)) return;
    
    if (!userPhoneQueue.has(chatId)) {
        return bot.sendMessage(chatId, '❌ Kirim file nomor dulu dengan /register');
    }
    userState.set(chatId, 'waiting_country');
    bot.sendMessage(chatId, '🌍 Reply pesan ini dengan kode negara (contoh: +62)');
});

// /error
bot.onText(/\/error/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    if (!checkAccess(chatId, userId)) return;
    
    if (userState.get(chatId) === 'waiting_otp') {
        userState.set(chatId, 'skip_current');
        bot.sendMessage(chatId, '⏭️ Nomor saat ini di-skip. Lanjut ke nomor berikutnya...');
    } else {
        bot.sendMessage(chatId, '❌ Tidak ada proses yang bisa di-skip.');
    }
});

// /status
bot.onText(/\/status/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    if (!checkAccess(chatId, userId)) return;
    
    const queue = userPhoneQueue.get(chatId);
    if (!queue) return bot.sendMessage(chatId, '📭 Belum ada sesi registrasi.');

    const total = queue.length;
    const processed = queue.filter(p => p.processed).length;
    bot.sendMessage(chatId, `📊 *PROGRESS*\n✅ Selesai: ${processed}/${total}\n⏳ Tersisa: ${total - processed}`, { parse_mode: 'Markdown' });
});

// /accounts
bot.onText(/\/accounts/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    if (!checkAccess(chatId, userId)) return;
    
    const accounts = Database.getAccounts();
    if (accounts.length === 0) return bot.sendMessage(chatId, '📭 Belum ada akun.');

    let reply = `✅ *${accounts.length} AKUN*\n\n`;
    accounts.slice(-10).forEach(acc => {
        reply += `• ${acc.username} | ${acc.phone}\n`;
    });
    bot.sendMessage(chatId, reply, { parse_mode: 'Markdown' });
});

// /cancel
bot.onText(/\/cancel/, (msg) => {
    const chatId = msg.chat.id;
    userState.delete(chatId);
    userPhoneQueue.delete(chatId);
    userCountryCode.delete(chatId);
    bot.sendMessage(chatId, '❌ Proses registrasi dibatalkan.');
});

// /addnam
bot.onText(/\/addnam/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    if (!checkAccess(chatId, userId, true)) return;
    
    userState.set(chatId, 'waiting_names');
    bot.sendMessage(chatId, '👤 Reply pesan ini dengan daftar nama (satu per baris)');
});

// /addpass
bot.onText(/\/addpass/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    if (!checkAccess(chatId, userId, true)) return;
    
    userState.set(chatId, 'waiting_passwords');
    bot.sendMessage(chatId, '🔐 Reply pesan ini dengan daftar password (satu per baris)');
});

// /listdb
bot.onText(/\/listdb/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    if (!checkAccess(chatId, userId, true)) return;
    
    const names = Database.getNames();
    const passwords = Database.getPasswords();

    bot.sendMessage(chatId,
        `📦 *DATABASE*\n\n` +
        `👤 Nama (${names.length}):\n${names.slice(0, 10).join('\n')}${names.length > 10 ? '\n...' : ''}\n\n` +
        `🔑 Password (${passwords.length}):\n${passwords.slice(0, 5).join('\n')}${passwords.length > 5 ? '\n...' : ''}`,
        { parse_mode: 'Markdown' }
    );
});

// Handle file upload
bot.on('document', async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    if (userState.get(chatId) !== 'waiting_file') return;
    if (!checkAccess(chatId, userId)) {
        userState.delete(chatId);
        return;
    }

    try {
        const fileId = msg.document.file_id;
        const file = await bot.downloadFile(fileId, './database');
        const content = require('fs').readFileSync(file, 'utf-8');
        const phones = content.split('\n').map(p => p.trim()).filter(p => p && !p.startsWith('#'));

        userPhoneQueue.set(chatId, phones.map(p => ({ number: p, processed: false })));
        userState.set(chatId, 'waiting_country');

        bot.sendMessage(chatId,
            `📋 Terbaca *${phones.length}* nomor.\n\n` +
            `🌍 Kirim kode negara dengan /country lalu reply +62\n` +
            `_Contoh: +62, +1, +44_`,
            { parse_mode: 'Markdown' }
        );
    } catch (e) {
        bot.sendMessage(chatId, '❌ Gagal membaca file.');
        userState.delete(chatId);
    }
});

// Handle semua pesan reply
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    const replyTo = msg.reply_to_message;

    if (!text || !replyTo) return;

    const state = userState.get(chatId);

    if (state === 'waiting_names') {
        const names = text.split('\n').filter(Boolean);
        Database.addNames(names);
        userState.delete(chatId);
        bot.sendMessage(chatId, `✅ ${names.length} nama ditambahkan.`);
    }
    else if (state === 'waiting_passwords') {
        const passwords = text.split('\n').filter(Boolean);
        Database.addPasswords(passwords);
        userState.delete(chatId);
        bot.sendMessage(chatId, `✅ ${passwords.length} password ditambahkan.`);
    }
    else if (state === 'waiting_country') {
        userCountryCode.set(chatId, text.trim());
        userState.set(chatId, 'processing');
        bot.sendMessage(chatId, `✅ Kode negara: ${text}\n🔄 Memulai registrasi...`);
        await processQueue(chatId);
    }
    else if (state === 'waiting_otp') {
        const otp = text.trim();
        bot.sendMessage(chatId, `🔐 Verifikasi kode: ${otp}...`);

        setTimeout(async () => {
            bot.sendMessage(chatId, '✅ Verifikasi berhasil! Akun dibuat.');
            userState.set(chatId, 'processing');
            await processQueue(chatId);
        }, 2000);
    }
});

// Fungsi proses antrian
async function processQueue(chatId) {
    const queue = userPhoneQueue.get(chatId);
    const countryCode = userCountryCode.get(chatId);

    if (!queue || !countryCode) {
        bot.sendMessage(chatId, '❌ Data tidak lengkap.');
        return;
    }

    for (let i = 0; i < queue.length; i++) {
        if (queue[i].processed) continue;

        if (userState.get(chatId) === 'skip_current') {
            queue[i].processed = true;
            userState.set(chatId, 'processing');
            continue;
        }

        if (!userState.has(chatId)) break;

        const phone = queue[i].number;

        try {
            bot.sendMessage(chatId,
                `📱 *Memproses:* ${countryCode}${phone}\n\n` +
                `⏳ Mengirim kode OTP...\n` +
                `_Reply kode OTP, atau /error untuk skip_`,
                { parse_mode: 'Markdown' }
            );

            userState.set(chatId, 'waiting_otp');
            queue[i].processed = true;

            const account = await engine.register(phone, countryCode);
            console.log('✅ Akun dibuat:', account.username);

            const SafetyManager = require('../core/safety');
            const safety = new SafetyManager();
            const delay = safety.getAccountDelay();
            await new Promise(r => setTimeout(r, delay));

        } catch (e) {
            bot.sendMessage(chatId, `❌ Gagal proses ${phone}: ${e.message}`);
        }

        if (userState.get(chatId) !== 'waiting_otp') break;
    }

    const allProcessed = queue.every(p => p.processed);
    if (allProcessed) {
        bot.sendMessage(chatId, '🎉 *SEMUA NOMOR SELESAI!*\n\nCek hasilnya dengan /accounts', { parse_mode: 'Markdown' });
        userState.delete(chatId);
        userPhoneQueue.delete(chatId);
        userCountryCode.delete(chatId);
    }
}
