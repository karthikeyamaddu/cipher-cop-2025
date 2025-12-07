import { phishingQueue } from '../queues/index.js';
import { TestResult } from '../models/TestResult.js';
import { User } from '../lib/db.js';
import { phishingDetector } from '../checks/phishing.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ciphercop';
mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ Phishing Worker: MongoDB connected'))
  .catch(err => console.error('❌ Phishing Worker: MongoDB connection failed:', err));

// Test Redis connection
phishingQueue.client.on('connect', () => {
  console.log('✅ Phishing Worker: Redis connected');
});

phishingQueue.client.on('error', (err) => {
  console.error('❌ Phishing Worker: Redis connection error:', err);
});

phishingQueue.on('waiting', (jobId) => {
  console.log(`⏳ [Phishing Worker] Job ${jobId} is waiting in queue`);
});

phishingQueue.on('active', (job) => {
  console.log(`🔄 [Phishing Worker] Job ${job.id} is now active`);
});

// Process phishing analysis jobs
phishingQueue.process(async (job) => {
  const { testId, url, userId } = job.data;
  const startTime = Date.now();
  
  console.log(`🔍 [Phishing Worker] Processing job ${job.id} for test ${testId}`);
  
  try {
    // Update status to 'processing'
    await TestResult.findByIdAndUpdate(testId, {
      processingStatus: 'processing',
      startedAt: new Date(),
      attempts: job.attemptsMade + 1,
      $push: {
        auditTrail: {
          status: 'processing',
          timestamp: new Date(),
          message: `Worker started processing (attempt ${job.attemptsMade + 1})`
        }
      }
    });
    
    console.log(`⚙️ [Phishing Worker] Analyzing URL: ${url}`);
    
    // Perform phishing analysis
    const analysis = await phishingDetector.analyzeUrl(url);
    const processingTime = Date.now() - startTime;
    
    console.log(`✅ [Phishing Worker] Analysis complete. Risk: ${analysis.riskScore}`);
    
    // Update test result with completed analysis
    await TestResult.findByIdAndUpdate(testId, {
      processingStatus: 'completed',
      completedAt: new Date(),
      result: {
        isPhishing: analysis.isPhishing,
        threatLevel: analysis.threatLevel || 'low',
        riskScore: analysis.riskScore,
        combinedRiskScore: analysis.combinedRiskScore || analysis.riskScore,
        confidence: analysis.confidence || 0.9
      },
      details: {
        domainAge: analysis.details.domainAge || 'Unknown',
        registrar: analysis.details.registrar || 'Unknown',
        country: analysis.details.country || 'Unknown',
        reputation: analysis.details.reputation,
        similarDomains: analysis.details.similarDomains,
        expiryDate: analysis.details.expiryDate,
        nameServers: analysis.details.nameServers,
        status: analysis.details.status,
        privacyProtection: analysis.details.privacyProtection,
        lastChecked: analysis.details.lastChecked,
        aiAnalysis: analysis.aiAnalysis,
        whoisData: analysis.whoisData,
        processingTime
      },
      flags: analysis.flags,
      recommendations: analysis.aiRecommendations || [],
      insights: analysis.aiInsights || 'No AI insights available',
      processingTime,
      $push: {
        auditTrail: {
          status: 'completed',
          timestamp: new Date(),
          message: `Analysis completed successfully in ${processingTime}ms`
        }
      }
    });
    
    console.log(`💾 [Phishing Worker] Results saved for test ${testId}`);
    
    return {
      success: true,
      testId,
      riskScore: analysis.riskScore,
      processingTime
    };
    
  } catch (error) {
    console.error(`❌ [Phishing Worker] Job ${job.id} failed:`, error);
    
    // Update status to 'failed'
    await TestResult.findByIdAndUpdate(testId, {
      processingStatus: 'failed',
      completedAt: new Date(),
      lastError: error.message,
      $push: {
        auditTrail: {
          status: 'failed',
          timestamp: new Date(),
          message: `Analysis failed: ${error.message}`
        }
      }
    });
    
    throw error; // Bull will retry based on attempts config
  }
});

console.log('🚀 Phishing Worker started and listening for jobs...');
