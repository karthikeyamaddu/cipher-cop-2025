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
  const { testId, scamData } = job.data;
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
    
    console.log(`⚙️ [Scam Worker] Analyzing phone scam data`);
    
    // Extract scam data
    const { phoneNumber, phoneNumberHash, providers, enhancedAnalysis, reportsCount, fraudScore, lineType, carrier } = scamData;
    
    // Determine if scam
    const isScam = fraudScore >= 70 || reportsCount > 5;
    const threatLevel = fraudScore >= 70 ? 'high' : fraudScore >= 40 ? 'medium' : 'low';
    
    const processingTime = Date.now() - startTime;
    
    console.log(`✅ [Scam Worker] Analysis complete. Scam: ${isScam}, Fraud Score: ${fraudScore}`);
    
    // Update test result
    await TestResult.findByIdAndUpdate(testId, {
      processingStatus: 'completed',
      completedAt: new Date(),
      result: {
        isScam,
        threatLevel,
        riskScore: fraudScore,
        verdict: isScam ? 'scam' : 'safe'
      },
      details: {
        providers: providers || [],
        enhancedAnalysis: enhancedAnalysis || {},
        reportsCount: reportsCount || 0,
        fraudScore: fraudScore || 0,
        lineType: lineType || 'unknown',
        carrier: carrier || 'unknown',
        processingTime,
        lastChecked: new Date().toLocaleString()
      },
      flags: isScam ? ['Scam number detected', 'Multiple reports'] : ['Number appears safe'],
      recommendations: isScam ? 
        ['Do not answer calls from this number', 'Block this number', 'Report as spam'] : 
        ['Number appears legitimate'],
      insights: `Phone Scam Analysis: ${isScam ? 'Scam detected' : 'Safe number'}`,
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
      fraudScore,
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
