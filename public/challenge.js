// Initialize WebSocket for real-time challenge updates
const socket = new WebSocket(`${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`);
let currentCountry = null;

// Helper function to get tier info
function getTierInfo(clicks) {
  if (clicks < 1000) return { name: 'Bronze', icon: '🥉', color: '#CD7F32' };
  if (clicks < 10000) return { name: 'Silver', icon: '🥈', color: '#C0C0C0' };
  if (clicks < 100000) return { name: 'Gold', icon: '🥇', color: '#FFD700' };
  return { name: 'Legendary', icon: '💎', color: '#FF1493' };
}

// Get current country code
fetch('/api/current-country')
    .then(response => response.json())
    .then(data => {
        currentCountry = data.country;
    })
    .catch(error => console.error('Error getting current country:', error));

// Listen for challenge updates
socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    
    if (data.type === 'newChallenge') {
        // Refresh challenges list when a new one is created
        refreshChallenges();
    }
    
    if (data.type === 'challengeStart') {
        // Challenge has been accepted! Start the duel
        const challengeData = data.data;
        console.log('Challenge starting:', challengeData);
        
        // Check if current player is part of this challenge
        const isParticipant = 
            currentCountry === challengeData.challenger_country || 
            currentCountry === challengeData.challenged_country;
        
        if (!isParticipant) {
            console.log('Not a participant in this challenge, ignoring');
            return;
        }
        
        // Show notification
        const notification = document.createElement('div');
        notification.className = 'challenge-notification animate__animated animate__bounceIn';
        notification.innerHTML = `
            <h2>⚔️ DUEL STARTING!</h2>
            <p>${challengeData.challenger_country} vs ${challengeData.challenged_country}</p>
            <p>Get ready to CLICK!</p>
        `;
        document.body.appendChild(notification);

        // Start the duel after 2 seconds
        setTimeout(() => {
            notification.remove();
            startDuel(
                challengeData.challengeId,
                challengeData.challenger_country,
                challengeData.challenged_country,
                currentCountry
            );
        }, 2000);
    }
    
    if (data.type === 'challengeEnd') {
        // Challenge has ended, show results
        console.log('Challenge ended:', data.data);
        showChallengeResults(data.data);
    }
};

// Challenge Modal functionality
const challengeModal = document.getElementById('challengeModal');
const navClickerButton = document.getElementById('navClickerButton');
const closeChallenge = document.getElementById('closeChallenge');
const tabButtons = document.querySelectorAll('.tab-button');
const createChallengeBtn = document.getElementById('createChallengeBtn');

// Show challenge modal when clicking the challenge button
navClickerButton.addEventListener('click', () => {
    challengeModal.style.display = 'flex';
    refreshChallenges(); // Load active challenges
});

// Close challenge modal
closeChallenge.addEventListener('click', () => {
    challengeModal.style.display = 'none';
});

// Tab switching functionality
tabButtons.forEach(button => {
    button.addEventListener('click', () => {
        // Remove active class from all buttons
        tabButtons.forEach(btn => btn.classList.remove('active'));
        // Add active class to clicked button
        button.classList.add('active');
        
        // Show corresponding content
        const tabId = button.getAttribute('data-tab');
        document.querySelectorAll('.tab-content').forEach(content => {
            content.style.display = 'none';
        });
        document.getElementById(tabId === 'create' ? 'createChallenge' : 'activeChallenges').style.display = 'block';

        if (tabId === 'active') {
            refreshChallenges();
        }
    });
});

