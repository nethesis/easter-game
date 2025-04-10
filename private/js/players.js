const { S3Client, HeadObjectCommand, GetObjectCommand, PutObjectCommand, ListObjectsCommand } = require('@aws-sdk/client-s3');
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
const ACTIVE_PLAYERS_FOLDER = 'active_players/';

let playersCache = [];

// Helper to convert stream to string
const streamToString = async (stream) => {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf-8');
};

// Initialize the active_players folder and load players.jsonl into memory
const initFiles = async () => {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET_NAME, Key: ACTIVE_PLAYERS_FOLDER }));
    console.log(`Active players folder exists: ${ACTIVE_PLAYERS_FOLDER}`);
  } catch (error) {
    if (error.name === 'NotFound') {
      console.log(`Active players folder does not exist. Creating: ${ACTIVE_PLAYERS_FOLDER}`);
      const upload = new Upload({
        client: s3,
        params: {
          Bucket: BUCKET_NAME,
          Key: `${ACTIVE_PLAYERS_FOLDER}`, // Ensure it ends with a slash to create a folder
          Body: '', // Empty body to represent a folder
          ContentType: 'application/x-directory'
        }
      });
      await upload.done();
    } else {
      console.error('Error checking active players folder:', error);
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

// Helper to list all files in the active_players folder
const listActivePlayerFiles = async () => {
  try {
    const data = await s3.send(new ListObjectsCommand({ Bucket: BUCKET_NAME, Prefix: ACTIVE_PLAYERS_FOLDER }));
    return data.Contents ? data.Contents.map(item => item.Key) : [];
  } catch (error) {
    console.error('Error listing active player files:', error);
    return [];
  }
};

// Helper to read a player's file
const readPlayerFile = async (fileKey) => {
  try {
    // Check if the file exists
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET_NAME, Key: fileKey }));
  } catch (error) {
    if (error.name === 'NotFound') {
      return false;
    }
    console.error(`Error checking existence of player file (${fileKey}):`, error);
    return null;
  }

  try {
    // Fetch the file content if it exists
    const data = await s3.send(new GetObjectCommand({ Bucket: BUCKET_NAME, Key: fileKey }));
    const content = await streamToString(data.Body);
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error reading player file (${fileKey}):`, error);
    return null;
  }
};

// Read all active players from the active_players folder
const getAllActivePlayers = async () => {
  try {
    const files = await listActivePlayerFiles();
    const players = await Promise.all(files.map(file => readPlayerFile(file)));
    return players.filter(player => player !== null);
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
      const fileKey = `${ACTIVE_PLAYERS_FOLDER}${vatNumber}.json`;
      const activePlayer = await readPlayerFile(fileKey);

      if (activePlayer) {
        return activePlayer;
      }

      return {
        vatNumber: player.piva,
        name: player.partner.trim(),
        email: player.email,
        hasPlayed: false,
        prize: null,
        playedAt: null
      };
    }

    return null;
  } catch (error) {
    console.error('Error finding player by VAT number:', error);
    return null;
  }
};

// Save a player to the active_players folder as a JSON file
const savePlayer = async (player) => {
  try {
    const fileKey = `${ACTIVE_PLAYERS_FOLDER}${player.vatNumber}.json`;
    const content = JSON.stringify(player, null, 2);

    await s3.send(new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileKey,
      Body: content,
      ContentType: 'application/json'
    }));

    return player;
  } catch (error) {
    console.error('Error saving player:', error);
    throw error;
  }
};

// Initialize the files
initFiles().catch(err => console.error('Error initializing files:', err));

module.exports = {
  findPlayerByVatNumber,
  savePlayer,
  getAllActivePlayers
};
