// Initialize WebSocket for real-time challenge updates
const socket = new WebSocket(`${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`);
let currentCountry = null;

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
    if (data.type === 'challengeStart' && data.challengeId) {
        // Show a notification first
        const notification = document.createElement('div');
        notification.className = 'challenge-notification animate__animated animate__bounceIn';
        notification.innerHTML = `
            <h2>Challenge Starting!</h2>
            <p>${data.challengerCountry} vs ${data.challengedCountry}</p>
            <p>Get ready to click!</p>
        `;
        document.body.appendChild(notification);

        // Remove notification and start competition after 2 seconds
        setTimeout(() => {
            notification.remove();
            startClickingCompetition(
                data.challengeId,
                data.challengerCountry,
                data.challengedCountry
            );
        }, 2000);
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
            alert('Challenge created successfully!');
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
        challengesList.innerHTML = challenges.length === 0 
            ? '<p>No active challenges</p>'
            : challenges.map(challenge => createChallengeCard(challenge)).join('');
    } catch (error) {
        console.error('Error fetching challenges:', error);
    }
}

// Create challenge card HTML
function createChallengeCard(challenge) {
    const statusColors = {
        pending: '#ffa500',
        active: '#4CAF50',
        completed: '#666'
    };

    return `
        <div class="challenge-card">
            <div class="challenge-card-header">
                <span class="challenge-card-title">${challenge.challenger_country} vs ${challenge.challenged_country}</span>
                <span class="challenge-card-status" style="background: ${statusColors[challenge.status]}">
                    ${challenge.status.toUpperCase()}
                </span>
            </div>
            <div class="challenge-card-details">
                <span>Bet Amount: ${challenge.bet_amount} clicks</span>
                <span>Created: ${new Date(challenge.created_at).toLocaleString()}</span>
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

// Handle clicking competition
function startClickingCompetition(challengeId, challengerCountry, challengedCountry) {
    // Only show button if this user is part of the challenge
    if (currentCountry !== challengerCountry && currentCountry !== challengedCountry) {
        return;
    }

    // Close the challenge modal if it's open
    challengeModal.style.display = 'none';

    // Create the challenge button
    const challengeButton = document.createElement('button');
    challengeButton.id = 'challengeFrenzyButton';
    challengeButton.className = 'challenge-frenzy-button animate__animated animate__bounceIn';
    challengeButton.innerHTML = 'CLICK FAST!<br>30s left';
    
    // Add button to the page - make it very visible
    document.body.appendChild(challengeButton);
    challengeButton.style.position = 'fixed';
    challengeButton.style.bottom = '50%';
    challengeButton.style.left = '50%';
    challengeButton.style.transform = 'translate(-50%, 50%)';
    challengeButton.style.zIndex = '9999';
    challengeButton.style.padding = '40px 80px';
    challengeButton.style.fontSize = '32px';
    challengeButton.style.backgroundColor = '#ff4d4d';
    challengeButton.style.color = 'white';
    challengeButton.style.border = '4px solid #fff';
    challengeButton.style.borderRadius = '15px';
    challengeButton.style.cursor = 'pointer';
    challengeButton.style.boxShadow = '0 0 40px rgba(255, 77, 77, 0.8)';
    challengeButton.style.animation = 'pulse 1s infinite';
    
    let clicks = 0;
    let timeLeft = 30;
    let isCompetitionActive = true;
    
    // Update timer
    const timer = setInterval(() => {
        timeLeft--;
        if (timeLeft >= 0) {
            challengeButton.innerHTML = `CLICK FAST!<br>${timeLeft}s left`;
        } else {
            clearInterval(timer);
            endCompetition();
        }
    }, 1000);
    
    // Handle clicks
    challengeButton.addEventListener('click', async () => {
        if (!isCompetitionActive) return;
        
        clicks++;
        // Send click to server
        try {
            await fetch(`/api/challenge/${challengeId}/click`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ clicks: 1 })
            });
        } catch (error) {
            console.error('Error sending click:', error);
        }
    });
    
    // End competition after 30 seconds
    function endCompetition() {
        isCompetitionActive = false;
        challengeButton.remove();
        
        // Get final results
        fetch(`/api/challenge/${challengeId}/result`)
            .then(response => response.json())
            .then(data => {
                const resultDiv = document.createElement('div');
                resultDiv.className = 'challenge-result';
                resultDiv.innerHTML = `
                    <h3>Challenge Results</h3>
                    <p>${data.challenger_country}: ${data.challenger_clicks} clicks</p>
                    <p>${data.challenged_country}: ${data.challenged_clicks} clicks</p>
                    <p class="winner">Winner: ${data.winner_country}!</p>
                    <p>Prize: ${data.prize} clicks</p>
                `;
                document.querySelector('.challenge-content').appendChild(resultDiv);
                
                // Refresh challenges list after showing results
                setTimeout(() => {
                    refreshChallenges();
                    resultDiv.remove();
                }, 5000);
            })
            .catch(error => {
                console.error('Error getting results:', error);
            });
    }
}

// Initialize refresh interval
setInterval(refreshChallenges, 30000); // Refresh every 30 seconds