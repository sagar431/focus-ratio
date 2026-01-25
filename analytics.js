/**
 * Analytics Dashboard JavaScript
 * Creates beautiful charts and visualizations for productivity data
 */

class AnalyticsDashboard {
    constructor() {
        this.db = null;
        this.charts = {};
        this.currentPeriod = 'week';

        this.init();
    }

    async init() {
        // Initialize database
        this.db = new ProductivityDatabase();
        await this.db.init();

        // Bind period selector
        this.bindPeriodSelector();

        // Load initial data
        await this.loadData();

        console.log('✅ Analytics dashboard initialized');
    }

    bindPeriodSelector() {
        const buttons = document.querySelectorAll('.period-btn');
        buttons.forEach(btn => {
            btn.addEventListener('click', async () => {
                buttons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentPeriod = btn.dataset.period;
                await this.loadData();
            });
        });
    }

    async loadData() {
        let stats = [];

        switch (this.currentPeriod) {
            case 'week':
                stats = await this.db.getLastNDays(7);
                break;
            case 'month':
                stats = await this.db.getLastNDays(30);
                break;
            case 'year':
                stats = await this.db.getLastNDays(365);
                break;
        }

        // Show empty state if no data (NO MORE FAKE DATA!)
        if (stats.length === 0) {
            this.showEmptyState();
            return;
        }

        this.hideEmptyState();
        this.updateSummaryCards(stats);
        this.createProductivityChart(stats);
        this.createFocusTimeChart(stats);
        this.createDistributionChart(stats);
        this.createWeeklyPatternChart(stats);
        this.createHeatmap(stats);
        this.createMonthlyComparison();
        this.renderAchievements(stats);
    }

    showEmptyState() {
        // Update summary cards to show zeros
        document.getElementById('totalFocusTime').textContent = '0m';
        document.getElementById('avgProductivity').textContent = '0%';
        document.getElementById('totalSessions').textContent = '0';
        document.getElementById('bestStreak').textContent = '0m';

        // Hide trends
        document.querySelectorAll('.summary-trend').forEach(el => {
            el.innerHTML = '<span>--</span>';
            el.className = 'summary-trend';
        });

        // Show no data message in charts
        const chartContainers = document.querySelectorAll('.chart-container');
        chartContainers.forEach(container => {
            if (!container.querySelector('.no-data')) {
                const noData = document.createElement('div');
                noData.className = 'no-data';
                noData.innerHTML = `
                    <div class="no-data-icon">📊</div>
                    <div class="no-data-text">No data yet<br><small>Start focusing to see your stats!</small></div>
                `;
                container.appendChild(noData);
            }
        });

        // Clear heatmap
        const heatmap = document.getElementById('heatmapContainer');
        if (heatmap) {
            heatmap.innerHTML = '<div class="no-data"><div class="no-data-icon">🗓️</div><div class="no-data-text">No activity yet</div></div>';
        }

        // Clear achievements
        this.renderAchievements([]);
    }

    hideEmptyState() {
        document.querySelectorAll('.no-data').forEach(el => el.remove());
    }

    // No more fake sample data - showing real data only!

    updateSummaryCards(stats) {
        const totalFocusMs = stats.reduce((sum, s) => sum + s.focusTimeMs, 0);
        const avgProductivity = stats.reduce((sum, s) => sum + s.productivity, 0) / stats.length;
        const totalSessions = stats.reduce((sum, s) => sum + s.sessions, 0);
        const bestStreak = Math.max(...stats.map(s => s.longestStreak));

        document.getElementById('totalFocusTime').textContent = this.formatDuration(totalFocusMs);
        document.getElementById('avgProductivity').textContent = `${avgProductivity.toFixed(1)}%`;
        document.getElementById('totalSessions').textContent = totalSessions;
        document.getElementById('bestStreak').textContent = this.formatDuration(bestStreak);

        // Calculate trends (compare to previous period)
        this.updateTrends(stats);
    }

