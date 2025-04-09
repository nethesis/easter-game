const { S3Client, HeadObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');

// S3 client configuration
const s3 = new S3Client({
  credentials: {
    accessKeyId: process.env.DO_ACCESS_KEY,
    secretAccessKey: process.env.DO_SECRET_KEY
  },
  endpoint: process.env.DO_ENDPOINT,
  region: process.env.DO_REGION,
  forcePathStyle: true
});

const BUCKET_NAME = process.env.DO_BUCKET_NAME;
const PLAYERS_JSONL_FILE = 'players.jsonl';
const ACTIVE_PLAYERS_FILE = 'active_players.jsonl';

let playersCache = [];

// Helper to convert stream to string
const streamToString = async (stream) => {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf-8');
};

// Initialize the active_players.jsonl file and load players.jsonl into memory
const initFiles = async () => {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET_NAME, Key: ACTIVE_PLAYERS_FILE }));
  } catch (error) {
    if (error.name === 'NotFound') {
      const upload = new Upload({
        client: s3,
        params: {
          Bucket: BUCKET_NAME,
          Key: ACTIVE_PLAYERS_FILE,
          Body: '',
          ContentType: 'application/jsonl'
        }
      });
      await upload.done();
      console.log(`Created active players file: ${ACTIVE_PLAYERS_FILE}`);
    } else {
      console.error('Error checking active players file:', error);
      throw error;
    }
  }

  // Load players.jsonl into memory
  try {
    const data = await s3.send(new GetObjectCommand({ Bucket: BUCKET_NAME, Key: PLAYERS_JSONL_FILE }));
    const lines = (await streamToString(data.Body)).split('\n');
    playersCache = lines
      .filter(line => line.trim())
      .map(line => {
        try {
          return JSON.parse(line);
        } catch (err) {
          console.error('Error parsing players.jsonl line:', err);
          return null;
        }
      })
      .filter(player => player !== null);
    console.log('Loaded players.jsonl into memory');
  } catch (error) {
    console.error('Error loading players.jsonl into memory:', error);
    playersCache = [];
  }
};

// Read all active players from the JSONL file in the bucket
const getAllActivePlayers = async () => {
  try {
    const data = await s3.send(new GetObjectCommand({ Bucket: BUCKET_NAME, Key: ACTIVE_PLAYERS_FILE }));
    const players = [];
    const lines = (await streamToString(data.Body)).split('\n');

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

// Find a player by VAT number using the cached players data
const findPlayerByVatNumber = async (vatNumber) => {
  try {
    const player = playersCache.find(player => player.piva === vatNumber);

    if (player) {
      const activePlayers = await getAllActivePlayers();
      const activePlayer = activePlayers.find(player => player.vatNumber === vatNumber);

      if (activePlayer) {
        return activePlayer;
      }

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
    const upload = new Upload({
      client: s3,
      params: {
        Bucket: BUCKET_NAME,
        Key: ACTIVE_PLAYERS_FILE,
        Body: content,
        ContentType: 'application/jsonl'
      }
    });

    await upload.done();
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

    const data = await s3.send(new GetObjectCommand({ Bucket: BUCKET_NAME, Key: PLAYERS_JSONL_FILE }));
    const content = (await streamToString(data.Body)) + JSON.stringify(player) + '\n';

    const upload = new Upload({
      client: s3,
      params: {
        Bucket: BUCKET_NAME,
        Key: PLAYERS_JSONL_FILE,
        Body: content,
        ContentType: 'application/jsonl'
      }
    });

    await upload.done();
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
