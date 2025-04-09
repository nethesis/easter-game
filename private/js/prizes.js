const { S3Client, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');

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
const PRIZES_JSONL_FILE = 'prizes.jsonl';

const calculatePrize = async () => {
  try {
    // Fetch prizes.jsonl from the bucket
    const data = await s3.send(new GetObjectCommand({ Bucket: BUCKET_NAME, Key: PRIZES_JSONL_FILE }));
    const prizes = (await data.Body.transformToString())
      .split('\n')
      .filter(line => line.trim() !== '')
      .map(line => JSON.parse(line));

    // Filter prizes: always include those without max and used, and check used < max for others
    const availablePrizes = prizes.filter(prize => 
      (!('max' in prize) && !('used' in prize)) || 
      (typeof prize.max === 'number' && typeof prize.used === 'number' && prize.used < prize.max)
    );

    // Calculate total probability, ignoring prizes without the probability field
    const totalProbability = availablePrizes.reduce((sum, prize) => sum + (prize.probability || 0), 0);

    // Generate a random number between 0 and totalProbability
    const random = Math.random() * totalProbability;

    // Determine the winning prize
    let cumulativeProbability = 0;
    for (const prize of availablePrizes) {
      cumulativeProbability += prize.probability || 0; // Use 0 if probability is not defined
      if (random <= cumulativeProbability) {
        // Increment the used value only if max and used are defined
        if (typeof prize.max === 'number' && typeof prize.used === 'number') {
          prize.used += 1;

          // Update the prizes.jsonl file in the bucket
          const updatedPrizes = prizes.map(p => (p.id === prize.id ? prize : p));
          await s3.send(new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: PRIZES_JSONL_FILE,
            Body: updatedPrizes.map(p => JSON.stringify(p)).join('\n'),
            ContentType: 'application/jsonl'
          }));
        }

        return prize;
      }
    }

    return null; // No prize won
  } catch (error) {
    console.error('Error accessing prizes.jsonl:', error);
    throw error;
  }
};

module.exports = { calculatePrize };