    updateTrends(stats) {
        // Simple trend calculation - compare first half to second half
        const mid = Math.floor(stats.length / 2);
        const firstHalf = stats.slice(0, mid);
        const secondHalf = stats.slice(mid);

        if (firstHalf.length > 0 && secondHalf.length > 0) {
            const firstAvg = firstHalf.reduce((s, d) => s + d.productivity, 0) / firstHalf.length;
            const secondAvg = secondHalf.reduce((s, d) => s + d.productivity, 0) / secondHalf.length;
            const trend = ((secondAvg - firstAvg) / firstAvg * 100).toFixed(0);

            const trendEl = document.getElementById('productivityTrend');
            trendEl.innerHTML = `<span>${trend >= 0 ? '+' : ''}${trend}%</span>`;
            trendEl.className = `summary-trend ${trend >= 0 ? 'up' : 'down'}`;
        }
    }

    createProductivityChart(stats) {
        const ctx = document.getElementById('productivityChart');
        if (!ctx) return;

        if (this.charts.productivity) {
            this.charts.productivity.destroy();
        }

        const labels = stats.map(s => this.formatDateLabel(s.date));
        const data = stats.map(s => s.productivity);

        // Create gradient
        const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 250);
        gradient.addColorStop(0, 'rgba(99, 102, 241, 0.3)');
        gradient.addColorStop(1, 'rgba(99, 102, 241, 0)');

