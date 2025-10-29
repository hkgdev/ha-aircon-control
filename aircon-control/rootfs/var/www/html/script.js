const PROXY_URL = 'proxy.php';
const PASSWORD = 'password';

let authenticated = false;
let systemData = {};
let zonesData = [];
let timerEndTime = null;
let refreshInterval;
let timeInterval;

// Helper function to round a Date to the nearest quarter hour
function roundToQuarterHour(date) {
    const minutes = date.getMinutes();
    const roundedMinutes = Math.round(minutes / 15) * 15;
    const result = new Date(date);

    if (roundedMinutes === 60) {
        result.setHours(result.getHours() + 1);
        result.setMinutes(0);
    } else {
        result.setMinutes(roundedMinutes);
    }

    result.setSeconds(0);
    result.setMilliseconds(0);
    return result;
}

async function authenticate() {
    try {
        const response = await fetch(`${PROXY_URL}?action=login&password=${PASSWORD}`);
        const json = await response.json();
        if (json.success) {
            const xml = new DOMParser().parseFromString(json.data, 'text/xml');
            const auth = xml.querySelector('authenticated').textContent;
            authenticated = auth === '1';
            return authenticated;
        }
        return false;
    } catch (e) {
        console.error('Auth failed', e);
        return false;
    }
}

async function getSystemData() {
    if (!authenticated) return;
    try {
        const response = await fetch(`${PROXY_URL}?action=getSystemData`);
        const json = await response.json();
        if (json.success) {
            const xml = new DOMParser().parseFromString(json.data, 'text/xml');
            const unitcontrol = xml.querySelector('unitcontrol');
            systemData = {
                airconOnOff: unitcontrol.querySelector('airconOnOff').textContent,
                fanSpeed: unitcontrol.querySelector('fanSpeed').textContent,
                mode: unitcontrol.querySelector('mode').textContent,
                centralActualTemp: parseFloat(unitcontrol.querySelector('centralActualTemp').textContent),
                centralDesiredTemp: parseFloat(unitcontrol.querySelector('centralDesiredTemp').textContent),
                numberOfZones: parseInt(unitcontrol.querySelector('numberOfZones').textContent),
            };
            updateUI();
        }
    } catch (e) {
        console.error('Get system data failed', e);
    }
}

async function getZoneData(zone) {
    if (!authenticated) return null;
    try {
        const response = await fetch(`${PROXY_URL}?action=getZoneData&zone=${zone}`);
        const json = await response.json();
        if (json.success) {
            const xml = new DOMParser().parseFromString(json.data, 'text/xml');
            const zoneEl = xml.querySelector(`zone${zone}`);
            return {
                name: zoneEl.querySelector('name').textContent,
                setting: parseInt(zoneEl.querySelector('setting').textContent),
                userPercentSetting: parseInt(zoneEl.querySelector('userPercentSetting').textContent),
            };
        }
        return null;
    } catch (e) {
        console.error(`Get zone ${zone} failed`, e);
        return null;
    }
}

async function getZoneTimer(zone) {
    if (!authenticated) return null;
    try {
        const response = await fetch(`${PROXY_URL}?action=getZoneTimer&zone=${zone}`);
        const json = await response.json();
        if (json.success) {
            const xml = new DOMParser().parseFromString(json.data, 'text/xml');
            const timerEl = xml.querySelector('zoneTimer');
            if (timerEl) {
                const scheduleStatus = parseInt(timerEl.querySelector('scheduleStatus').textContent);
                // Status 1 = start timer only (turn on at specific time)
                // Status 2 = end timer only (turn off at specific time)
                // Status 3 = both start and end timer
                if (scheduleStatus === 1 || scheduleStatus === 2 || scheduleStatus === 3) {
                    // For start timers (status 1), we need to use startTime, not endTime
                    let timeHours, timeMinutes;
                    if (scheduleStatus === 1) {
                        // Start timer - use start time
                        timeHours = parseInt(timerEl.querySelector('startTimeHours').textContent);
                        timeMinutes = parseInt(timerEl.querySelector('startTimeMinutes').textContent);
                    } else {
                        // End timer or both - use end time
                        timeHours = parseInt(timerEl.querySelector('endTimeHours').textContent);
                        timeMinutes = parseInt(timerEl.querySelector('endTimeMinutes').textContent);
                    }

                    const now = new Date();
                    const timerTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), timeHours, timeMinutes);
                    if (timerTime < now) {
                        timerTime.setDate(timerTime.getDate() + 1); // Assume next day if time has passed
                    }
                    return timerTime;
                }
            }
        }
        return null;
    } catch (e) {
        console.error(`Get zone timer ${zone} failed`, e);
        return null;
    }
}

