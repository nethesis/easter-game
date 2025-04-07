const fs = require('fs');
const path = require('path');

const calculatePrize = () => {
    const filePath = path.join(__dirname, '../data/prizes.jsonl');
    const prizes = fs.readFileSync(filePath, 'utf-8')
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

                // Update the prizes.jsonl file
                const updatedPrizes = prizes.map(p => (p.id === prize.id ? prize : p));
                fs.writeFileSync(
                    filePath,
                    updatedPrizes.map(p => JSON.stringify(p)).join('\n'),
                    'utf-8'
                );
            }

            return prize;
        }
    }

    return null; // No prize won
}

module.exports = { calculatePrize };
