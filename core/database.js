const fs = require('fs-extra');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'database');

class Database {
    // ============================================
    // NAMA & PASSWORD DATABASE
    // ============================================
    static getNames() {
        const content = fs.readFileSync(path.join(DB_PATH, 'random_names.txt'), 'utf-8');
        return content.split('\n').filter(Boolean);
    }

    static addNames(names) {
        fs.appendFileSync(path.join(DB_PATH, 'random_names.txt'), '\n' + names.join('\n'));
    }

    static getPasswords() {
        const content = fs.readFileSync(path.join(DB_PATH, 'random_passwords.txt'), 'utf-8');
        return content.split('\n').filter(Boolean);
    }

    static addPasswords(passwords) {
        fs.appendFileSync(path.join(DB_PATH, 'random_passwords.txt'), '\n' + passwords.join('\n'));
    }

    // ============================================
    // AKUN HASIL REGISTRASI
    // ============================================
    static getAccounts() {
        try {
            return JSON.parse(fs.readFileSync(path.join(DB_PATH, 'accounts.json'), 'utf-8'));
        } catch {
            return [];
        }
    }

    static saveAccount(account) {
        const accounts = this.getAccounts();
        accounts.push({
            ...account,
            registered_at: new Date().toISOString()
        });
        fs.writeFileSync(path.join(DB_PATH, 'accounts.json'), JSON.stringify(accounts, null, 2));
        return accounts;
    }

    // ============================================
    // SESSION LOGIN
    // ============================================
    static getSession(username) {
        const sessionFile = path.join(DB_PATH, 'sessions', `${username}.json`);
        if (fs.existsSync(sessionFile)) {
            return JSON.parse(fs.readFileSync(sessionFile, 'utf-8'));
        }
        return null;
    }

    static saveSession(username, sessionData) {
        fs.writeFileSync(
            path.join(DB_PATH, 'sessions', `${username}.json`),
            JSON.stringify(sessionData, null, 2)
        );
    }

    // ============================================
    // OWNER SYSTEM
    // ============================================
    static getOwnerId() {
        return parseInt(process.env.OWNER_ID) || 0;
    }

    static isOwner(userId) {
        return userId === this.getOwnerId();
    }

    static getOwners() {
        const file = path.join(DB_PATH, 'owners.json');
        try {
            return JSON.parse(fs.readFileSync(file, 'utf-8'));
        } catch {
            return [this.getOwnerId()];
        }
    }

    static saveOwners(owners) {
        const file = path.join(DB_PATH, 'owners.json');
        fs.writeFileSync(file, JSON.stringify(owners, null, 2));
    }

    static isAdmin(userId) {
        if (this.isOwner(userId)) return true;
        const owners = this.getOwners();
        return owners.includes(userId);
    }

    static addOwner(userId) {
        const owners = this.getOwners();
        if (!owners.includes(userId)) {
            owners.push(userId);
            this.saveOwners(owners);
            return true;
        }
        return false;
    }

    static removeOwner(userId) {
        let owners = this.getOwners();
        owners = owners.filter(id => id !== userId && id !== this.getOwnerId());
        this.saveOwners(owners);
        return true;
    }

    // ============================================
    // PREMIUM SYSTEM
    // ============================================
    static getPremiumUsers() {
        const file = path.join(DB_PATH, 'premium.json');
        try {
            return JSON.parse(fs.readFileSync(file, 'utf-8'));
        } catch {
            return [];
        }
    }

    static savePremiumUsers(users) {
        const file = path.join(DB_PATH, 'premium.json');
        fs.writeFileSync(file, JSON.stringify(users, null, 2));
    }

    static isPremium(userId) {
        if (this.isAdmin(userId)) return true;
        const users = this.getPremiumUsers();
        return users.includes(userId);
    }

    static addPremium(userId) {
        const users = this.getPremiumUsers();
        if (!users.includes(userId)) {
            users.push(userId);
            this.savePremiumUsers(users);
            return true;
        }
        return false;
    }

    static removePremium(userId) {
        let users = this.getPremiumUsers();
        users = users.filter(id => id !== userId);
        this.savePremiumUsers(users);
        return true;
    }
}

module.exports = Database;