async function setCommand(params) {
    if (!authenticated) return false;
    try {
        const query = new URLSearchParams(params).toString();
        const response = await fetch(`${PROXY_URL}?${query}`);
        const json = await response.json();
        if (json.success) {
            const xml = new DOMParser().parseFromString(json.data, 'text/xml');
            const ack = xml.querySelector('ack').textContent;
            return ack === '1';
        }
        return false;
    } catch (e) {
        console.error('Set command failed', e);
        return false;
    }
}

async function loadZones() {
    zonesData = [];
    for (let i = 1; i <= systemData.numberOfZones; i++) {
        const data = await getZoneData(i);
        if (data) zonesData.push({ zone: i, ...data });
    }

    // Custom zone ordering - you can modify this array to change the display order
    const zoneOrder = [3, 1, 2, 5, 4, 6, 7, 8]; // Default order, modify as needed

    // Sort zones according to custom order
    zonesData.sort((a, b) => {
        const indexA = zoneOrder.indexOf(a.zone);
        const indexB = zoneOrder.indexOf(b.zone);
        return indexA - indexB;
    });

    updateZonesUI();
}

async function refreshTimerData() {
    // Assuming zone 1 for timer, adjust if needed
    const timerData = await getZoneTimer(1);
    if (timerData) {
        timerEndTime = timerData;
    } else {
        timerEndTime = null; // Clear timer if not active
    }
}

function updateUI() {
    // on off
    const onOffBtn = document.getElementById('on-off-toggle');
    onOffBtn.textContent = systemData.airconOnOff === '1' ? 'On' : 'Off';
    onOffBtn.classList.toggle('on', systemData.airconOnOff === '1');

    // temps
    document.getElementById('current-temp').textContent = systemData.centralActualTemp.toFixed(1);
    document.getElementById('desired-temp').textContent = systemData.centralDesiredTemp.toFixed(1);

    // fan speed
    const fanBtns = ['fan-low', 'fan-med', 'fan-high'];
    fanBtns.forEach((id, idx) => {
        const btn = document.getElementById(id);
        btn.classList.toggle('selected', parseInt(systemData.fanSpeed) === idx + 1);
    });

    // mode
    const modeBtns = ['mode-cool', 'mode-heat', 'mode-fan'];
    modeBtns.forEach((id, idx) => {
        const btn = document.getElementById(id);
        btn.classList.toggle('selected', parseInt(systemData.mode) === idx + 1);
    });
}

function updateZonesUI() {
    const container = document.getElementById('zones-container');
    container.innerHTML = '';
    zonesData.forEach(zone => {
        const div = document.createElement('div');
        div.className = 'zone';
        div.innerHTML = `
            <span class="zone-name">${zone.name}</span>
            <button class="zone-toggle ${zone.setting === 1 ? 'on' : ''}" data-zone="${zone.zone}">${zone.setting === 1 ? 'On' : 'Off'}</button>
            <div class="zone-percentage">
                <button class="zone-percent-minus" data-zone="${zone.zone}">-</button>
                <span>${zone.userPercentSetting}%</span>
                <button class="zone-percent-plus" data-zone="${zone.zone}">+</button>
            </div>
        `;
        container.appendChild(div);
    });
}

function updateCurrentTime() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' });
    document.getElementById('current-time').textContent = timeStr;
}

function updateTimerUI() {
    const toggle = document.getElementById('timer-toggle');
    const controls = document.getElementById('timer-controls');

    // Always show timer controls - they can be used to set turn-on timers even when aircon is off
    controls.style.display = 'flex';

    if (timerEndTime && timerEndTime > new Date()) {
        toggle.textContent = 'On';
        toggle.classList.add('on');
        const remaining = Math.ceil((timerEndTime - new Date()) / 60000);
        document.getElementById('timer-remaining').textContent = remaining;
    } else {
        toggle.textContent = 'Off';
        toggle.classList.remove('on');
        // Don't reset to 15 when turning off - keep the last displayed value for when user turns it back on
        // Only reset to 15 when there's no timer data at all (on initial load)
        if (!timerEndTime) {
            document.getElementById('timer-remaining').textContent = '15';
        }
        timerEndTime = null;
    }
}

async function setClock() {
    const now = new Date();
    await setCommand({
        action: 'setClock',
        hours: now.getHours(),
        minutes: now.getMinutes(),
        day: now.getDate(),
        month: now.getMonth() + 1,
        year: now.getFullYear(),
        dow: now.getDay()
    });
}

async function refreshData() {
    await authenticate();
    await getSystemData();
    await loadZones();
    await refreshTimerData();
    updateCurrentTime();
    updateTimerUI();
}

function startPeriodicRefresh() {
    refreshInterval = setInterval(refreshData, 3000);
}

function stopPeriodicRefresh() {
    clearInterval(refreshInterval);
}

