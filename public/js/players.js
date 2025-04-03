const AWS = require('aws-sdk');
const readline = require('readline');

// S3 client configuration
const s3 = new AWS.S3({
  accessKeyId: process.env.DO_ACCESS_KEY,
  secretAccessKey: process.env.DO_SECRET_KEY,
  endpoint: process.env.DO_ENDPOINT,
  region: process.env.DO_REGION,
  s3ForcePathStyle: true
});

const BUCKET_NAME = process.env.DO_BUCKET_NAME;
const PLAYERS_JSONL_FILE = 'players.jsonl';
const ACTIVE_PLAYERS_FILE = 'active_players.jsonl';

// Initialize the active_players.jsonl file if it does not exist
const initFiles = async () => {
  try {
    await s3.headObject({ Bucket: BUCKET_NAME, Key: ACTIVE_PLAYERS_FILE }).promise();
  } catch (error) {
    if (error.code === 'NotFound') {
      await s3.putObject({
        Bucket: BUCKET_NAME,
        Key: ACTIVE_PLAYERS_FILE,
        Body: '',
        ContentType: 'application/jsonl'
      }).promise();
      console.log(`Created active players file: ${ACTIVE_PLAYERS_FILE}`);
    } else {
      console.error('Error checking active players file:', error);
      throw error;
    }
  }
};

// Read all active players from the JSONL file in the bucket
const getAllActivePlayers = async () => {
  try {
    const data = await s3.getObject({ Bucket: BUCKET_NAME, Key: ACTIVE_PLAYERS_FILE }).promise();
    const players = [];
    const lines = data.Body.toString('utf-8').split('\n');

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        players.push(JSON.parse(line));
      } catch (err) {
        console.error('Error parsing active player JSONL line:', err);
      }
    }

    return players;
  } catch (error) {
    console.error('Error reading active players:', error);
    return [];
  }
};

// Find a player by VAT number using the JSONL files in the bucket
const findPlayerByVatNumber = async (vatNumber) => {
  try {
    const activePlayers = await getAllActivePlayers();
    const activePlayer = activePlayers.find(player => player.vatNumber === vatNumber);

    if (activePlayer) {
      return activePlayer;
    }

    const data = await s3.getObject({ Bucket: BUCKET_NAME, Key: PLAYERS_JSONL_FILE }).promise();
    const lines = data.Body.toString('utf-8').split('\n');

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const player = JSON.parse(line);
        if (player.piva === vatNumber) {
          return {
            vatNumber: player.piva,
            name: player.partner.trim(),
            email: player.email,
            hasPlayed: false,
            prize: null,
            playedAt: null,
            createdAt: new Date()
          };
        }
      } catch (err) {
        console.error('Error parsing JSONL line:', err);
      }
    }

    return null;
  } catch (error) {
    console.error('Error finding player by VAT number:', error);
    return null;
  }
};

// Save a player to the active_players.jsonl file in the bucket
const savePlayer = async (player) => {
  try {
    const activePlayers = await getAllActivePlayers();
    const playerIndex = activePlayers.findIndex(p => p.vatNumber === player.vatNumber);

    if (playerIndex !== -1) {
      activePlayers[playerIndex] = player;
    } else {
      activePlayers.push(player);
    }

    const content = activePlayers.map(p => JSON.stringify(p)).join('\n');
    await s3.putObject({
      Bucket: BUCKET_NAME,
      Key: ACTIVE_PLAYERS_FILE,
      Body: content,
      ContentType: 'application/jsonl'
    }).promise();

    return player;
  } catch (error) {
    console.error('Error saving player:', error);
    throw error;
  }
};

// Add a new player directly to the players.jsonl file in the bucket
const addPlayerToJSONL = async (playerData) => {
  try {
    const player = {
      piva: playerData.vatNumber,
      partner: playerData.name,
      email: playerData.email
    };

    const data = await s3.getObject({ Bucket: BUCKET_NAME, Key: PLAYERS_JSONL_FILE }).promise();
    const content = data.Body.toString('utf-8') + JSON.stringify(player) + '\n';

    await s3.putObject({
      Bucket: BUCKET_NAME,
      Key: PLAYERS_JSONL_FILE,
      Body: content,
      ContentType: 'application/jsonl'
    }).promise();

    return true;
  } catch (error) {
    console.error('Error adding player to JSONL:', error);
    throw error;
  }
};

// Initialize the files
initFiles().catch(err => console.error('Error initializing files:', err));

module.exports = {
  findPlayerByVatNumber,
  savePlayer,
  addPlayerToJSONL,
  getAllActivePlayers
};