// Create new challenge
createChallengeBtn.addEventListener('click', async () => {
    const countryCode = document.getElementById('challengeCountry').value.toUpperCase();
    const betAmount = parseInt(document.getElementById('betAmount').value);

    if (!countryCode || !betAmount) {
        alert('Please fill in all fields');
        return;
    }

    try {
        // Get challenger info
        const myResponse = await fetch(`/api/country/${currentCountry}`);
        const myData = await myResponse.json();
        const myTier = myData.tier;
        
        // Get challenged country info
        const theirResponse = await fetch(`/api/country/${countryCode}`);
        const theirData = await theirResponse.json();
        const theirTier = theirData.tier;

        // Check if challenger has enough clicks
        if (myData.clicks < betAmount) {
            alert(`❌ Not enough clicks! You have ${myData.clicks}, but need ${betAmount}`);
            return;
        }

        // Warn if significant tier difference
        const tierDifference = Math.abs(theirData.clicks - myData.clicks);
        if (tierDifference > myData.clicks * 0.5) {
            const confirmed = confirm(
                `⚠️ Tier mismatch warning!\n\n` +
                `You (${myTier.icon} ${myTier.name}): ${myData.clicks.toLocaleString()} clicks\n` +
                `Target (${theirTier.icon} ${theirTier.name}): ${theirData.clicks.toLocaleString()} clicks\n\n` +
                `This is an unfair matchup. Continue anyway?`
            );
            if (!confirmed) return;
        }

        const response = await fetch('/api/challenge', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                challengedCountry: countryCode,
                betAmount: betAmount
            })
        });

        const data = await response.json();
        if (response.ok) {
            alert('✓ Challenge created successfully!');
            document.getElementById('challengeCountry').value = '';
            document.getElementById('betAmount').value = '';
            refreshChallenges();
        } else {
            alert(data.error || 'Failed to create challenge');
        }
    } catch (error) {
        console.error('Error creating challenge:', error);
        alert('Failed to create challenge');
    }
});

// Refresh challenges list
async function refreshChallenges() {
    try {
        const response = await fetch('/api/challenges');
        const challenges = await response.json();
        
        const challengesList = document.getElementById('challengesList');
        
        if (challenges.length === 0) {
            challengesList.innerHTML = '<p style="color: #999; padding: 20px; text-align: center;">No active challenges</p>';
        } else {
            const cards = await Promise.all(
                challenges.map(challenge => createChallengeCard(challenge))
            );
            challengesList.innerHTML = cards.join('');
        }
    } catch (error) {
        console.error('Error fetching challenges:', error);
    }
}

// Create challenge card HTML
async function createChallengeCard(challenge) {
    const statusColors = {
        pending: '#ffa500',
        active: '#4CAF50',
        completed: '#666'
    };

    // Fetch detailed info for both countries
    let challengerInfo = { clicks: 0, tier: { icon: '🥉', name: 'Unknown' } };
    let challengedInfo = { clicks: 0, tier: { icon: '🥉', name: 'Unknown' } };

    try {
        const [cRes, chRes] = await Promise.all([
            fetch(`/api/country/${challenge.challenger_country}`),
            fetch(`/api/country/${challenge.challenged_country}`)
        ]);
        
        if (cRes.ok) {
            const data = await cRes.json();
            challengerInfo = { clicks: data.clicks, tier: data.tier };
        }
        if (chRes.ok) {
            const data = await chRes.json();
            challengedInfo = { clicks: data.clicks, tier: data.tier, isShielded: data.isShielded };
        }
    } catch (error) {
        console.error('Error fetching country info:', error);
    }

    const shieldWarning = challengedInfo.isShielded ? 
        '<span style="color: #f39c12; margin-left: 10px;">🛡️ SHIELDED</span>' : '';

    return `
        <div class="challenge-card">
            <div class="challenge-card-header">
                <div style="display:flex; align-items:center; gap:15px;">
                    <div>
                        <div style="font-weight:bold;">${challenge.challenger_country}</div>
                        <div style="font-size:0.9em; color:#ccc;">
                            ${challengerInfo.tier.icon} ${challengerInfo.tier.name} (${challengerInfo.clicks.toLocaleString()} clicks)
                        </div>
                    </div>
                    <span style="color:#888;">vs</span>
                    <div>
                        <div style="font-weight:bold;">${challenge.challenged_country}</div>
                        <div style="font-size:0.9em; color:#ccc;">
                            ${challengedInfo.tier.icon} ${challengedInfo.tier.name} (${challengedInfo.clicks.toLocaleString()} clicks)
                        </div>
                    </div>
                </div>
                <span class="challenge-card-status" style="background: ${statusColors[challenge.status]}">
                    ${challenge.status.toUpperCase()}
                </span>
            </div>
            <div class="challenge-card-details">
                <span>💰 Bet: ${challenge.bet_amount} clicks</span>
                <span>📅 Created: ${new Date(challenge.created_at).toLocaleString()}</span>
                ${shieldWarning}
            </div>
            ${createChallengeActions(challenge)}
        </div>
    `;
}