// Event listeners
document.addEventListener('DOMContentLoaded', async () => {
    await refreshData();
    startPeriodicRefresh();
    timeInterval = setInterval(() => {
        updateCurrentTime();
        updateTimerUI();
    }, 1000);
});

window.addEventListener('focus', async () => {
    await setClock();
    await refreshData();
});

// On off toggle
document.getElementById('on-off-toggle').addEventListener('click', async () => {
    const newState = systemData.airconOnOff === '1' ? '0' : '1';
    if (await setCommand({action: 'setSystemData', airconOnOff: newState})) {
        systemData.airconOnOff = newState;
        updateUI();
    }
});

// Temp controls
document.getElementById('temp-minus').addEventListener('click', async () => {
    const newTemp = Math.max(16, systemData.centralDesiredTemp - 1.0);
    if (await setCommand({action: 'setSystemData', centralDesiredTemp: newTemp.toFixed(1)})) {
        systemData.centralDesiredTemp = newTemp;
        updateUI();
    }
});

document.getElementById('temp-plus').addEventListener('click', async () => {
    const newTemp = Math.min(32, systemData.centralDesiredTemp + 1.0);
    if (await setCommand({action: 'setSystemData', centralDesiredTemp: newTemp.toFixed(1)})) {
        systemData.centralDesiredTemp = newTemp;
        updateUI();
    }
});

// Fan speed
document.getElementById('fan-low').addEventListener('click', async () => {
    if (await setCommand({action: 'setSystemData', fanSpeed: '1'})) {
        systemData.fanSpeed = '1';
        updateUI();
    }
});

document.getElementById('fan-med').addEventListener('click', async () => {
    if (await setCommand({action: 'setSystemData', fanSpeed: '2'})) {
        systemData.fanSpeed = '2';
        updateUI();
    }
});

document.getElementById('fan-high').addEventListener('click', async () => {
    if (await setCommand({action: 'setSystemData', fanSpeed: '3'})) {
        systemData.fanSpeed = '3';
        updateUI();
    }
});

// Mode
document.getElementById('mode-cool').addEventListener('click', async () => {
    if (await setCommand({action: 'setSystemData', mode: '1'})) {
        systemData.mode = '1';
        updateUI();
    }
});

document.getElementById('mode-heat').addEventListener('click', async () => {
    if (await setCommand({action: 'setSystemData', mode: '2'})) {
        systemData.mode = '2';
        updateUI();
    }
});

document.getElementById('mode-fan').addEventListener('click', async () => {
    if (await setCommand({action: 'setSystemData', mode: '3'})) {
        systemData.mode = '3';
        updateUI();
    }
});

// Zones
document.addEventListener('click', async (e) => {
    if (e.target.classList.contains('zone-toggle')) {
        const zone = parseInt(e.target.dataset.zone);
        const newSetting = zonesData.find(z => z.zone === zone).setting === 1 ? 0 : 1;
        if (await setCommand({action: 'setZoneData', zone: zone.toString(), zoneSetting: newSetting.toString()})) {
            zonesData.find(z => z.zone === zone).setting = newSetting;
            updateZonesUI();
        }
    } else if (e.target.classList.contains('zone-percent-minus')) {
        const zone = parseInt(e.target.dataset.zone);
        const current = zonesData.find(z => z.zone === zone).userPercentSetting;
        const newPercent = Math.max(0, current - 10);
        const setting = zonesData.find(z => z.zone === zone).setting;
        if (await setCommand({action: 'setZoneData', zone: zone.toString(), zoneSetting: setting.toString(), userPercentSetting: newPercent.toString()})) {
            zonesData.find(z => z.zone === zone).userPercentSetting = newPercent;
            updateZonesUI();
        }
    } else if (e.target.classList.contains('zone-percent-plus')) {
        const zone = parseInt(e.target.dataset.zone);
        const current = zonesData.find(z => z.zone === zone).userPercentSetting;
        const newPercent = Math.min(100, current + 10);
        const setting = zonesData.find(z => z.zone === zone).setting;
        if (await setCommand({action: 'setZoneData', zone: zone.toString(), zoneSetting: setting.toString(), userPercentSetting: newPercent.toString()})) {
            zonesData.find(z => z.zone === zone).userPercentSetting = newPercent;
            updateZonesUI();
        }
    }
});

