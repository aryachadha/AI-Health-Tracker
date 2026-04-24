// ============================================
// CONFIGURATION - REPLACE WITH YOUR VALUES
// ============================================
const CONFIG = {
    // Google Sheets Configuration
    // Get Sheet ID from URL: https://docs.google.com/spreadsheets/d/THIS_IS_YOUR_SHEET_ID/edit
    sheetId: '1EcnHQ5fZMXp2SVCcaT1LirzXVoyl2daBsltbhU7tRfE',
    apiKey: 'AIzaSyCee9kgjo4-kbdoblZYt0OFjm_SGFkvwFI',
    
    // Sheet Names (must match your Google Sheets tabs)
    masterSheetName: 'Student_Master',
    historySheetName: 'Wellness_History'
};

// Global variables
let studentData = null;
let historyData = [];
let charts = {};

// ============================================
// CHECK SAVED LOGIN ON PAGE LOAD
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    const savedEmail = localStorage.getItem('wellness_dashboard_email');
    if (savedEmail) {
        document.getElementById('emailInput').value = savedEmail;
        // Auto-login after a short delay
        setTimeout(() => login(), 100);
    }
});

// ============================================
// LOGIN FUNCTION
// ============================================
async function login() {
    const email = document.getElementById('emailInput').value.trim();
    if (!email) {
        showToast('Please enter your email address', 'error');
        return;
    }

    // Save to localStorage if remember me is checked
    const rememberMe = document.getElementById('rememberCheckbox').checked;
    if (rememberMe) {
        localStorage.setItem('wellness_dashboard_email', email);
    } else {
        localStorage.removeItem('wellness_dashboard_email');
    }

    // Show loading
    showLoading();

    // Fetch data
    await fetchStudentData(email);
}

// ============================================
// FETCH DATA FROM GOOGLE SHEETS
// ============================================
async function fetchStudentData(email) {
    try {
        // Build URLs
        const masterUrl = `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.sheetId}/values/${CONFIG.masterSheetName}?key=${CONFIG.apiKey}`;
        const historyUrl = `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.sheetId}/values/${CONFIG.historySheetName}?key=${CONFIG.apiKey}`;
        
        const [masterResponse, historyResponse] = await Promise.all([
            fetch(masterUrl),
            fetch(historyUrl)
        ]);
        
        if (!masterResponse.ok || !historyResponse.ok) {
            throw new Error('Failed to fetch data from Google Sheets. Please check your API key and Sheet ID.');
        }
        
        const masterData = await masterResponse.json();
        const historySheetData = await historyResponse.json();
        
        if (!masterData.values || masterData.values.length < 2) {
            throw new Error('No student data found in the database.');
        }
        
        // Parse headers
        const masterHeaders = masterData.values[0];
        const historyHeaders = historySheetData.values ? historySheetData.values[0] : [];
        
        // Find student in master sheet
        const emailColumnIndex = masterHeaders.findIndex(h => 
            h && h.toLowerCase().includes('student_email')
        );
        
        if (emailColumnIndex === -1) {
            throw new Error('Email column not found in Student_Master sheet');
        }
        
        let studentRow = null;
        for (let i = 1; i < masterData.values.length; i++) {
            const row = masterData.values[i];
            if (row[emailColumnIndex] && row[emailColumnIndex].toLowerCase() === email.toLowerCase()) {
                studentRow = row;
                break;
            }
        }
        
        if (!studentRow) {
            throw new Error(`No data found for ${email}. Please submit a wellness log first.`);
        }
        
        // Map student data
        studentData = {};
        masterHeaders.forEach((header, idx) => {
            studentData[header] = studentRow[idx] || '';
        });
        
        // Get history data for this student
        if (historyHeaders.length > 0) {
            const emailHistoryIndex = historyHeaders.findIndex(h => 
                h && h.toLowerCase().includes('student_email')
            );
            
            historyData = [];
            for (let i = 1; i < historySheetData.values.length; i++) {
                const row = historySheetData.values[i];
                if (row[emailHistoryIndex] && row[emailHistoryIndex].toLowerCase() === email.toLowerCase()) {
                    const record = {};
                    historyHeaders.forEach((header, idx) => {
                        record[header] = row[idx] || '';
                    });
                    historyData.push(record);
                }
            }
            
            // Sort by timestamp (oldest first for trends)
            historyData.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        }
        
        // Update UI
        hideLoading();
        showDashboard();
        updateDashboard();
        
    } catch (error) {
        hideLoading();
        showError(error.message);
        console.error('Error:', error);
    }
}

