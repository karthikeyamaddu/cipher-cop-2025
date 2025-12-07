import Queue from 'bull';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Redis configuration (WSL)
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost', // Use localhost for WSL Redis
  port: parseInt(process.env.REDIS_PORT) || 6379,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  }
};

// Create 4 queues for different analysis types
export const phishingQueue = new Queue('phishing-analysis', {
  redis: redisConfig,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000
    },
    removeOnComplete: 100, // Keep last 100 completed jobs
    removeOnFail: 200 // Keep last 200 failed jobs
  }
});

export const cloneQueue = new Queue('clone-detection', {
  redis: redisConfig,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000
    },
    removeOnComplete: 100,
    removeOnFail: 200
  }
});

export const malwareQueue = new Queue('malware-analysis', {
  redis: redisConfig,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000
    },
    removeOnComplete: 100,
    removeOnFail: 200
  }
});

export const scamQueue = new Queue('scam-detection', {
  redis: redisConfig,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000
    },
    removeOnComplete: 100,
    removeOnFail: 200
  }
});

// Queue event listeners for logging
const setupQueueListeners = (queue, name) => {
  queue.on('completed', (job) => {
    console.log(`✅ [${name}] Job ${job.id} completed`);
  });

  queue.on('failed', (job, err) => {
    console.error(`❌ [${name}] Job ${job.id} failed:`, err.message);
  });

  queue.on('stalled', (job) => {
    console.warn(`⚠️ [${name}] Job ${job.id} stalled`);
  });
};

setupQueueListeners(phishingQueue, 'Phishing');
setupQueueListeners(cloneQueue, 'Clone');
setupQueueListeners(malwareQueue, 'Malware');
setupQueueListeners(scamQueue, 'Scam');

console.log('✅ Queue system initialized');
