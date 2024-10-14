import { Connection, clusterApiUrl } from '@solana/web3.js';

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error('usage: ts-node script.ts <slot_number> <network>');
    process.exit(1);
  }

  const targetSlot = parseInt(args[0]);
  const network = args[1];

  if (isNaN(targetSlot)) {
    console.error('invalid slot number.');
    process.exit(1);
  }

  if (network !== 'mainnet' && network !== 'testnet') {
    console.error('invalid network. please specify "mainnet" or "testnet".');
    process.exit(1);
  }

  const cluster = network === 'mainnet' ? 'mainnet-beta' : 'testnet';
  const connection = new Connection(clusterApiUrl(cluster));

  try {
    // get the current slot and its timestamp
    const currentSlot = await connection.getSlot();
    const currentTimestamp = await connection.getBlockTime(currentSlot);

    if (currentTimestamp === null) {
      console.error('could not get the current timestamp.');
      process.exit(1);
    }

    const slotDifference = targetSlot - currentSlot;

    if (slotDifference <= 0) {
      // target slot is in the past or present
      const timestamp = await connection.getBlockTime(targetSlot);
      if (timestamp === null) {
        console.error(`block time not found for slot ${targetSlot}.`);
      } else {
        const date = new Date(timestamp * 1000);
        console.log(`slot: ${targetSlot}`);
        console.log(`timestamp: ${timestamp}`);
        console.log(`date and time: ${date.toString()}`);
      }
    } else {
      // target slot is in the future
      // fetch recent performance samples to calculate the avg slot time
      const samples = await connection.getRecentPerformanceSamples(100);

      if (samples.length === 0) {
        console.error('no performance samples available to estimate slot time.');
        process.exit(1);
      }

      // calculate the avg slot time
      let totalSlots = 0;
      let totalTime = 0;

      samples.forEach(sample => {
        totalSlots += sample.numSlots;
        totalTime += sample.samplePeriodSecs;
      });

      const avgSlotTime = totalTime / totalSlots;

      // estimate the timestamp
      const estimatedTime = currentTimestamp + slotDifference * avgSlotTime;
      const estimatedDate = new Date(estimatedTime * 1000);

      console.log(`slot: ${targetSlot}`);
      console.log(`estimated timestamp: ${estimatedTime}`);
      console.log(`estimated date and time: ${estimatedDate.toString()}`);
      console.log(`avg slot time: ${avgSlotTime.toFixed(4)} seconds`);
    }
  } catch (error) {
    console.error('error:', error);
  }
}

main();
