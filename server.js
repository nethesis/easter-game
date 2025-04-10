const express = require('express');
const cors = require('cors');
const path = require('path');
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
  console.log(`${req.method} ${req.url}`);
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
      return res.status(404).json({ error: 'VAT Number not authorized to play' });
    }
    
    if (player.hasPlayed) {
      return res.status(403).json({ error: 'You have already played with this VAT Number' });
    }
    
    return res.json({ playerName: player.name });
  } catch (error) {
    console.error('Error validating VAT number', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Route to record game result
app.post('/api/record-prize', async (req, res) => {
  const { vatNumber, playerName, playerEmail } = req.body;

  // Validate input fields
  if (!vatNumber || !playerName || !playerEmail) {
    return res.status(400).json({ error: 'Incomplete input data' });
  }

  try {
    const player = await playerService.findPlayerByVatNumber(vatNumber);
    const prize = await calculatePrize();

    if (!player || player.name !== playerName) {
      return res.status(404).json({ error: 'Invalid input data' });
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

    return res.json({ prize: prize });
  } catch (error) {
    console.error('Error recording game', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log('========================================');
  console.log('Application logs start here');
  console.log('========================================');
  console.log('');
  console.log(`Server running on port ${PORT}`);
  console.log('');
});