// ============================================
// DASHBOARD UI UPDATES
// ============================================
function showDashboard() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('dashboardContainer').style.display = 'block';
}

function logout() {
    localStorage.removeItem('wellness_dashboard_email');
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('dashboardContainer').style.display = 'none';
    document.getElementById('emailInput').value = '';
}

function showLoading() {
    let loader = document.getElementById('loadingOverlay');
    if (!loader) {
        loader = document.createElement('div');
        loader.id = 'loadingOverlay';
        loader.className = 'loading-overlay';
        loader.innerHTML = '<div class="spinner"></div>';
        document.body.appendChild(loader);
    }
    loader.style.display = 'flex';
}

function hideLoading() {
    const loader = document.getElementById('loadingOverlay');
    if (loader) loader.style.display = 'none';
}

function showError(message) {
    const loginScreen = document.getElementById('loginScreen');
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.innerHTML = `
        <i class="fas fa-exclamation-circle"></i>
        <p>${message}</p>
        <button onclick="location.reload()" style="margin-top: 10px; padding: 8px 16px; background: #1a3c5e; color: white; border: none; border-radius: 8px; cursor: pointer;">Try Again</button>
    `;
    loginScreen.insertBefore(errorDiv, loginScreen.firstChild);
    setTimeout(() => errorDiv.remove(), 5000);
}

function showToast(message, type) {
    // Simple alert for now
    alert(message);
}

// ============================================
// UPDATE DASHBOARD WITH DATA
// ============================================
function updateDashboard() {
    if (!studentData || historyData.length === 0) {
        document.getElementById('historyBody').innerHTML = '<tr><td colspan="7" class="loading-cell">No wellness history found. Submit your first log!</td></tr>';
        return;
    }
    
    const latest = historyData[historyData.length - 1];
    const previous = historyData.length > 1 ? historyData[historyData.length - 2] : null;
    
    // Update header
    document.getElementById('studentName').innerText = studentData.student_name || 'Student';
    document.getElementById('lastUpdateText').innerHTML = `<i class="far fa-calendar-alt"></i> Last updated: ${formatDate(latest.timestamp)}`;
    document.getElementById('totalPoints').innerText = studentData.total_points || 0;
    document.getElementById('streakCount').innerText = studentData.streak || 0;
    
    // Update welcome banner
    const wellnessScore = calculateWellnessScore(latest);
    document.getElementById('wellnessScore').innerText = wellnessScore;
    document.getElementById('welcomeMessage').innerText = getWelcomeMessage(studentData.student_name);
    document.getElementById('progressMessage').innerText = latest.progress_message || 'Track your wellness journey below';
    document.getElementById('totalLogsBadge').innerText = `${historyData.length} logs`;
    
    // Update stats grid
    updateStatsGrid(latest, previous);
    
    // Update charts
    updateTrendsChart(historyData);
    updateConditionChart(historyData);
    updatePointsChart(historyData);
    updateMetricsChart(historyData);
    
    // Update AI analysis
    updateAnalysisCard(latest);
    
    // Update history table
    updateHistoryTable(historyData);
    
    // Update wellness tips
    updateWellnessTips(latest);
    
    // Update follow-up recommendation
    updateFollowUp(latest);
}

