const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { sendWinnerEmail, sendCommercialEmail } = require('./private/js/email');
const playerService = require('./private/js/players');
const { calculatePrize } = require('./private/js/prizes');

// Initialize express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Routes
app.post('/api/validate-vat', async (req, res) => {
  const { vatNumber } = req.body;
  
  if (!vatNumber) {
    return res.status(400).json({ error: 'VAT Number is required' });
  }
  
  try {
    const player = await playerService.findPlayerByVatNumber(vatNumber);
    
    if (!player) {
      return res.status(404).json({ error: 'VAT Number not authorized to play.' });
    }
    
    if (player.hasPlayed) {
      return res.status(403).json({ error: 'You have already played with this VAT Number.' });
    }
    
    return res.json({ success: true, playerName: player.name });
  } catch (error) {
    console.error('Error validating VAT number', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Route to record game result
app.post('/api/record-game', async (req, res) => {
  const { vatNumber, prize, playerName, playerEmail } = req.body;
  
  try {
    const player = await playerService.findPlayerByVatNumber(vatNumber);
    
    if (!player) {
      return res.status(404).json({ error: 'Unauthorized VAT Number' });
    }
    
    if (player.hasPlayed) {
      return res.status(403).json({ error: 'You have already played' });
    }
    
    // Update player record
    player.hasPlayed = true;
    player.prize = prize;
    player.playedAt = new Date();
    
    if (playerEmail) {
      player.email = playerEmail;
    }
    
    // Save player
    await playerService.savePlayer(player);
    
    // Send emails
    await sendWinnerEmail(player.email || playerEmail, playerName, prize);
    await sendCommercialEmail(vatNumber, playerName, prize, playerEmail);
    
    return res.json({ success: true });
  } catch (error) {
    console.error('Error recording game', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin route to add authorized VAT numbers
app.post('/api/add-vat', async (req, res) => {
  const { vatNumber, name, email } = req.body;
  
  try {
    const existingPlayer = await playerService.findPlayerByVatNumber(vatNumber);
    
    if (existingPlayer) {
      return res.status(400).json({ error: 'VAT Number already exists in the system' });
    }
    
    const newPlayer = {
      vatNumber,
      name,
      email,
      hasPlayed: false,
      prize: null,
      playedAt: null,
      createdAt: new Date()
    };
    
    await playerService.savePlayer(newPlayer);
    
    return res.json({ success: true });
  } catch (error) {
    console.error('Error adding VAT number', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Route to calculate prize
app.get('/api/calculate-prize', async (req, res) => {
    try {
        const prize = await calculatePrize();
        
        if (prize) {
            res.json({ success: true, prize: prize.name });
        } else {
            res.status(404).json({ success: false, message: 'No prize available' });
        }
    } catch (error) {
        console.error('Error calculating prize:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Start server
app.listen(PORT, () => {
  console.log('========================================');
  console.log('Application logs start here');
  console.log('========================================');
  console.log('')
  console.log(`Server running on port ${PORT}`);
  console.log('')
});
