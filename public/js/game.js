document.addEventListener('DOMContentLoaded', async () => {
    // DOM elements
    const validateBtn = document.getElementById('validate-btn');
    const vatNumberInput = document.getElementById('vat-number');
    const playerNameSpan = document.getElementById('player-name');
    const playerEmailInput = document.getElementById('player-email');
    const loginSection = document.getElementById('login-section');
    const gameSection = document.getElementById('game-section');
    const resultSection = document.getElementById('result-section');
    const errorMessage = document.getElementById('error-message');
    const prizeNameSpan = document.getElementById('prize-name');
    const eggsContainer = document.getElementById('eggs-container');
    const title = document.getElementById('title');
    
    // Variables
    let currentVatNumber = '';
    let currentPlayerName = '';
    let eggs = [];
    
    // Load prizes from JSON file
    try {        
        // Generate eggs
        generateEggs();
    } catch (error) {
        console.error('Failed to load prizes:', error);
    }
    
    // Event listeners
    validateBtn.addEventListener('click', () => {
        const vatNumber = vatNumberInput.value.trim();
        const playerEmail = playerEmailInput.value.trim();

        // Email validation
        const emailPattern = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;
        if (!vatNumber || !playerEmail) {
            errorMessage.textContent = 'Inserisci sia la Partita IVA che la tua Email.';
            return;
        }
        if (!emailPattern.test(playerEmail)) {
            errorMessage.textContent = 'Inserisci un\'email valida.';
            return;
        }

        validateVatNumber();
    });

    vatNumberInput.addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            validateVatNumber();
        }
    });
    
    function generateEggs() {
        // Clear existing eggs
        eggsContainer.innerHTML = '';

        // Generate 24 eggs (6x4 layout)
        const maxEggs = 24;

        for (let i = 0; i < maxEggs; i++) {
            const eggDiv = document.createElement('div');
            eggDiv.className = 'egg';
            eggDiv.setAttribute('data-egg-id', `egg-${i + 1}`);

            const eggImg = document.createElement('img');
            eggImg.src = 'images/egg_closed.svg';
            eggImg.alt = 'Uovo di Pasqua';

            eggDiv.appendChild(eggImg);
            eggsContainer.appendChild(eggDiv);

            // Add click event
            eggDiv.addEventListener('click', async function () {
                if (!playerEmailInput.value.trim()) {
                    alert('Inserisci la tua email prima di scegliere un uovo');
                    playerEmailInput.focus();
                    return;
                }

                try {
                    eggDiv.classList.add('shaking');

                    // Start the record-game request immediately after prize calculation
                    const recordGameRequest = await fetch('/api/record-prize', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            vatNumber: currentVatNumber,
                            playerName: currentPlayerName,
                            playerEmail: playerEmailInput.value.trim()
                        })
                    });
                    
                    eggDiv.classList.remove('shaking');
                    eggImg.src = 'images/egg_opened.svg';

                    const prize = recordGameRequest.prize;

                    // Handle the egg selection UI
                    await selectEgg(eggDiv, prize);

                    // Wait for the record-game request to complete
                    try {
                        const recordResponse = await recordGameRequest;
                        if (!recordResponse.ok) {
                            throw new Error('Errore nella registrazione del gioco');
                        }
                    } catch (error) {
                        console.error('Errore di connessione durante la registrazione del gioco:', error);
                        showError('Si è verificato un errore. Riprova più tardi.');
                    }
                } catch (error) {
                    console.error('Errore nella richiesta del regalo:', error);
                    showError('Si è verificato un errore. Riprova più tardi.');
                    eggImg.src = 'images/egg_closed.svg';
                }
            });
        }

        // Update eggs variable
        eggs = document.querySelectorAll('.egg');
    }
    
    async function validateVatNumber() {
        const vatNumber = vatNumberInput.value.trim();
        
        if (!vatNumber) {
            showError('Inserisci la tua Partita IVA');
            return;
        }
        
        try {
            const response = await fetch('/api/validate-vat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ vatNumber })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                showError(data.error === 'VAT Number not authorized to play' ? 
                          'Errore! Partita Iva inesistente' : 
                          data.error === 'You have already played with this VAT Number' ? 
                          'Errore! Partita Iva già utilizzata' : 
                          'Errore nella verifica della Partita IVA');
                return;
            }
            
            // Store current player info
            currentVatNumber = vatNumber;
            currentPlayerName = data.playerName || 'Giocatore';
            
            // Update UI
            playerNameSpan.textContent = currentPlayerName;
            errorMessage.textContent = '';
            
            // Show game section
            loginSection.classList.remove('active-section');
            loginSection.classList.add('hidden-section');
            title.classList.add('hidden-section');
            gameSection.classList.remove('hidden-section');
            gameSection.classList.add('active-section');
            
        } catch (error) {
            console.error('Error:', error);
            showError('Si è verificato un errore di connessione. Riprova più tardi.');
        }
    }
    
    async function selectEgg(eggElement, prize) {
        // Visual feedback on selection
        eggs.forEach(egg => {
            egg.style.opacity = '0.5';
            egg.style.pointerEvents = 'none';
        });

        eggElement.style.opacity = '1';

        // Show animation (you can enhance this)
        eggElement.style.transform = 'scale(1.2)';
        eggElement.classList.add('opening');

        setTimeout(async () => {
            // Update UI for result immediately
            prizeNameSpan.textContent = prize;

            // Add additional text based on prize type
            const deliveryInfoElement = document.createElement('p');
            deliveryInfoElement.className = 'delivery-info';

            // Insert the delivery info after the prize name
            const prizeRevealElement = document.querySelector('.prize-reveal');
            prizeRevealElement.appendChild(deliveryInfoElement);

            // Show confetti
            startConfetti();

            // Show result section
            gameSection.classList.remove('active-section');
            gameSection.classList.add('hidden-section');
            resultSection.classList.remove('hidden-section');
            resultSection.classList.add('active-section');
        }, 2000);
    }
    
    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.style.opacity = '1';
    }
    
    function startConfetti() {
        const confettiSettings = { target: 'confetti-container', max: 150, size: 1.5 };
        const confetti = new ConfettiGenerator(confettiSettings);
        confetti.render();
        
        // Stop confetti after 5 seconds
        setTimeout(() => {
            confetti.clear();
        }, 5000);
    }
});
