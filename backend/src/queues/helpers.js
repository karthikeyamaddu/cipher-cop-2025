import { phishingQueue, cloneQueue, malwareQueue, scamQueue } from './index.js';

/**
 * Get current queue position for a test type
 */
export async function getQueuePosition(testType) {
  let queue;
  
  if (testType.startsWith('phishing')) {
    queue = phishingQueue;
  } else if (testType.startsWith('clone')) {
    queue = cloneQueue;
  } else if (testType.startsWith('malware')) {
    queue = malwareQueue;
  } else if (testType.startsWith('scam')) {
    queue = scamQueue;
  }
  
  if (!queue) return 0;
  
  const waiting = await queue.getWaitingCount();
  const active = await queue.getActiveCount();
  
  return waiting + active + 1; // +1 for the new job
}

/**
 * Check if user has reached concurrent job limit
 */
export async function checkConcurrentLimit(userId, limit = 3) {
  const { TestResult } = await import('../models/TestResult.js');
  
  const activeJobs = await TestResult.countDocuments({
    userId,
    processingStatus: { $in: ['queued', 'processing'] }
  });
  
  return activeJobs >= limit;
}

/**
 * Add job to appropriate queue
 */
export async function addJobToQueue(testType, jobData) {
  let queue;
  
  if (testType.startsWith('phishing')) {
    queue = phishingQueue;
  } else if (testType.startsWith('clone')) {
    queue = cloneQueue;
  } else if (testType.startsWith('malware')) {
    queue = malwareQueue;
  } else if (testType.startsWith('scam')) {
    queue = scamQueue;
  }
  
  if (!queue) {
    throw new Error(`Unknown test type: ${testType}`);
  }
  
  const job = await queue.add(jobData, {
    jobId: jobData.testId.toString(),
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000
    },
    timeout: 120000 // 2 minutes timeout
  });
  
  return job;
}
