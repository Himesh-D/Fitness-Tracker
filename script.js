/**
 * Strive Fitness Tracker - Core Logic
 * Handles Data, Storage, Charting, and UI Updates
 */

class StriveApp {
    constructor() {
        this.workouts = JSON.parse(localStorage.getItem('strive_workouts')) || [];
        this.goal = parseInt(localStorage.getItem('strive_goal')) || 2000;
        this.chart = null;

        this.initElements();
        // Skip initChart in constructor to avoid issues with hidden canvas
        this.initEventListeners();
        this.updateDashboard();
    }

    initElements() {
        this.workoutForm = document.getElementById('workout-form');
        this.activityInput = document.getElementById('activity');
        this.durationInput = document.getElementById('duration');
        this.caloriesInput = document.getElementById('calories');
        
        this.todayCaloriesDisplay = document.getElementById('today-calories');
        this.workoutCountDisplay = document.getElementById('workout-count');
        this.activeTimeDisplay = document.getElementById('active-time');
        this.goalDisplay = document.getElementById('goal-display');
        this.progressFill = document.getElementById('today-progress');
        this.progressCircle = document.getElementById('progressCircle');
        this.progressText = document.getElementById('progressText');
        this.emptyState = document.getElementById('emptyState');
        this.historyList = document.getElementById('history-list');

        this.goalModal = document.getElementById('goal-modal');
        this.newGoalInput = document.getElementById('new-goal-input');
        this.editGoalBtn = document.getElementById('edit-goal-btn');
        this.saveGoalBtn = document.getElementById('save-goal');
        this.cancelGoalBtn = document.getElementById('cancel-goal');
        this.clearAllBtn = document.getElementById('clear-all');
        
        this.landingScreen = document.getElementById('landing-screen');
        this.mainApp = document.getElementById('main-app');
        this.trackNowBtn = document.getElementById('track-now-btn');
    }

