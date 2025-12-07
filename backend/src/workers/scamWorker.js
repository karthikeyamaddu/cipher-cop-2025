import { scamQueue } from '../queues/index.js';
import { TestResult } from '../models/TestResult.js';
import { User } from '../lib/db.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ciphercop';
mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ Scam Worker: MongoDB connected'))
  .catch(err => console.error('❌ Scam Worker: MongoDB connection failed:', err));

// Process scam detection jobs
scamQueue.process(async (job) => {
  const { testId, phoneNumber, phoneNumberHash, score, verdict, providers, enhancedAnalysis, aiAnalysis, reportsCount, userId } = job.data;
  const startTime = Date.now();
  
  console.log(`🔍 [Scam Worker] Processing job ${job.id} for test ${testId}`);
  
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
    
    console.log(`⚙️ [Scam Worker] Analyzing phone number: ${phoneNumber}`);
    
    // Determine if scam based on score
    const isScam = score >= 50;
    const threatLevel = score >= 80 ? 'high' : score >= 50 ? 'medium' : 'low';
    
    const processingTime = Date.now() - startTime;
    
    console.log(`✅ [Scam Worker] Analysis complete. Scam: ${isScam}, Score: ${score}`);
    
    // Update test result
    await TestResult.findByIdAndUpdate(testId, {
      processingStatus: 'completed',
      completedAt: new Date(),
      result: {
        isScam,
        threatLevel,
        riskScore: score,
        confidence: enhancedAnalysis?.confidence || 0.7,
        verdict: verdict || 'unknown'
      },
      details: {
        providers: providers || [],
        enhancedAnalysis: enhancedAnalysis || null,
        aiAnalysis: aiAnalysis || null,
        reportsCount: reportsCount || 0,
        fraudScore: score,
        lineType: enhancedAnalysis?.line_type || 'unknown',
        carrier: enhancedAnalysis?.carrier || 'unknown',
        processingTime,
        lastChecked: new Date().toLocaleString()
      },
      flags: score >= 50 ? ['High scam risk detected', 'Multiple fraud indicators'] : ['Number appears legitimate'],
      recommendations: score >= 50 ? 
        ['Do not answer calls from this number', 'Block this number', 'Report as scam'] : 
        ['Number appears safe but remain cautious'],
      insights: aiAnalysis?.explanation || `Scam risk score: ${score}/100`,
      processingTime,
      $push: {
        auditTrail: {
          status: 'completed',
          timestamp: new Date(),
          message: `Analysis completed successfully in ${processingTime}ms`
        }
      }
    });
    
    console.log(`💾 [Scam Worker] Results saved for test ${testId}`);
    
    return {
      success: true,
      testId,
      isScam,
      riskScore: score,
      processingTime
    };
    
  } catch (error) {
    console.error(`❌ [Scam Worker] Job ${job.id} failed:`, error);
    
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
    
    throw error;
  }
});

console.log('🚀 Scam Worker started and listening for jobs...');
