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
    
    // Variables
    let currentVatNumber = '';
    let currentPlayerName = '';
    let eggs = [];
    let allPrizes = [];
    
    // Load prizes from JSON file
    try {
        const response = await fetch('/data/prizes.json');
        const data = await response.json();
        
        // Generate all prizes based on quantities
        allPrizes = generatePrizePool(data.prizes);
        
        // Shuffle prizes for randomness
        shufflePrizes(allPrizes);
        
        // Generate eggs
        generateEggs(allPrizes);
    } catch (error) {
        console.error('Failed to load prizes:', error);
    }
    
    // Event listeners
    validateBtn.addEventListener('click', validateVatNumber);
    vatNumberInput.addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            validateVatNumber();
        }
    });
    
    // Functions
    function generatePrizePool(prizesData) {
        let prizePool = [];
        
        prizesData.forEach(prize => {
            for (let i = 0; i < prize.quantity; i++) {
                prizePool.push({
                    id: `${prize.id}-${i+1}`,
                    name: prize.name,
                    image: prize.image,
                    type: prize.type,
                    originalId: prize.id
                });
            }
        });
        
        return prizePool;
    }
    
    function generateEggs(prizes) {
        // Clear existing eggs
        eggsContainer.innerHTML = '';
        
        // Limit to 100 eggs maximum
        const maxEggs = Math.min(prizes.length, 100);
        const displayPrizes = prizes.slice(0, maxEggs);
        
        // Create eggs based on prizes
        displayPrizes.forEach(prize => {
            const eggDiv = document.createElement('div');
            eggDiv.className = 'egg';
            eggDiv.setAttribute('data-prize', prize.name);
            eggDiv.setAttribute('data-prize-id', prize.id);
            eggDiv.setAttribute('data-prize-type', prize.type);
            
            const eggImg = document.createElement('img');
            eggImg.src = 'images/egg.png';
            eggImg.alt = 'Uovo di Pasqua';
            
            eggDiv.appendChild(eggImg);
            eggsContainer.appendChild(eggDiv);
            
            // Add click event
            eggDiv.addEventListener('click', function() {
                if (!playerEmailInput.value.trim()) {
                    alert('Inserisci la tua email prima di scegliere un uovo');
                    playerEmailInput.focus();
                    return;
                }
                
                const prizeName = this.getAttribute('data-prize');
                const prizeType = this.getAttribute('data-prize-type');
                selectEgg(this, prizeName, prizeType);
            });
        });
        
        // Update eggs variable
        eggs = document.querySelectorAll('.egg');
    }
    
    function shufflePrizes(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
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
                showError(data.error === 'VAT Number not authorized to play.' ? 
                          'Errore! Partita Iva inesistente' : 
                          data.error === 'You have already played with this VAT Number.' ? 
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
            gameSection.classList.remove('hidden-section');
            gameSection.classList.add('active-section');
            
        } catch (error) {
            console.error('Error:', error);
            showError('Si è verificato un errore di connessione. Riprova più tardi.');
        }
    }
    
    async function selectEgg(eggElement, prize, prizeType) {
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
            // Record game result
            try {
                const response = await fetch('/api/record-game', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        vatNumber: currentVatNumber,
                        prize: prize,
                        prizeType: prizeType,
                        playerName: currentPlayerName,
                        playerEmail: playerEmailInput.value.trim()
                    })
                });
                
                const data = await response.json();
                
                if (!response.ok) {
                    showError(data.error === 'Unauthorized VAT Number' ? 
                              'Partita IVA non autorizzata' : 
                              data.error === 'You have already played' ? 
                              'Hai già giocato' : 
                              'Errore nella registrazione del gioco');
                    return;
                }
                
                // Update UI for result
                prizeNameSpan.textContent = prize;
                
                // Add additional text based on prize type
                const deliveryInfoElement = document.createElement('p');
                deliveryInfoElement.className = 'delivery-info';
                
                if (prizeType === 'shipping') {
                    deliveryInfoElement.textContent = 'Ti contatteremo per la spedizione del premio fisico.';
                } else {
                    deliveryInfoElement.textContent = 'Riceverai il codice via email entro 24 ore.';
                }
                
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
                
            } catch (error) {
                console.error('Error:', error);
                showError('Si è verificato un errore di connessione. Riprova più tardi.');
            }
        }, 1000);
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
