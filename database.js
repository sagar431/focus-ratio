/**
 * Database Module - IndexedDB Storage
 * Stores daily productivity data for month-to-month progress tracking
 */

class ProductivityDatabase {
    constructor() {
        this.dbName = 'FocusRatioDB';
        this.dbVersion = 1;
        this.db = null;

        this.init();
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => {
                console.error('❌ Failed to open database');
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                console.log('✅ Database initialized');
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Daily stats store
                if (!db.objectStoreNames.contains('dailyStats')) {
                    const dailyStore = db.createObjectStore('dailyStats', { keyPath: 'date' });
                    dailyStore.createIndex('month', 'month', { unique: false });
                    dailyStore.createIndex('year', 'year', { unique: false });
                }

                // Sessions store
                if (!db.objectStoreNames.contains('sessions')) {
                    const sessionsStore = db.createObjectStore('sessions', { keyPath: 'id', autoIncrement: true });
                    sessionsStore.createIndex('date', 'date', { unique: false });
                    sessionsStore.createIndex('startTime', 'startTime', { unique: false });
                }

                // Goals store
                if (!db.objectStoreNames.contains('goals')) {
                    db.createObjectStore('goals', { keyPath: 'id' });
                }

                console.log('✅ Database schema created');
            };
        });
    }

    // Save daily statistics
    async saveDailyStats(stats) {
        const date = new Date();
        const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD

        const dailyData = {
            date: dateStr,
            month: date.getMonth() + 1,
            year: date.getFullYear(),
            dayOfWeek: date.getDay(),
            focusTimeMs: stats.focusTime || 0,
            realTimeMs: stats.realTime || 0,
            productivity: stats.productivity || 0,
            sessions: stats.sessions || 0,
            longestStreak: stats.longestStreak || 0,
            awayTime: stats.awayTime || 0,
            moodHistory: stats.moodHistory || [],
            updatedAt: Date.now()
        };

        return this.put('dailyStats', dailyData);
    }

    // Get today's stats
    async getTodayStats() {
        const today = new Date().toISOString().split('T')[0];
        return this.get('dailyStats', today);
    }

    // Get stats for a specific date range
    async getStatsRange(startDate, endDate) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
                return;
            }

            const transaction = this.db.transaction(['dailyStats'], 'readonly');
            const store = transaction.objectStore('dailyStats');
            const results = [];

            const request = store.openCursor();

            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    if (cursor.value.date >= startDate && cursor.value.date <= endDate) {
                        results.push(cursor.value);
                    }
                    cursor.continue();
                } else {
                    resolve(results.sort((a, b) => a.date.localeCompare(b.date)));
                }
            };

            request.onerror = () => reject(request.error);
        });
    }

    // Get stats for a specific month
    async getMonthStats(year, month) {
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

        return this.getStatsRange(startDate, endDate);
    }

    // Get last N days of stats
    async getLastNDays(n) {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - (n - 1));

        return this.getStatsRange(
            startDate.toISOString().split('T')[0],
            endDate.toISOString().split('T')[0]
        );
    }

    // Calculate monthly summary
    async getMonthSummary(year, month) {
        const stats = await this.getMonthStats(year, month);

        if (stats.length === 0) {
            return null;
        }

        const totalFocusTime = stats.reduce((sum, s) => sum + s.focusTimeMs, 0);
        const totalRealTime = stats.reduce((sum, s) => sum + s.realTimeMs, 0);
        const avgProductivity = stats.reduce((sum, s) => sum + s.productivity, 0) / stats.length;
        const totalSessions = stats.reduce((sum, s) => sum + s.sessions, 0);
        const maxStreak = Math.max(...stats.map(s => s.longestStreak));
        const daysTracked = stats.length;

        return {
            year,
            month,
            totalFocusTime,
            totalRealTime,
            avgProductivity: Math.round(avgProductivity * 100) / 100,
            totalSessions,
            maxStreak,
            daysTracked,
            dailyStats: stats
        };
    }

    // Get all-time statistics
    async getAllTimeStats() {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
                return;
            }

            const transaction = this.db.transaction(['dailyStats'], 'readonly');
            const store = transaction.objectStore('dailyStats');
            const request = store.getAll();

            request.onsuccess = () => {
                const stats = request.result;

                if (stats.length === 0) {
                    resolve(null);
                    return;
                }

                const totalFocusTime = stats.reduce((sum, s) => sum + s.focusTimeMs, 0);
                const totalRealTime = stats.reduce((sum, s) => sum + s.realTimeMs, 0);
                const avgProductivity = stats.reduce((sum, s) => sum + s.productivity, 0) / stats.length;
                const totalSessions = stats.reduce((sum, s) => sum + s.sessions, 0);
                const maxStreak = Math.max(...stats.map(s => s.longestStreak));

                resolve({
                    totalFocusTime,
                    totalRealTime,
                    avgProductivity: Math.round(avgProductivity * 100) / 100,
                    totalSessions,
                    maxStreak,
                    daysTracked: stats.length,
                    firstDay: stats[0]?.date,
                    lastDay: stats[stats.length - 1]?.date
                });
            };

            request.onerror = () => reject(request.error);
        });
    }

    // Save a focus session
    async saveSession(session) {
        const sessionData = {
            date: new Date().toISOString().split('T')[0],
            startTime: session.startTime,
            endTime: session.endTime,
            duration: session.duration,
            productivity: session.productivity
        };

        return this.add('sessions', sessionData);
    }

    // Generic database operations
    async get(storeName, key) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
                return;
            }

            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(key);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async put(storeName, data) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
                return;
            }

            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(data);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async add(storeName, data) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
                return;
            }

            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.add(data);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Export all data as JSON
    async exportData() {
        const dailyStats = await new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['dailyStats'], 'readonly');
            const store = transaction.objectStore('dailyStats');
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });

        return {
            exportDate: new Date().toISOString(),
            dailyStats
        };
    }
}

// Export for use
window.ProductivityDatabase = ProductivityDatabase;