// Create challenge action buttons based on challenge status
function createChallengeActions(challenge) {
    // Get current user's country
    if (!currentCountry) return ''; // If we don't know the country yet, don't show actions

    // Only show accept/reject buttons if:
    // 1. Challenge is pending
    // 2. Current user is the challenged country
    if (challenge.status === 'pending' && challenge.challenged_country === currentCountry) {
        return `
            <div class="challenge-card-actions">
                <button class="challenge-card-button accept" onclick="acceptChallenge(${challenge.id})">
                    Accept
                </button>
                <button class="challenge-card-button reject" onclick="rejectChallenge(${challenge.id})">
                    Reject
                </button>
            </div>
        `;
    }
    return '';
}

// Accept challenge
window.acceptChallenge = async function(challengeId) {
    try {
        const response = await fetch(`/api/challenge/${challengeId}/accept`, {
            method: 'POST'
        });
        const data = await response.json();
        
        if (response.ok) {
            alert('Challenge accepted! Get ready to click!');
            // The WebSocket will trigger the competition for both parties
            refreshChallenges();
        } else {
            alert(data.error || 'Failed to accept challenge');
        }
    } catch (error) {
        console.error('Error accepting challenge:', error);
        alert('Failed to accept challenge');
    }
}

// Start the duel!
function startDuel(challengeId, challengerCountry, challengedCountry, myCountry) {
    // Close the modal
    challengeModal.style.display = 'none';

    // Create the duel button
    const duelButton = document.createElement('button');
    duelButton.id = 'duelButton';
    duelButton.style.position = 'fixed';
    duelButton.style.bottom = '50%';
    duelButton.style.left = '50%';
    duelButton.style.transform = 'translate(-50%, 50%)';
    duelButton.style.zIndex = '9999';
    duelButton.style.padding = '40px 80px';
    duelButton.style.fontSize = '32px';
    duelButton.style.backgroundColor = '#ff4d4d';
    duelButton.style.color = 'white';
    duelButton.style.border = '4px solid #fff';
    duelButton.style.borderRadius = '15px';
    duelButton.style.cursor = 'pointer';
    duelButton.style.boxShadow = '0 0 40px rgba(255, 77, 77, 0.8)';
    duelButton.textContent = 'CLICK FAST!';
    
    document.body.appendChild(duelButton);

    // Create stats display
    const statsDisplay = document.createElement('div');
    statsDisplay.id = 'duelStats';
    statsDisplay.style.position = 'fixed';
    statsDisplay.style.top = '50px';
    statsDisplay.style.left = '50%';
    statsDisplay.style.transform = 'translateX(-50%)';
    statsDisplay.style.zIndex = '9998';
    statsDisplay.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
    statsDisplay.style.color = 'white';
    statsDisplay.style.padding = '20px 40px';
    statsDisplay.style.borderRadius = '10px';
    statsDisplay.style.fontSize = '24px';
    statsDisplay.style.fontWeight = 'bold';
    statsDisplay.style.textAlign = 'center';
    statsDisplay.style.minWidth = '500px';
    statsDisplay.innerHTML = `
        <div>${challengerCountry}</div>
        <div style="font-size: 18px; color: #ffd700; margin: 10px 0;">VS</div>
        <div>${challengedCountry}</div>
        <div style="margin-top: 15px; font-size: 20px;">Time: 30s</div>
    `;
    document.body.appendChild(statsDisplay);

    let clicks = 0;
    let timeLeft = 30;
    let isActive = true;

    // Timer
    const timer = setInterval(() => {
        timeLeft--;
        if (timeLeft >= 0) {
            statsDisplay.innerHTML = `
                <div>${challengerCountry}</div>
                <div style="font-size: 18px; color: #ffd700; margin: 10px 0;">VS</div>
                <div>${challengedCountry}</div>
                <div style="margin-top: 15px; font-size: 20px;">⏱️ ${timeLeft}s</div>
            `;
            duelButton.innerHTML = `CLICK FAST!<br>${timeLeft}s left`;
        } else {
            clearInterval(timer);
            isActive = false;
            endDuel(challengeId, duelButton, statsDisplay);
        }
    }, 1000);

    // Click handler
    duelButton.addEventListener('click', async () => {
        if (!isActive) return;
        
        clicks++;
        duelButton.style.transform = 'translate(-50%, 50%) scale(0.95)';
        setTimeout(() => {
            duelButton.style.transform = 'translate(-50%, 50%) scale(1)';
        }, 50);

        // Send click to server
        try {
            const response = await fetch(`/api/challenge/${challengeId}/click`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (!response.ok) {
                isActive = false;
                clearInterval(timer);
            }
        } catch (error) {
            console.error('Error sending click:', error);
        }
    });
}

// End the duel and show results
function endDuel(challengeId, duelButton, statsDisplay) {
    // Remove button
    duelButton.remove();
    
    // Fetch results
    fetch(`/api/challenge/${challengeId}/result`)
        .then(res => res.json())
        .then(data => {
            showChallengeResults(data);
            statsDisplay.remove();
        })
        .catch(error => {
            console.error('Error getting challenge results:', error);
            statsDisplay.remove();
        });
}

// Show challenge results
function showChallengeResults(data) {
    const resultDiv = document.createElement('div');
    resultDiv.style.position = 'fixed';
    resultDiv.style.top = '50%';
    resultDiv.style.left = '50%';
    resultDiv.style.transform = 'translate(-50%, -50%)';
    resultDiv.style.zIndex = '9999';
    resultDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.95)';
    resultDiv.style.color = 'white';
    resultDiv.style.padding = '40px';
    resultDiv.style.borderRadius = '15px';
    resultDiv.style.textAlign = 'center';
    resultDiv.style.border = '3px solid #ffd700';
    resultDiv.style.minWidth = '500px';
    
    const winnerMessage = data.winner_country === 'TIE' ? 
        '🤝 IT\'S A TIE!' :
        `🏆 ${data.winner_country} WINS!`;
    
    const prizeMessage = data.winner_country === 'TIE' ?
        'Bets returned to both countries' :
        `${data.winner_country} gets ${data.bet_amount * 2} clicks!`;

    resultDiv.innerHTML = `
        <h1 style="font-size: 48px; margin-bottom: 20px;">${winnerMessage}</h1>
        <div style="font-size: 24px; margin: 20px 0;">
            <div>${data.challenger_country}: <span style="color: #00ff00;">${data.challenger_clicks}</span> clicks</div>
            <div style="margin: 10px 0; color: #888;">VS</div>
            <div>${data.challenged_country}: <span style="color: #00ff00;">${data.challenged_clicks}</span> clicks</div>
        </div>
        <div style="font-size: 20px; color: #ffd700; margin-top: 20px; font-weight: bold;">
            ${prizeMessage}
        </div>
        <button onclick="this.parentElement.remove(); location.reload();" style="
            margin-top: 30px;
            padding: 15px 30px;
            font-size: 18px;
            background: #2ecc71;
            color: white;
            border: none;
            border-radius: 10px;
            cursor: pointer;
        ">
            Continue
        </button>
    `;
    
    document.body.appendChild(resultDiv);
}

// Initialize refresh interval
setInterval(refreshChallenges, 30000); // Refresh every 30 seconds