function calculateWellnessScore(latest) {
    let score = 70;
    if (parseInt(latest.sleep) >= 7) score += 10;
    if (parseInt(latest.stress) <= 3) score += 10;
    if (parseInt(latest.energy) >= 4) score += 10;
    if (latest.improvement_status === 'IMPROVING') score += 10;
    if (latest.improvement_status === 'WORSENING') score -= 10;
    return Math.min(100, Math.max(0, score));
}

function getWelcomeMessage(name) {
    const hour = new Date().getHours();
    if (hour < 12) return `Good morning, ${name.split(' ')[0] || 'Student'}!`;
    if (hour < 18) return `Good afternoon, ${name.split(' ')[0] || 'Student'}!`;
    return `Good evening, ${name.split(' ')[0] || 'Student'}!`;
}

function updateStatsGrid(latest, previous) {
    const symptomCount = latest.symptoms ? latest.symptoms.split(',').length : 0;
    const prevSymptomCount = previous?.symptoms ? previous.symptoms.split(',').length : 0;
    
    const stats = [
        { icon: "😴", label: "Sleep", value: latest.sleep + " hrs", current: parseFloat(latest.sleep), previous: previous ? parseFloat(previous.sleep) : null },
        { icon: "🎯", label: "Stress", value: latest.stress + "/10", current: parseFloat(latest.stress), previous: previous ? parseFloat(previous.stress) : null, reverse: true },
        { icon: "⚡", label: "Energy", value: latest.energy + "/5", current: parseFloat(latest.energy), previous: previous ? parseFloat(previous.energy) : null },
        { icon: "📝", label: "Symptoms", value: symptomCount, current: symptomCount, previous: prevSymptomCount, reverse: true },
        { icon: "⭐", label: "Points", value: latest.points, current: parseInt(latest.points), previous: previous ? parseInt(previous.points) : null },
        { icon: "📊", label: "Log #", value: historyData.length, current: historyData.length, previous: historyData.length - 1 }
    ];
    
    const grid = document.getElementById('statsGrid');
    grid.innerHTML = stats.map(stat => {
        let trend = getTrend(stat.current, stat.previous, stat.reverse);
        return `
            <div class="stat-card">
                <div class="stat-icon">${stat.icon}</div>
                <div class="stat-label">${stat.label}</div>
                <div class="stat-value">${stat.value}</div>
                <div class="stat-trend ${trend.class}">${trend.text}</div>
            </div>
        `;
    }).join('');
}

function getTrend(current, previous, reverse = false) {
    if (previous === null || previous === undefined) return { text: "📊 Baseline", class: "trend-stable" };
    if (reverse) {
        if (current < previous) return { text: "↓ Improving", class: "trend-up" };
        if (current > previous) return { text: "↑ Declining", class: "trend-down" };
    } else {
        if (current > previous) return { text: "↑ Improving", class: "trend-up" };
        if (current < previous) return { text: "↓ Declining", class: "trend-down" };
    }
    return { text: "→ Stable", class: "trend-stable" };
}

function updateTrendsChart(history) {
    const ctx = document.getElementById('trendsChart').getContext('2d');
    if (charts.trends) charts.trends.destroy();
    
    const dates = history.map(h => formatShortDate(h.timestamp));
    const points = history.map(h => parseInt(h.points) || 0);
    
    charts.trends = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [{
                label: 'Points Earned',
                data: points,
                borderColor: '#ff8c00',
                backgroundColor: 'rgba(255,140,0,0.1)',
                fill: true,
                tension: 0.3,
                pointBackgroundColor: '#ff8c00',
                pointRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: { legend: { position: 'top' } }
        }
    });
}

