require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const Database = require('../core/database.js');
const InstagramEngine = require('../core/instagram.js');

const TOKEN = process.env.FOLLOW_BOT_TOKEN;
if (!TOKEN) {
    console.error('❌ FOLLOW_BOT_TOKEN tidak ditemukan di .env');
    process.exit(1);
}

const bot = new TelegramBot(TOKEN, { polling: true });
const engine = new InstagramEngine();

const activeMissions = new Map();

console.log('💪 Bot FOLLOW & LIKE siap.');

// Middleware akses
function checkAccess(chatId, userId) {
    if (!Database.isPremium(userId) && !Database.isAdmin(userId)) {
        bot.sendMessage(chatId, '❌ *AKSES DITOLAK*\n\nKamu bukan pengguna Premium.', { parse_mode: 'Markdown' });
        return false;
    }
    return true;
}

// /start
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    const isAdmin = Database.isAdmin(userId);
    const isPremium = Database.isPremium(userId);
    const status = isAdmin ? '⭐ Admin' : (isPremium ? '💎 Premium' : '🆓 Free');
    
    let menu = `
🤖 *BOT FOLLOW & LIKE INSTAGRAM*
🆔 Status: ${status}

📌 *Perintah Utama:*
/follow @target - Follow followers dari target
/like @target - Like postingan terbaru target
/stop - Hentikan semua misi aktif

📌 *Monitoring:*
/status - Cek status misi & akun
/accounts - Lihat semua akun tersedia
/cooldown @akun - Cek cooldown akun tertentu
/dashboard - Ringkasan performa semua akun
/myid - Cek ID Telegram kamu
`;

    bot.sendMessage(chatId, menu, { parse_mode: 'Markdown' });
});

// /myid
bot.onText(/\/myid/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const isAdmin = Database.isAdmin(userId);
    const isPremium = Database.isPremium(userId);
    const status = isAdmin ? '⭐ Admin' : (isPremium ? '💎 Premium' : '🆓 Free');
    
    bot.sendMessage(chatId, 
        `🆔 *INFO AKUN*\n\n` +
        `ID: \`${userId}\`\n` +
        `Status: ${status}`,
        { parse_mode: 'Markdown' }
    );
});

// /follow
bot.onText(/\/follow (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    if (!checkAccess(chatId, userId)) return;
    
    const target = match[1].replace('@', '').trim();
    const accounts = engine.getAccounts();
    
    if (accounts.length === 0) {
        return bot.sendMessage(chatId, '❌ Belum ada akun. Jalankan Bot Register dulu.');
    }

    if (activeMissions.has(chatId)) {
        return bot.sendMessage(chatId, '⚠️ Misi masih berjalan. Hentikan dengan /stop');
    }

    activeMissions.set(chatId, { type: 'follow', target, running: true });

    bot.sendMessage(chatId,
        `🎯 *MISI FOLLOW DIMULAI*\n\n` +
        `Target: @${target}\n` +
        `Akun tersedia: ${accounts.length}\n\n` +
        `_Ketik /stop untuk hentikan_`,
        { parse_mode: 'Markdown' }
    );

    runFollowMission(chatId, target, accounts);
});

// /like
bot.onText(/\/like (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    if (!checkAccess(chatId, userId)) return;
    
    const target = match[1].replace('@', '').trim();
    const accounts = engine.getAccounts();
    
    if (accounts.length === 0) {
        return bot.sendMessage(chatId, '❌ Belum ada akun.');
    }

    if (activeMissions.has(chatId)) {
        return bot.sendMessage(chatId, '⚠️ Misi masih berjalan. Hentikan dengan /stop');
    }

    activeMissions.set(chatId, { type: 'like', target, running: true });

    bot.sendMessage(chatId,
        `❤️ *MISI LIKE DIMULAI*\n\n` +
        `Target: @${target}\n` +
        `Akun tersedia: ${accounts.length}\n\n` +
        `_Ketik /stop untuk hentikan_`,
        { parse_mode: 'Markdown' }
    );

    runLikeMission(chatId, target, accounts);
});

// /stop
bot.onText(/\/stop/, (msg) => {
    const chatId = msg.chat.id;
    if (activeMissions.has(chatId)) {
        activeMissions.delete(chatId);
        bot.sendMessage(chatId, '🛑 Semua misi dihentikan.');
    } else {
        bot.sendMessage(chatId, '❌ Tidak ada misi aktif.');
    }
});