// Timer
document.getElementById('timer-toggle').addEventListener('click', async () => {
    if (timerEndTime && timerEndTime > new Date()) {
        // Turn off existing timer
        if (await setCommand({action: 'setZoneTimer', startTimeHours: '0', startTimeMinutes: '0', endTimeHours: '0', endTimeMinutes: '0', scheduleStatus: '0'})) {
            timerEndTime = null;
            updateTimerUI();
        }
    } else {
        // Set new timer - determine if it's a turn-on or turn-off timer based on aircon state
        // Use the currently displayed time as the duration
        const displayedMinutes = parseInt(document.getElementById('timer-remaining').textContent);
        let timerTime = new Date(Date.now() + displayedMinutes * 60000);

        // If aircon is currently off, set a turn-on timer (status 1) - round to quarter hour
        // If aircon is currently on, set a turn-off timer (status 2) - use exact time
        const scheduleStatus = systemData.airconOnOff === '0' ? '1' : '2';

        if (scheduleStatus === '1') {
            // Start timer - round to nearest quarter hour
            timerTime = roundToQuarterHour(timerTime);
        }

        const timeHours = timerTime.getHours().toString();
        const timeMinutes = timerTime.getMinutes().toString().padStart(2, '0');

        const params = {
            action: 'setZoneTimer',
            scheduleStatus: scheduleStatus
        };

        if (scheduleStatus === '1') {
            // Start timer - set start time
            params.startTimeHours = timeHours;
            params.startTimeMinutes = timeMinutes;
            params.endTimeHours = '0';
            params.endTimeMinutes = '0';
        } else {
            // End timer - set end time
            params.startTimeHours = '0';
            params.startTimeMinutes = '0';
            params.endTimeHours = timeHours;
            params.endTimeMinutes = timeMinutes;
        }

        if (await setCommand(params)) {
            timerEndTime = timerTime;
            updateTimerUI();
        }
    }
});

// Function to send updated timer to server when +/- buttons are used
async function updateTimerOnServer() {
    if (!timerEndTime) return;

    const timeHours = timerEndTime.getHours().toString();
    const timeMinutes = timerEndTime.getMinutes().toString().padStart(2, '0');
    // Use the same logic as timer toggle - determine status based on current aircon state
    const scheduleStatus = systemData.airconOnOff === '0' ? '1' : '2';

    const params = {
        action: 'setZoneTimer',
        scheduleStatus: scheduleStatus
    };

    if (scheduleStatus === '1') {
        // Start timer - set start time
        params.startTimeHours = timeHours;
        params.startTimeMinutes = timeMinutes;
        params.endTimeHours = '0';
        params.endTimeMinutes = '0';
    } else {
        // End timer - set end time
        params.startTimeHours = '0';
        params.startTimeMinutes = '0';
        params.endTimeHours = timeHours;
        params.endTimeMinutes = timeMinutes;
    }

    await setCommand(params);
}

document.getElementById('timer-minus').addEventListener('click', async () => {
    if (!timerEndTime) return;

    // For start timers (when aircon is off), use quarter-hour increments
    // For end timers (when aircon is on), use 15-minute increments
    const isStartTimer = systemData.airconOnOff === '0';

    let newEndTime;
    if (isStartTimer) {
        // Start timer - go to previous quarter hour
        const currentMinutes = timerEndTime.getMinutes();
        const currentQuarter = Math.floor(currentMinutes / 15) * 15;
        newEndTime = new Date(timerEndTime);

        if (currentQuarter === 0) {
            // Go to previous hour :45
            newEndTime.setHours(timerEndTime.getHours() - 1);
            newEndTime.setMinutes(45);
        } else {
            // Go to previous quarter hour in same hour
            newEndTime.setMinutes(currentQuarter - 15);
        }
    } else {
        // End timer - simply subtract 15 minutes
        newEndTime = new Date(timerEndTime.getTime() - 15 * 60000);
    }

    // Only update if new time is in the future
    if (newEndTime > new Date()) {
        timerEndTime = newEndTime;
        updateTimerUI();
        await updateTimerOnServer();
    }
});

document.getElementById('timer-plus').addEventListener('click', async () => {
    if (!timerEndTime) return;

    // For start timers (when aircon is off), use quarter-hour increments
    // For end timers (when aircon is on), use 15-minute increments
    const isStartTimer = systemData.airconOnOff === '0';

    let newEndTime;
    if (isStartTimer) {
        // Start timer - go to next quarter hour
        const currentMinutes = timerEndTime.getMinutes();
        const currentQuarter = Math.floor(currentMinutes / 15) * 15;
        newEndTime = new Date(timerEndTime);

        if (currentQuarter === 45) {
            // Go to next hour :00
            newEndTime.setHours(timerEndTime.getHours() + 1);
            newEndTime.setMinutes(0);
        } else {
            // Go to next quarter hour in same hour
            newEndTime.setMinutes(currentQuarter + 15);
        }
    } else {
        // End timer - simply add 15 minutes
        newEndTime = new Date(timerEndTime.getTime() + 15 * 60000);
    }

    timerEndTime = newEndTime;
    updateTimerUI();
    await updateTimerOnServer();
});