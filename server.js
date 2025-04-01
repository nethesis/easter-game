const express = require('express');
const cors = require('cors');
const path = require('path');
const { sendWinnerEmail, sendCommercialEmail } = require('./public/js/email');
const { Player, sequelize } = require('./models/player');

// Initialize express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Connect to PostgreSQL
sequelize.sync()
  .then(() => console.log('Connected to PostgreSQL'))
  .catch(err => console.error('Could not connect to PostgreSQL', err));

// Routes
app.post('/api/validate-vat', async (req, res) => {
  const { vatNumber } = req.body;
  
  if (!vatNumber) {
    return res.status(400).json({ error: 'VAT Number is required' });
  }
  
  try {
    const player = await Player.findOne({ where: { vatNumber } });
    
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

app.post('/api/record-game', async (req, res) => {
  const { vatNumber, prize, playerName, playerEmail } = req.body;
  
  try {
    console.log('1')
    const player = await Player.findOne({ where: { vatNumber } });
    console.log('2')
    
    if (!player) {
      return res.status(404).json({ error: 'Unauthorized VAT Number' });
    }
    console.log('3')
    
    if (player.hasPlayed) {
      return res.status(403).json({ error: 'You have already played' });
    }
    console.log('4')
    
    // Update player record
    player.hasPlayed = true;
    player.prize = prize;
    player.playedAt = new Date();

    console.log('5')
    
    if (playerEmail) {
      player.email = playerEmail;
    }
    
    await player.save();
    
    // Send emails
    // await sendWinnerEmail(player.email || playerEmail, playerName, prize);
    // await sendCommercialEmail(vatNumber, playerName, prize);
    
    return res.json({ success: true });
  } catch (error) {
    console.error('Error recording game', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin route to add authorized VAT numbers
app.post('/api/admin/add-vat', async (req, res) => {
  const { vatNumber, name, email } = req.body;
  
  try {
    const existingPlayer = await Player.findOne({ where: { vatNumber } });
    
    if (existingPlayer) {
      return res.status(400).json({ error: 'VAT Number already exists in the system' });
    }
    
    await Player.create({
      vatNumber,
      name,
      email,
      hasPlayed: false
    });
    
    return res.json({ success: true });
  } catch (error) {
    console.error('Error adding VAT number', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