function updateConditionChart(history) {
    const ctx = document.getElementById('conditionChart').getContext('2d');
    if (charts.condition) charts.condition.destroy();
    
    const conditions = {};
    history.forEach(h => {
        const condition = h.condition_1 || h.condition;
        if (condition && condition !== 'Unknown') {
            conditions[condition] = (conditions[condition] || 0) + 1;
        }
    });
    
    if (Object.keys(conditions).length === 0) {
        conditions['No Data'] = 1;
    }
    
    charts.condition = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: Object.keys(conditions),
            datasets: [{
                data: Object.values(conditions),
                backgroundColor: ['#1a3c5e', '#2c5a7a', '#ff8c00', '#2e7d32', '#c62828', '#f57c00', '#6a1b9a', '#0288d1']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: { legend: { position: 'right' } }
        }
    });
}

function updatePointsChart(history) {
    const ctx = document.getElementById('pointsChart').getContext('2d');
    if (charts.points) charts.points.destroy();
    
    const submissions = history.map((_, i) => `#${i+1}`);
    const points = history.map(h => parseInt(h.points) || 0);
    
    charts.points = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: submissions,
            datasets: [{
                label: 'Points Earned',
                data: points,
                backgroundColor: '#2c5a7a',
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: { legend: { position: 'top' } }
        }
    });
}

function updateMetricsChart(history) {
    const ctx = document.getElementById('metricsChart').getContext('2d');
    if (charts.metrics) charts.metrics.destroy();
    
    const dates = history.map(h => formatShortDate(h.timestamp));
    const sleep = history.map(h => parseFloat(h.sleep) || 0);
    const stress = history.map(h => parseFloat(h.stress) || 0);
    const energy = history.map(h => parseFloat(h.energy) || 0);
    
    charts.metrics = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [
                { label: 'Sleep (hours)', data: sleep, borderColor: '#2e7d32', tension: 0.3, fill: false },
                { label: 'Stress (/10)', data: stress, borderColor: '#c62828', tension: 0.3, fill: false },
                { label: 'Energy (/5)', data: energy, borderColor: '#ff8c00', tension: 0.3, fill: false }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: { legend: { position: 'top' } }
        }
    });
}

function updateAnalysisCard(latest) {
    const card = document.getElementById('analysisContent');
    const condition = latest.condition_1 || latest.condition || 'Analysis Pending';
    const probability = latest.probability_1 || 0;
    const confidence = latest.confidence_1 || 0;
    const confidenceLevel = confidence >= 80 ? 'High' : (confidence >= 60 ? 'Medium' : 'Low');
    
    document.getElementById('analysisDate').innerHTML = `<i class="far fa-clock"></i> ${formatDate(latest.timestamp)}`;
    
    card.innerHTML = `
        <div class="condition-name">${condition}</div>
        <div>Probability: <strong>${probability}%</strong></div>
        <div class="probability-bar">
            <div class="probability-fill" style="width: ${probability}%;"></div>
        </div>
        <div>Confidence Level: <strong>${confidence}%</strong> (${confidenceLevel})</div>
        
        <div class="remedy-box">
            <strong><i class="fas fa-prescription-bottle"></i> Recommended Remedy</strong><br>
            ${latest.remedy_1 || 'Rest and stay hydrated'}
        </div>
        
        <div class="action-grid">
            <div class="action-item">
                <strong><i class="fas fa-bolt"></i> Do Now</strong><br>
                ${latest.immediate_action_1 || 'Take a moment to rest'}
            </div>
            <div class="action-item">
                <strong><i class="fas fa-hourglass-half"></i> Next 2-3 Hours</strong><br>
                ${latest.immediate_action_2 || 'Take a short break'}
            </div>
            <div class="action-item">
                <strong><i class="fas fa-moon"></i> By Tomorrow</strong><br>
                ${latest.immediate_action_3 || 'Get quality sleep'}
            </div>
        </div>
        
        <div class="improvement-box">
            <strong>Progress Status:</strong> ${latest.improvement_status || 'STABLE'}<br>
            <small>${latest.progress_message || 'No significant changes'}</small>
        </div>
    `;
}