// /status
bot.onText(/\/status/, (msg) => {
    const chatId = msg.chat.id;
    const mission = activeMissions.get(chatId);

    if (!mission) {
        return bot.sendMessage(chatId, '📭 Tidak ada misi aktif.');
    }

    bot.sendMessage(chatId,
        `📊 *STATUS MISI*\n\n` +
        `Tipe: ${mission.type}\n` +
        `Target: @${mission.target}\n` +
        `Status: ${mission.running ? '🟢 Berjalan' : '🔴 Berhenti'}`,
        { parse_mode: 'Markdown' }
    );
});

// /accounts
bot.onText(/\/accounts/, (msg) => {
    const chatId = msg.chat.id;
    const accounts = engine.getAccounts();

    if (accounts.length === 0) {
        return bot.sendMessage(chatId, '📭 Belum ada akun.');
    }

    let reply = `📋 *${accounts.length} AKUN TERSEDIA*\n\n`;
    accounts.forEach(acc => {
        reply += `• ${acc.username} | ${acc.phone}\n`;
    });
    bot.sendMessage(chatId, reply, { parse_mode: 'Markdown' });
});

// /cooldown
bot.onText(/\/cooldown (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const username = match[1].replace('@', '').trim();
    const status = engine.getAccountStatus(username);

    bot.sendMessage(chatId,
        `⏱️ *COOLDOWN @${username}*\n\n` +
        `Follow hari ini: ${status.follows_today}/150\n` +
        `Like hari ini: ${status.likes_today}/400\n` +
        `Bisa follow: ${status.can_follow ? '✅' : '❌'}\n` +
        `Bisa like: ${status.can_like ? '✅' : '❌'}`,
        { parse_mode: 'Markdown' }
    );
});

// /dashboard
bot.onText(/\/dashboard/, (msg) => {
    const chatId = msg.chat.id;
    const accounts = engine.getAccounts();

    if (accounts.length === 0) {
        return bot.sendMessage(chatId, '📭 Belum ada akun.');
    }

    let totalFollows = 0;
    let totalLikes = 0;
    let readyAccounts = 0;

    accounts.forEach(acc => {
        const status = engine.getAccountStatus(acc.username);
        totalFollows += status.follows_today;
        totalLikes += status.likes_today;
        if (status.can_follow) readyAccounts++;
    });

    bot.sendMessage(chatId,
        `📊 *DASHBOARD*\n\n` +
        `Total Akun: ${accounts.length}\n` +
        `Siap Follow: ${readyAccounts}\n` +
        `Total Follow Hari Ini: ${totalFollows}\n` +
        `Total Like Hari Ini: ${totalLikes}`,
        { parse_mode: 'Markdown' }
    );
});

// Fungsi misi follow
async function runFollowMission(chatId, target, accounts) {
    let accountIndex = 0;

    while (activeMissions.get(chatId)?.running) {
        const account = accounts[accountIndex % accounts.length];

        try {
            await engine.login(account.username, account.password);
            const result = await engine.follow(account, target);

            if (result.success) {
                bot.sendMessage(chatId, `✅ ${account.username} follow @${target}`);
            } else {
                bot.sendMessage(chatId, `⏸️ ${account.username} cooldown, skip...`);
            }
        } catch (e) {
            bot.sendMessage(chatId, `❌ ${account.username} error: ${e.message}`);
        }

        accountIndex++;
        await new Promise(r => setTimeout(r, 5000));
    }

    bot.sendMessage(chatId, '🛑 Misi follow selesai.');
    activeMissions.delete(chatId);
}

// Fungsi misi like
async function runLikeMission(chatId, target, accounts) {
    let accountIndex = 0;

    while (activeMissions.get(chatId)?.running) {
        const account = accounts[accountIndex % accounts.length];

        try {
            await engine.login(account.username, account.password);
            const result = await engine.like(account, `https://instagram.com/${target}`);

            if (result.success) {
                bot.sendMessage(chatId, `❤️ ${account.username} like postingan @${target}`);
            } else {
                bot.sendMessage(chatId, `⏸️ ${account.username} cooldown, skip...`);
            }
        } catch (e) {
            bot.sendMessage(chatId, `❌ ${account.username} error: ${e.message}`);
        }

        accountIndex++;
        await new Promise(r => setTimeout(r, 5000));
    }

    bot.sendMessage(chatId, '🛑 Misi like selesai.');
    activeMissions.delete(chatId);
}
