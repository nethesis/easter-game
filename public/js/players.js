const fs = require('fs');
const path = require('path');
const util = require('util');
const readline = require('readline');

// Convert fs methods to promises
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);
const appendFile = util.promisify(fs.appendFile);
const access = util.promisify(fs.access);

// Fixed paths for JSONL files - using project root instead of relative to script
const PROJECT_ROOT = path.join(__dirname, '../../');
const PLAYERS_JSONL_FILE = path.join(PROJECT_ROOT, 'data/players.jsonl');
const ACTIVE_PLAYERS_FILE = path.join(PROJECT_ROOT, 'data/active_players.jsonl');

// Initialize the required files if they don't exist
const initFiles = async () => {
  // Create data directory if it doesn't exist
  const dataDir = path.dirname(ACTIVE_PLAYERS_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log(`Created data directory: ${dataDir}`);
  }

  try {
    // Check if active players file exists
    await access(ACTIVE_PLAYERS_FILE, fs.constants.F_OK);
  } catch (error) {
    // If file doesn't exist, create an empty one
    await writeFile(ACTIVE_PLAYERS_FILE, '');
    console.log(`Created active players file: ${ACTIVE_PLAYERS_FILE}`);
  }
  
  try {
    // Check if players JSONL file exists
    await access(PLAYERS_JSONL_FILE, fs.constants.F_OK);
  } catch (error) {
    // If file doesn't exist, create an empty one
    await writeFile(PLAYERS_JSONL_FILE, '');
    console.log(`Created players file: ${PLAYERS_JSONL_FILE}`);
  }
};

// Read all active players from JSONL file
const getAllActivePlayers = async () => {
  try {
    const players = [];
    
    return new Promise((resolve, reject) => {
      const fileStream = fs.createReadStream(ACTIVE_PLAYERS_FILE);
      const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
      });
      
      rl.on('line', (line) => {
        if (!line.trim()) return; // Skip empty lines
        
        try {
          const player = JSON.parse(line);
          players.push(player);
        } catch (err) {
          console.error('Error parsing active player JSONL line:', err);
        }
      });
      
      rl.on('close', () => {
        resolve(players);
      });
      
      rl.on('error', (err) => {
        reject(err);
      });
    });
  } catch (error) {
    console.error('Error reading active players:', error);
    return [];
  }
};

// Find a player by VAT number using JSONL file
const findPlayerByVatNumber = async (vatNumber) => {
  try {
    // First check in active players
    const activePlayers = await getAllActivePlayers();
    const activePlayer = activePlayers.find(player => player.vatNumber === vatNumber);
    
    if (activePlayer) {
      return activePlayer;
    }
    
    // If not in active players, check in JSONL file
    return new Promise((resolve, reject) => {
      const fileStream = fs.createReadStream(PLAYERS_JSONL_FILE);
      const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
      });
      
      let playerFound = false; // Flag to track if player was found
      
      // Process each line (each JSON object)
      rl.on('line', (line) => {
        if (playerFound || !line.trim()) return; // Skip if player already found or empty line
        
        try {
          const player = JSON.parse(line);
          if (player.piva === vatNumber) {
            playerFound = true; // Set the flag
            
            // Convert to our player model format
            const playerModel = {
              vatNumber: player.piva,
              name: player.partner.trim(),
              email: player.email,
              hasPlayed: false,
              prize: null,
              playedAt: null,
              createdAt: new Date()
            };
            
            // Close the stream early once we find a match
            rl.close();
            fileStream.close();
            resolve(playerModel);
          }
        } catch (err) {
          console.error('Error parsing JSONL line:', err);
        }
      });
      
      rl.on('close', () => {
        // Only resolve with null if no player was found
        if (!playerFound) {
          resolve(null);
        }
      });
      
      rl.on('error', (err) => {
        reject(err);
      });
    });
  } catch (error) {
    console.error('Error finding player by VAT number:', error);
    return null;
  }
};

// Save player to active players file (JSONL format)
const savePlayer = async (player) => {
  try {
    // Read current active players
    const activePlayers = await getAllActivePlayers();
    
    // Check if player already exists
    const playerIndex = activePlayers.findIndex(p => p.vatNumber === player.vatNumber);
    
    if (playerIndex !== -1) {
      // Update existing player - requires rewriting the entire file
      activePlayers[playerIndex] = player;
      
      // Rewrite entire file with updated players
      const content = activePlayers.map(p => JSON.stringify(p)).join('\n');
      await writeFile(ACTIVE_PLAYERS_FILE, content + (activePlayers.length > 0 ? '\n' : ''));
    } else {
      // Add new player by appending to file
      const playerLine = JSON.stringify(player) + '\n';
      await appendFile(ACTIVE_PLAYERS_FILE, playerLine);
    }
    
    return player;
  } catch (error) {
    console.error('Error saving player:', error);
    throw error;
  }
};

// Add a new player directly to JSONL file
const addPlayerToJSONL = async (playerData) => {
  try {
    // Format player data to match the expected structure
    const player = {
      piva: playerData.vatNumber,
      partner: playerData.name,
      email: playerData.email
    };
    
    // Append the new player as a JSON line to the JSONL file
    const playerLine = JSON.stringify(player) + '\n';
    await appendFile(PLAYERS_JSONL_FILE, playerLine);
    
    return true;
  } catch (error) {
    console.error('Error adding player to JSONL:', error);
    throw error;
  }
};

// Initialize module
initFiles().catch(err => console.error('Error initializing files:', err));

module.exports = {
  findPlayerByVatNumber,
  savePlayer,
  addPlayerToJSONL,
  getAllActivePlayers
};
