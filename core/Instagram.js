const Database = require('./database');
const SafetyManager = require('./safety');

class InstagramEngine {
    constructor() {
        this.safety = new SafetyManager();
    }

    async register(phone, countryCode) {
        const names = Database.getNames();
        const passwords = Database.getPasswords();

        const randomName = names[Math.floor(Math.random() * names.length)] || `user${Date.now()}`;
        const randomPass = passwords[Math.floor(Math.random() * passwords.length)] || `Pass${Date.now()}!`;

        console.log(`📝 [REGISTER] ${countryCode}${phone} - ${randomName}`);

        await this.delay(2000, 4000);

        const account = {
            phone: `${countryCode}${phone}`,
            fullname: randomName,
            username: randomName.toLowerCase().replace(/\s/g, '_') + Math.floor(Math.random() * 1000),
            password: randomPass,
            email: `${randomName.toLowerCase()}${Math.floor(Math.random() * 100)}@gmail.com`
        };

        Database.saveAccount(account);
        return account;
    }

    async login(username, password) {
        let session = Database.getSession(username);

        if (session) {
            console.log(`🔑 [LOGIN] ${username} - Session tersimpan`);
            return { success: true, session };
        }

        console.log(`🔐 [LOGIN] ${username} - Login baru`);
        await this.delay(3000, 5000);

        session = {
            username,
            logged_at: new Date().toISOString(),
            cookies: 'simulated_cookie_' + Date.now()
        };
        Database.saveSession(username, session);

        return { success: true, session };
    }

    async follow(account, targetUsername) {
        if (!this.safety.canFollow(account.username)) {
            return { success: false, reason: 'cooldown_active' };
        }

        console.log(`👣 [FOLLOW] ${account.username} -> @${targetUsername}`);
        await this.delay(
            this.safety.getRandomDelay(25000, 45000),
            this.safety.getRandomDelay(25000, 45000)
        );

        this.safety.recordFollow(account.username);
        return { success: true, target: targetUsername };
    }

    async like(account, postUrl) {
        if (!this.safety.canLike(account.username)) {
            return { success: false, reason: 'cooldown_active' };
        }

        console.log(`❤️ [LIKE] ${account.username} -> ${postUrl}`);
        await this.delay(
            this.safety.getRandomDelay(15000, 30000),
            this.safety.getRandomDelay(15000, 30000)
        );

        this.safety.recordLike(account.username);
        return { success: true, post: postUrl };
    }

    async delay(min, max) {
        const ms = Math.floor(Math.random() * (max - min + 1)) + min;
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    getAccounts() {
        return Database.getAccounts();
    }

    getAccountStatus(username) {
        return this.safety.getStatus(username);
    }
}

module.exports = InstagramEngine;