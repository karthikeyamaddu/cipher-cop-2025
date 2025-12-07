import express from 'express';
import { phishingQueue, cloneQueue, malwareQueue, scamQueue } from '../queues/index.js';
import { TestResult } from '../models/TestResult.js';
import { protectRoute } from '../controller/tokengen.js';

const router = express.Router();

// Get queue statistics
router.get('/stats', protectRoute, async (req, res) => {
  try {
    const queues = [
      { name: 'phishing', queue: phishingQueue },
      { name: 'clone', queue: cloneQueue },
      { name: 'malware', queue: malwareQueue },
      { name: 'scam', queue: scamQueue }
    ];
    
    const stats = await Promise.all(
      queues.map(async ({ name, queue }) => {
        const [waiting, active, completed, failed, delayed] = await Promise.all([
          queue.getWaitingCount(),
          queue.getActiveCount(),
          queue.getCompletedCount(),
          queue.getFailedCount(),
          queue.getDelayedCount()
        ]);
        
        return {
          name,
          waiting,
          active,
          completed,
          failed,
          delayed,
          total: waiting + active + completed + failed + delayed
        };
      })
    );
    
    // Get database stats
    const dbStats = await TestResult.aggregate([
      {
        $group: {
          _id: '$processingStatus',
          count: { $sum: 1 }
        }
      }
    ]);
    
    const dbStatusCounts = {
      queued: 0,
      processing: 0,
      completed: 0,
      failed: 0
    };
    
    dbStats.forEach(stat => {
      if (stat._id) {
        dbStatusCounts[stat._id] = stat.count;
      }
    });
    
    res.json({
      success: true,
      data: {
        queues: stats,
        database: dbStatusCounts,
        timestamp: new Date()
      }
    });
    
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch queue statistics'
    });
  }
});

// Get recent jobs
router.get('/recent-jobs', protectRoute, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    
    const recentTests = await TestResult.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('testType processingStatus queuePosition createdAt startedAt completedAt attempts lastError userId');
    
    res.json({
      success: true,
      data: recentTests
    });
    
  } catch (error) {
    console.error('Recent jobs error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch recent jobs'
    });
  }
});

// Get active jobs
router.get('/active-jobs', protectRoute, async (req, res) => {
  try {
    const activeTests = await TestResult.find({
      processingStatus: { $in: ['queued', 'processing'] }
    })
      .sort({ queuedAt: 1 })
      .select('testType processingStatus queuePosition queuedAt startedAt attempts userId inputData');
    
    res.json({
      success: true,
      data: activeTests
    });
    
  } catch (error) {
    console.error('Active jobs error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch active jobs'
    });
  }
});

// Retry failed job
router.post('/retry/:testId', protectRoute, async (req, res) => {
  try {
    const { testId } = req.params;
    
    const test = await TestResult.findById(testId);
    if (!test) {
      return res.status(404).json({
        success: false,
        error: 'Test not found'
      });
    }
    
    // Reset status to queued
    test.processingStatus = 'queued';
    test.lastError = null;
    test.attempts = 0;
    test.auditTrail.push({
      status: 'queued',
      timestamp: new Date(),
      message: 'Manually retried by admin'
    });
    await test.save();
    
    // Re-queue the job based on test type
    let queue;
    if (test.testType.startsWith('phishing')) queue = phishingQueue;
    else if (test.testType.startsWith('clone')) queue = cloneQueue;
    else if (test.testType.startsWith('malware')) queue = malwareQueue;
    else if (test.testType.startsWith('scam')) queue = scamQueue;
    
    if (queue) {
      await queue.add({
        testId: test._id,
        ...test.inputData
      }, {
        jobId: test._id.toString()
      });
    }
    
    res.json({
      success: true,
      message: 'Job retried successfully'
    });
    
  } catch (error) {
    console.error('Retry job error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retry job'
    });
  }
});

export default router;