    initEventListeners() {
        // Form Submission
        this.workoutForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleWorkoutSubmit();
        });

        // Goal Modal
        this.editGoalBtn.addEventListener('click', () => {
            this.newGoalInput.value = this.goal;
            this.goalModal.classList.add('active');
        });

        this.saveGoalBtn.addEventListener('click', () => {
            const newGoal = parseInt(this.newGoalInput.value);
            if (newGoal > 0) {
                this.goal = newGoal;
                localStorage.setItem('strive_goal', this.goal);
                this.goalModal.classList.remove('active');
                this.updateDashboard();
            }
        });

        this.cancelGoalBtn.addEventListener('click', () => {
            this.goalModal.classList.remove('active');
        });

        this.clearAllBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to clear all history?')) {
                this.workouts = [];
                this.saveData();
                this.updateDashboard();
            }
        });

        // Close modal on outside click
        window.onclick = (event) => {
            if (event.target == this.goalModal) {
                this.goalModal.classList.remove('active');
            }
        };

        // Track Now Transition
        if (this.trackNowBtn) {
            this.trackNowBtn.addEventListener('click', () => {
                this.landingScreen.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
                this.landingScreen.style.opacity = '0';
                this.landingScreen.style.transform = 'scale(1.1)';
                
                setTimeout(() => {
                    this.landingScreen.style.display = 'none';
                    this.mainApp.style.display = 'block';
                    setTimeout(() => {
                        this.mainApp.classList.add('active');
                        if (!this.chart) this.initChart();
                        this.updateDashboard();
                        if (this.chart) this.chart.resize();
                    }, 100);
                }, 600);
            });
        }

        // Back to Landing Transition
        const backBtn = document.getElementById('back-to-landing');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                this.mainApp.classList.remove('active');
                setTimeout(() => {
                    this.mainApp.style.display = 'none';
                    this.landingScreen.style.display = 'flex';
                    setTimeout(() => {
                        this.landingScreen.style.opacity = '1';
                        this.landingScreen.style.transform = 'scale(1)';
                    }, 50);
                }, 600);
            });
        }
    }

    handleWorkoutSubmit() {
        const activity = this.activityInput.value;
        const duration = parseInt(this.durationInput.value);
        const calories = parseInt(this.caloriesInput.value);

        const workout = {
            id: Date.now(),
            activity,
            duration,
            calories,
            date: new Date().toISOString()
        };

        this.workouts.unshift(workout); // Add to the beginning
        this.saveData();
        this.updateDashboard();
        
        // Reset Form
        this.workoutForm.reset();
    }

    saveData() {
        localStorage.setItem('strive_workouts', JSON.stringify(this.workouts));
    }

    updateDashboard() {
        const today = new Date().toLocaleDateString();
        const todaysWorkouts = this.workouts.filter(w => new Date(w.date).toLocaleDateString() === today);

        const totalCals = todaysWorkouts.reduce((sum, w) => sum + w.calories, 0);
        const totalDuration = todaysWorkouts.reduce((sum, w) => sum + w.duration, 0);
        const totalSessions = todaysWorkouts.length;

        // Update Stat Cards
        this.todayCaloriesDisplay.innerText = totalCals;
        this.workoutCountDisplay.innerText = totalSessions;
        this.activeTimeDisplay.innerText = totalDuration;
        this.goalDisplay.innerText = this.goal;

        // Progress Bar & Circle
        const progressPercent = Math.min((totalCals / this.goal) * 100, 100);
        this.progressFill.style.width = `${progressPercent}%`;
        
        if (this.progressCircle) {
            this.progressCircle.style.background = `conic-gradient(#3b82f6 ${progressPercent}%, #e5e7eb ${progressPercent}%)`;
            this.progressText.innerText = `${Math.round(progressPercent)}%`;
        }

        this.renderHistory();
        this.toggleEmptyState(totalSessions > 0);
        if (this.chart) this.updateChart();
    }

    toggleEmptyState(hasData) {
        if (this.emptyState) {
            this.emptyState.style.display = hasData ? 'none' : 'block';
        }
    }

    renderHistory() {
        if (this.workouts.length === 0) {
            this.historyList.innerHTML = '<p id="emptyState" class="empty-msg">No activity yet. Let’s get moving 💪</p>';
            this.emptyState = document.getElementById('emptyState'); // Refresh reference
            return;
        }

        this.historyList.innerHTML = this.workouts.map(w => `
            <div class="history-item">
                <div class="history-info">
                    <h4><i data-lucide="activity" style="width: 14px; height: 14px; vertical-align: middle; margin-right: 4px;"></i> ${w.activity}</h4>
                    <p>${new Date(w.date).toLocaleDateString()} • ${new Date(w.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                </div>
                <div class="history-stats">
                    <div class="cal">${w.calories} kcal</div>
                    <div class="dur">${w.duration} min</div>
                </div>
            </div>
        `).join('');
        
        // Refresh icons
        if (window.lucide) {
            lucide.createIcons();
        }
    }

    initChart() {
        const ctx = document.getElementById('weeklyChart').getContext('2d');
        this.chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: this.getLastSevenDays(),
                datasets: [{
                    label: 'Calories Burned',
                    data: [650, 400, 800, 300, 500, 700, 0], 
                    backgroundColor: '#3b82f6',
                    borderRadius: 12,
                    hoverBackgroundColor: '#2563eb'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 1000,
                    easing: 'easeOutQuart'
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: '#f1f5f9', drawBorder: false },
                        ticks: { color: '#64748b', font: { family: 'Outfit', weight: '600' } }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: '#64748b', font: { family: 'Outfit', weight: '600' } }
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: '#ffffff',
                        titleColor: '#1e293b',
                        bodyColor: '#3b82f6',
                        borderColor: '#e2e8f0',
                        borderWidth: 1,
                        displayColors: false,
                        padding: 12,
                        cornerRadius: 12
                    }
                }
            }
        });
    }

    getLastSevenDays() {
        const days = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            days.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
        }
        return days;
    }

    updateChart() {
        if (!this.chart) return;

        const weeklyData = Array(7).fill(0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        this.workouts.forEach(w => {
            const workoutDate = new Date(w.date);
            workoutDate.setHours(0, 0, 0, 0);
            
            const diffTime = today - workoutDate;
            const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays >= 0 && diffDays < 7) {
                // Today is index 6. Diff 0 -> index 6. Diff 6 -> index 0.
                weeklyData[6 - diffDays] += w.calories;
            }
        });

        this.chart.data.datasets[0].data = weeklyData;
        this.chart.update('none'); // Update without animation for data changes
    }
}

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    window.app = new StriveApp();
    if (window.lucide) {
        lucide.createIcons();
    }
});