function updateHistoryTable(history) {
    const tbody = document.getElementById('historyBody');
    
    if (history.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="loading-cell">No wellness history found. Submit your first log!</td></tr>';
        return;
    }
    
    tbody.innerHTML = history.slice().reverse().map((record, idx) => {
        const originalIdx = history.length - 1 - idx;
        return `
            <tr onclick="toggleRow(${originalIdx})">
                <td>${formatDate(record.timestamp)}</td>
                <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${truncate(record.symptoms || '', 40)}</td>
                <td>${record.sleep || '-'}</td>
                <td>${record.stress || '-'}</td>
                <td>${record.energy || '-'}</td>
                <td>${record.condition_1 || record.condition || '-'}</td>
                <td>${record.points || 0}</td>
            </tr>
            <tr class="expand-row" id="expand-${originalIdx}">
                <td colspan="7">
                    <div class="expand-content">
                        <div><strong><i class="fas fa-prescription-bottle"></i> Remedy:</strong><br>${record.remedy_1 || 'Rest and hydrate'}</div>
                        <div><strong><i class="fas fa-list-check"></i> Action Plan:</strong><br>${record.immediate_action_1 || 'Take care'}</div>
                        <div><strong><i class="fas fa-leaf"></i> Wellness Tip:</strong><br>${record.wellness_tip || 'Listen to your body'}</div>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function updateWellnessTips(latest) {
    const grid = document.getElementById('tipsGrid');
    const tips = [
        { icon: "💧", title: "Hydration", text: latest.hydration_reminder || 'Drink 6-8 glasses of water daily' },
        { icon: "🪑", title: "Breaks", text: latest.break_reminder || 'Take a 2-minute break every hour' },
        { icon: "😴", title: "Sleep Quality", text: latest.sleep_tip || 'Aim for 7-8 hours of quality sleep' },
        { icon: "🧘", title: "Stress Relief", text: latest.stress_relief_tip || 'Practice deep breathing exercises' },
        { icon: "❤️", title: "General Wellness", text: latest.wellness_tip || 'Listen to your body and rest when needed' }
    ];
    
    grid.innerHTML = tips.map(tip => `
        <div class="tip-item">
            <i>${tip.icon}</i>
            <strong>${tip.title}</strong>
            <p>${tip.text}</p>
        </div>
    `).join('');
}

function updateFollowUp(latest) {
    const followUp = latest.follow_up_needed;
    if (followUp && followUp !== 'NO' && followUp !== 'No') {
        const card = document.getElementById('followupCard');
        const content = document.getElementById('followupContent');
        card.style.display = 'block';
        content.innerHTML = `
            <div style="display: flex; align-items: center; gap: 15px; flex-wrap: wrap;">
                <div style="flex: 1;">
                    <strong>Recommendation:</strong> ${followUp}
                    <p style="margin-top: 8px; font-size: 14px;">Please consult a healthcare provider if your symptoms persist or worsen.</p>
                </div>
                <div>
                    <i class="fas fa-user-md" style="font-size: 48px; opacity: 0.5;"></i>
                </div>
            </div>
        `;
    } else {
        document.getElementById('followupCard').style.display = 'none';
    }
}

function toggleRow(idx) {
    const row = document.getElementById(`expand-${idx}`);
    if (row) {
        if (row.style.display === 'none' || !row.style.display) {
            row.style.display = 'table-row';
        } else {
            row.style.display = 'none';
        }
    }
}

// ============================================
// HELPER FUNCTIONS
// ============================================
function formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    try {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
        return dateStr.split(' ')[0];
    }
}

function formatShortDate(dateStr) {
    if (!dateStr) return 'N/A';
    try {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
        const parts = dateStr.split(' ');
        return parts[0]?.slice(5) || dateStr;
    }
}

function truncate(str, len) {
    if (!str) return '';
    if (str.length <= len) return str;
    return str.substring(0, len) + '...';
}

// Global function for table row toggle
window.toggleRow = toggleRow;
window.login = login;
window.logout = logout;