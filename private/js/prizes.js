const {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} = require("@aws-sdk/client-s3");

// S3 client configuration
const s3 = new S3Client({
  credentials: {
    accessKeyId: process.env.DO_ACCESS_KEY,
    secretAccessKey: process.env.DO_SECRET_KEY,
  },
  endpoint: process.env.DO_ENDPOINT,
  region: process.env.DO_REGION,
  forcePathStyle: true,
});

const BUCKET_NAME = process.env.DO_BUCKET_NAME;
const PRIZES_JSONL_FILE = "data/prizes.jsonl";
const SAVE_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

// Global variable to store prizes
let prizesCache = [];
let hasChanges = false;

// Load prizes from S3 into memory
const loadPrizes = async () => {
  try {
    console.log("Loading prizes from S3...");
    const data = await s3.send(
      new GetObjectCommand({ Bucket: BUCKET_NAME, Key: PRIZES_JSONL_FILE })
    );
    const content = await data.Body.transformToString();
    
    prizesCache = content
      .split("\n")
      .filter((line) => line.trim() !== "")
      .map((line) => JSON.parse(line));
    
    console.log(`Loaded ${prizesCache.length} prizes into memory`);
    return prizesCache;
  } catch (error) {
    console.error("Error loading prizes from S3:", error);
    return [];
  }
};

// Save prizes to S3
const savePrizesToS3 = async () => {
  if (!hasChanges) {
    return;
  }
  
  try {
    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: PRIZES_JSONL_FILE,
        Body: prizesCache.map((p) => JSON.stringify(p)).join("\n"),
        ContentType: "application/jsonl",
      })
    );
    
    hasChanges = false;
    console.log("Prizes saved to S3 successfully !");
  } catch (error) {
    console.error("Error saving prizes to S3:", error);
  }
};

// Calculate prize based on in-memory prizes
const calculatePrize = async () => {
  try {

    // Filter prizes: always include those without max and used, and check used < max for others
    const availablePrizes = prizesCache.filter(
      (prize) =>
        (!("max" in prize) && !("used" in prize)) ||
        (typeof prize.max === "number" &&
          typeof prize.used === "number" &&
          prize.used < prize.max)
    );

    // Calculate total probability, ignoring prizes without the probability field
    const totalProbability = availablePrizes.reduce(
      (sum, prize) => sum + (prize.probability || 0),
      0
    );

    // Generate a random number between 0 and totalProbability
    const random = Math.random() * totalProbability;

    // Determine the winning prize
    let cumulativeProbability = 0;
    for (const prize of availablePrizes) {
      cumulativeProbability += prize.probability;
      if (random <= cumulativeProbability) {
        // Increment the used value only if max and used are defined
        if (typeof prize.max === "number" && typeof prize.used === "number") {
          // Find and update the prize in the cache
          const prizeIndex = prizesCache.findIndex(p => p.id === prize.id);
          if (prizeIndex !== -1) {
            prizesCache[prizeIndex].used += 1;
            hasChanges = true;
          }
        }

        return prize;
      }
    }

    return null; // No prize won
  } catch (error) {
    console.error("Error calculating prize:", error);
    throw error;
  }
};

// Initialize the module: load prizes and set up periodic save
(async () => {
  await loadPrizes();
  
  // Set up timer to save prizes periodically
  setInterval(async () => {
    await savePrizesToS3();
  }, SAVE_INTERVAL_MS);
  
  // Also save on process exit if possible
  process.on('SIGINT', async () => {
    console.log('Caught SIGINT, saving prizes before exit');
    await savePrizesToS3();
    process.exit();
  });
  
  process.on('SIGTERM', async () => {
    console.log('Caught SIGTERM, saving prizes before exit');
    await savePrizesToS3();
    process.exit();
  });
})();

module.exports = { calculatePrize };
