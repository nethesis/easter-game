document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const validateBtn = document.getElementById('validate-btn');
    const vatNumberInput = document.getElementById('vat-number');
    const loginSection = document.getElementById('login-section');
    const gameSection = document.getElementById('game-section');
    const resultSection = document.getElementById('result-section');
    const playerNameSpan = document.getElementById('player-name');
    const prizeNameSpan = document.getElementById('prize-name');
    const errorMessage = document.getElementById('error-message');
    const playerEmailInput = document.getElementById('player-email');
    const eggs = document.querySelectorAll('.egg');
    
    // Global variables
    let currentVatNumber = '';
    let currentPlayerName = '';
    
    // Event listeners
    validateBtn.addEventListener('click', validateVatNumber);
    vatNumberInput.addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            validateVatNumber();
        }
    });
    
    eggs.forEach(egg => {
        egg.addEventListener('click', function() {
            if (!playerEmailInput.value.trim()) {
                alert('Inserisci la tua email prima di scegliere un uovo');
                playerEmailInput.focus();
                return;
            }
            
            const prize = this.getAttribute('data-prize');
            selectEgg(egg, prize);
        });
    });
    
    // Functions
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
                          'Partita IVA non autorizzata a giocare.' : 
                          data.error === 'You have already played with this VAT Number.' ? 
                          'Hai già giocato con questa Partita IVA.' : 
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
    
    async function selectEgg(eggElement, prize) {
        // Visual feedback on selection
        eggs.forEach(egg => {
            egg.style.opacity = '0.5';
            egg.style.pointerEvents = 'none';
        });
        
        eggElement.style.opacity = '1';
        
        // Show animation (you can enhance this)
        eggElement.style.transform = 'scale(1.2)';
        
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
                    console.log('Here')
                    return;
                }
                
                // Update UI for result
                prizeNameSpan.textContent = prize;
                
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
