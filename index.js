const express = require('express');
const axios = require('axios');
const app = express();

// ==================== CONFIGURATION ====================
const ROBLOX_GROUP_ID = '1082241619'; 
const DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/1507662332636168255/72_Dz8oEuQYK_-RpwNrrKTzlBmz36wE4FakcRX7AN7rT1TARYZiavcVTNn12WO-iJyTQ';
const CHECK_INTERVAL = 60000; // Cek otomatis setiap 1 menit
// =======================================================

const ROBLOX_PROXY = 'https://groups.roproxy.com';
const USER_PROXY = 'https://users.roproxy.com';

let knownMembers = new Set();
let isFirstCheck = true;

async function getGroupMembers() {
    try {
        const response = await axios.get(`${ROBLOX_PROXY}/v1/groups/${ROBLOX_GROUP_ID}/users?sortOrder=Desc&limit=10`);
        return response.data.data;
    } catch (error) {
        console.error('Gagal mengambil data grup Roblox:', error.message);
        return [];
    }
}

async function getUserDetails(userId) {
    try {
        const response = await axios.get(`${USER_PROXY}/v1/users/${userId}`);
        return response.data;
    } catch (error) {
        console.error(`Gagal mengambil detail user ${userId}:`, error.message);
        return null;
    }
}

function formatDates(createdDateStr) {
    const createdDate = new Date(createdDateStr);
    const now = new Date();
    
    const diffTime = Math.abs(now - createdDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const years = Math.floor(diffDays / 365);
    let ageString = `${diffDays} days ago`;
    if (years > 0) ageString = `${years} years ago`;

    const eligibleDate = new Date(now.getTime() + (14 * 24 * 60 * 60 * 1000));
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    
    return {
        joinDate: now.toLocaleDateString('en-US', options),
        eligibleDate: eligibleDate.toLocaleDateString('en-US', options),
        accountAge: ageString,
        createdYear: createdDate.toLocaleDateString('en-US', options)
    };
}

async function sendDiscordWebhook(member, details) {
    const dates = formatDates(details.created);
    const avatarUrl = `https://www.roblox.com/headshot-thumbnail/image?userId=${member.user.userId}&width=150&height=150&format=png`;

    const payload = {
        embeds: [
            {
                title: "Member Joined Community",
                description: `**${member.user.displayName} (@${member.user.username})**`,
                color: 5763719,
                thumbnail: { url: avatarUrl },
                fields: [
                    { name: "• Community Roblox", value: `Hello Gold (${ROBLOX_GROUP_ID})`, inline: false },
                    { name: "• User ID", value: `${member.user.userId}`, inline: false },
                    { name: "• Account Age", value: dates.accountAge, inline: false },
                    { name: "• Created At", value: dates.createdYear, inline: false },
                    { name: "• Join Date", value: dates.joinDate, inline: false },
                    { name: "• Eligible Date (+14 days)", value: dates.eligibleDate, inline: false },
                    { name: "• Description", value: details.description || "No Roblox description.", inline: false }
                ],
                footer: { text: "Roblox Group Monitor" },
                timestamp: new Date()
            }
        ]
    };

    try {
        await axios.post(DISCORD_WEBHOOK_URL, payload);
        console.log(`Notifikasi terkirim untuk: ${member.user.username}`);
    } catch (error) {
        console.error('Gagal mengirim ke Discord Webhook:', error.message);
    }
}

async function monitorGroup() {
    const currentMembers = await getGroupMembers();
    
    if (isFirstCheck) {
        currentMembers.forEach(member => knownMembers.add(member.user.userId));
        isFirstCheck = false;
        console.log(`Sistem dimulai. Memantau grup ID ${ROBLOX_GROUP_ID}... (${knownMembers.size} member awal dicatat)`);
        return;
    }

    for (const member of currentMembers) {
        if (!knownMembers.has(member.user.userId)) {
            knownMembers.add(member.user.userId);
            const details = await getUserDetails(member.user.userId);
            if (details) {
                await sendDiscordWebhook(member, details);
            }
        }
    }
}

app.get('/', (req, res) => {
    res.send('Bot Monitor Roblox Aktif!');
});

app.listen(process.env.PORT || 3000, () => {
    console.log('Server berjalan...');
    setInterval(monitorGroup, CHECK_INTERVAL);
    monitorGroup();
});
