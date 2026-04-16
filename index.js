require('dotenv').config();
const fs = require('fs-extra');
const { spawn } = require('child_process');

// Buat folder database kalau belum ada
fs.ensureDirSync('./database');
fs.ensureDirSync('./database/sessions');

// Buat file default
if (!fs.existsSync('./database/random_names.txt')) {
    fs.writeFileSync('./database/random_names.txt', 
        'fani\nlaay\nnana\nlili\nbudi\nsiti\nandi\nrina\nputri\ndewi');
}
if (!fs.existsSync('./database/random_passwords.txt')) {
    fs.writeFileSync('./database/random_passwords.txt', 
        'IgPass123!\nBotAmanku\nSecure2024\nRandomPass#1\nIG_Lanjutkan');
}
if (!fs.existsSync('./database/accounts.json')) {
    fs.writeFileSync('./database/accounts.json', '[]');
}
if (!fs.existsSync('./database/premium.json')) {
    fs.writeFileSync('./database/premium.json', '[]');
}
if (!fs.existsSync('./database/owners.json')) {
    const ownerId = parseInt(process.env.OWNER_ID) || 0;
    fs.writeFileSync('./database/owners.json', JSON.stringify([ownerId]));
}

console.log('═══════════════════════════════════════════');
console.log('🤖 TELEGRAM DUAL BOT - INSTAGRAM MANAGER');
console.log('═══════════════════════════════════════════\n');

// Jalankan Bot Register
const registerBot = spawn('node', ['bots/register_bot.js'], {
    stdio: 'inherit',
    detached: false
});

// Jalankan Bot Follow
const followBot = spawn('node', ['bots/follow_bot.js'], {
    stdio: 'inherit',
    detached: false
});

console.log('✅ Kedua bot berjalan!\n');
console.log('Tekan Ctrl+C untuk menghentikan semua bot.\n');

process.on('SIGINT', () => {
    console.log('\n🛑 Menghentikan semua bot...');
    registerBot.kill();
    followBot.kill();
    process.exit(0);
});