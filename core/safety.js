class SafetyManager {
    constructor() {
        this.dailyFollows = new Map();
        this.dailyLikes = new Map();
        this.lastAction = new Map();
        this.resetDaily();
    }

    resetDaily() {
        setInterval(() => {
            this.dailyFollows.clear();
            this.dailyLikes.clear();
            console.log('🔄 Safety: Reset hitungan harian');
        }, 24 * 60 * 60 * 1000);
    }

    canFollow(username) {
        const todayFollows = this.dailyFollows.get(username) || 0;
        const lastTime = this.lastAction.get(username) || 0;
        const now = Date.now();

        const hourAgo = now - 60 * 60 * 1000;
        const followsThisHour = Array.from(this.lastAction.entries())
            .filter(([_, time]) => time > hourAgo).length;

        if (followsThisHour >= 15) return false;
        if (todayFollows >= 150) return false;
        if (now - lastTime < this.getRandomDelay(25000, 45000)) return false;

        return true;
    }

    canLike(username) {
        const todayLikes = this.dailyLikes.get(username) || 0;
        const lastTime = this.lastAction.get(username) || 0;
        const now = Date.now();

        const hourAgo = now - 60 * 60 * 1000;
        const likesThisHour = Array.from(this.lastAction.entries())
            .filter(([_, time]) => time > hourAgo).length;

        if (likesThisHour >= 30) return false;
        if (todayLikes >= 400) return false;
        if (now - lastTime < this.getRandomDelay(15000, 30000)) return false;

        return true;
    }

    recordFollow(username) {
        const current = this.dailyFollows.get(username) || 0;
        this.dailyFollows.set(username, current + 1);
        this.lastAction.set(username, Date.now());
    }

    recordLike(username) {
        const current = this.dailyLikes.get(username) || 0;
        this.dailyLikes.set(username, current + 1);
        this.lastAction.set(username, Date.now());
    }

    getRandomDelay(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    getAccountDelay() {
        return this.getRandomDelay(60000, 120000);
    }

    getStatus(username) {
        return {
            follows_today: this.dailyFollows.get(username) || 0,
            likes_today: this.dailyLikes.get(username) || 0,
            can_follow: this.canFollow(username),
            can_like: this.canLike(username)
        };
    }
}

module.exports = SafetyManager;