        this.charts.productivity = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'Productivity %',
                    data,
                    borderColor: '#6366f1',
                    backgroundColor: gradient,
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointBackgroundColor: '#6366f1',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointHoverRadius: 6
                }]
            },
            options: this.getChartOptions('Productivity %', 0, 100)
        });
    }

    createFocusTimeChart(stats) {
        const ctx = document.getElementById('focusTimeChart');
        if (!ctx) return;

        if (this.charts.focusTime) {
            this.charts.focusTime.destroy();
        }

        const labels = stats.map(s => this.formatDateLabel(s.date));
        const data = stats.map(s => s.focusTimeMs / 3600000); // Convert to hours

        this.charts.focusTime = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Focus Hours',
                    data,
                    backgroundColor: stats.map(s => {
                        if (s.productivity >= 70) return 'rgba(34, 197, 94, 0.8)';
                        if (s.productivity >= 40) return 'rgba(245, 158, 11, 0.8)';
                        return 'rgba(239, 68, 68, 0.8)';
                    }),
                    borderRadius: 8,
                    borderSkipped: false
                }]
            },
            options: {
                ...this.getChartOptions('Hours'),
                barThickness: this.currentPeriod === 'week' ? 40 : 'flex'
            }
        });
    }

    createDistributionChart(stats) {
        const ctx = document.getElementById('distributionChart');
        if (!ctx) return;

        if (this.charts.distribution) {
            this.charts.distribution.destroy();
        }

        const totalFocus = stats.reduce((sum, s) => sum + s.focusTimeMs, 0);
        const totalAway = stats.reduce((sum, s) => sum + s.awayTime, 0);

        this.charts.distribution = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Focus Time', 'Away Time'],
                datasets: [{
                    data: [totalFocus, totalAway],
                    backgroundColor: [
                        'rgba(34, 197, 94, 0.8)',
                        'rgba(239, 68, 68, 0.6)'
                    ],
                    borderColor: [
                        '#22c55e',
                        '#ef4444'
                    ],
                    borderWidth: 2,
                    hoverOffset: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: 'rgba(255, 255, 255, 0.7)',
                            padding: 20,
                            usePointStyle: true
                        }
                    }
                }
            }
        });
    }

    createWeeklyPatternChart(stats) {
        const ctx = document.getElementById('weeklyPatternChart');
        if (!ctx) return;

        if (this.charts.weeklyPattern) {
            this.charts.weeklyPattern.destroy();
        }

        // Aggregate by day of week
        const dayData = [0, 0, 0, 0, 0, 0, 0];
        const dayCounts = [0, 0, 0, 0, 0, 0, 0];

        stats.forEach(s => {
            dayData[s.dayOfWeek] += s.productivity;
            dayCounts[s.dayOfWeek]++;
        });

        const avgByDay = dayData.map((total, i) =>
            dayCounts[i] > 0 ? total / dayCounts[i] : 0
        );

        // Reorder to start from Monday
        const reordered = [...avgByDay.slice(1), avgByDay[0]];

        this.charts.weeklyPattern = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [{
                    label: 'Avg Productivity',
                    data: reordered,
                    backgroundColor: 'rgba(139, 92, 246, 0.2)',
                    borderColor: '#8b5cf6',
                    borderWidth: 2,
                    pointBackgroundColor: '#8b5cf6',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    r: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            stepSize: 20,
                            color: 'rgba(255, 255, 255, 0.5)'
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        pointLabels: {
                            color: 'rgba(255, 255, 255, 0.7)',
                            font: { size: 11 }
                        }
                    }
                },
                plugins: {
                    legend: { display: false }
                }
            }
        });
    }

    createHeatmap(stats) {
        const container = document.getElementById('heatmapContainer');
        if (!container) return;

        container.innerHTML = '';

        // Create 4 weeks of data
        const weeks = 4;
        const days = weeks * 7;

        for (let i = days - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];

            const stat = stats.find(s => s.date === dateStr);
            const level = stat ? Math.ceil(stat.productivity / 20) : 0;

            const dayEl = document.createElement('div');
            dayEl.className = 'heatmap-day';
            dayEl.dataset.level = level;
            dayEl.title = `${dateStr}: ${stat ? stat.productivity.toFixed(1) : 0}%`;

            container.appendChild(dayEl);
        }

        // Add legend
        const legend = document.createElement('div');
        legend.className = 'heatmap-legend';
        legend.innerHTML = `
            <span>Less</span>
            <div class="heatmap-legend-box" style="background: rgba(255,255,255,0.05)"></div>
            <div class="heatmap-legend-box" style="background: rgba(34,197,94,0.2)"></div>
            <div class="heatmap-legend-box" style="background: rgba(34,197,94,0.4)"></div>
            <div class="heatmap-legend-box" style="background: rgba(34,197,94,0.6)"></div>
            <div class="heatmap-legend-box" style="background: rgba(34,197,94,0.8)"></div>
            <span>More</span>
        `;
        container.appendChild(legend);
    }

    async createMonthlyComparison() {
        const ctx = document.getElementById('monthlyComparisonChart');
        if (!ctx) return;

        if (this.charts.monthlyComparison) {
            this.charts.monthlyComparison.destroy();
        }

        // Get last 6 months of REAL data from database
        const months = [];
        const focusData = [];
        const productivityData = [];

        for (let i = 5; i >= 0; i--) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);

            const monthName = date.toLocaleDateString('en-US', { month: 'short' });
            months.push(monthName);

            // Get real monthly stats from database
            try {
                const monthStats = await this.db.getMonthStats(date.getFullYear(), date.getMonth() + 1);

                if (monthStats.length > 0) {
                    const totalFocusHours = monthStats.reduce((sum, s) => sum + s.focusTimeMs, 0) / 3600000;
                    const avgProd = monthStats.reduce((sum, s) => sum + s.productivity, 0) / monthStats.length;
                    focusData.push(Math.round(totalFocusHours * 10) / 10);
                    productivityData.push(Math.round(avgProd * 10) / 10);
                } else {
                    focusData.push(0);
                    productivityData.push(0);
                }
            } catch (e) {
                focusData.push(0);
                productivityData.push(0);
            }
        }

        this.charts.monthlyComparison = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: months,
                datasets: [
                    {
                        label: 'Focus Hours',
                        data: focusData,
                        backgroundColor: 'rgba(99, 102, 241, 0.8)',
                        borderRadius: 8,
                        borderSkipped: false
                    },
                    {
                        label: 'Avg Productivity %',
                        data: productivityData,
                        backgroundColor: 'rgba(34, 197, 94, 0.8)',
                        borderRadius: 8,
                        borderSkipped: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { color: 'rgba(255, 255, 255, 0.7)' }
                    },
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        ticks: { color: 'rgba(255, 255, 255, 0.5)' }
                    }
                },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            color: 'rgba(255, 255, 255, 0.7)',
                            usePointStyle: true
                        }
                    }
                }
            }
        });
    }

    renderAchievements(stats) {
        const container = document.getElementById('achievementsGrid');
        if (!container) return;

        const totalFocusHours = stats.reduce((sum, s) => sum + s.focusTimeMs, 0) / 3600000;
        const totalSessions = stats.reduce((sum, s) => sum + s.sessions, 0);
        const avgProductivity = stats.reduce((sum, s) => sum + s.productivity, 0) / stats.length;

        const achievements = [
            {
                icon: '🌱',
                name: 'First Steps',
                desc: 'Complete your first focus session',
                unlocked: totalSessions >= 1,
                progress: Math.min(100, totalSessions * 100)
            },
            {
                icon: '⏰',
                name: 'Hour Master',
                desc: 'Accumulate 10 hours of focus',
                unlocked: totalFocusHours >= 10,
                progress: Math.min(100, (totalFocusHours / 10) * 100)
            },
            {
                icon: '🔥',
                name: 'On Fire',
                desc: 'Achieve 70% productivity',
                unlocked: avgProductivity >= 70,
                progress: Math.min(100, (avgProductivity / 70) * 100)
            },
            {
                icon: '💯',
                name: '100 Sessions',
                desc: 'Complete 100 focus sessions',
                unlocked: totalSessions >= 100,
                progress: Math.min(100, totalSessions)
            },
            {
                icon: '🏆',
                name: 'Centurion',
                desc: 'Reach 100 hours of focus',
                unlocked: totalFocusHours >= 100,
                progress: Math.min(100, totalFocusHours)
            },
            {
                icon: '⭐',
                name: 'Perfectionist',
                desc: 'Achieve 90% productivity',
                unlocked: avgProductivity >= 90,
                progress: Math.min(100, (avgProductivity / 90) * 100)
            }
        ];

        container.innerHTML = achievements.map(a => `
            <div class="achievement-card ${a.unlocked ? 'unlocked' : 'locked'}">
                <div class="achievement-icon">${a.icon}</div>
                <div class="achievement-name">${a.name}</div>
                <div class="achievement-desc">${a.desc}</div>
                ${!a.unlocked ? `
                    <div class="achievement-progress">
                        <div class="achievement-progress-fill" style="width: ${a.progress}%"></div>
                    </div>
                ` : ''}
            </div>
        `).join('');
    }

    getChartOptions(yAxisLabel, min = null, max = null) {
        return {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.7)',
                        maxRotation: 45
                    }
                },
                y: {
                    beginAtZero: true,
                    min: min,
                    max: max,
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: 'rgba(255, 255, 255, 0.5)' },
                    title: {
                        display: true,
                        text: yAxisLabel,
                        color: 'rgba(255, 255, 255, 0.5)'
                    }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#fff',
                    bodyColor: 'rgba(255, 255, 255, 0.8)',
                    borderColor: 'rgba(99, 102, 241, 0.5)',
                    borderWidth: 1,
                    cornerRadius: 8,
                    padding: 12
                }
            }
        };
    }

    formatDateLabel(dateStr) {
        const date = new Date(dateStr);
        if (this.currentPeriod === 'week') {
            return date.toLocaleDateString('en-US', { weekday: 'short' });
        } else if (this.currentPeriod === 'month') {
            return date.getDate().toString();
        } else {
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }
    }

    formatDuration(ms) {
        const hours = Math.floor(ms / 3600000);
        const minutes = Math.floor((ms % 3600000) / 60000);

        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        }
        return `${minutes}m`;
    }
}

// Initialize dashboard when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.analytics = new AnalyticsDashboard();
});
