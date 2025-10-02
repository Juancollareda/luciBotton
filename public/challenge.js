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
    if (challenge.status === 'pending') {
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
async function acceptChallenge(challengeId) {
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
function startClickingCompetition(challengeId) {
    const challengeButton = document.createElement('button');
    challengeButton.id = 'challengeFrenzyButton';
    challengeButton.className = 'challenge-frenzy-button';
    challengeButton.innerHTML = 'CLICK FAST!<br>30s left';
    
    // Add button to the page
    document.querySelector('.challenge-content').appendChild(challengeButton);
    
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

// Listen for WebSocket challenge notifications
const socket = new WebSocket(`${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`);

socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'challengeStart' && data.challengeId) {
        startClickingCompetition(data.challengeId);
    }
};

// Initialize refresh interval
setInterval(refreshChallenges, 30000); // Refresh every 30 seconds