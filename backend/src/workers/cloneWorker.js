import { cloneQueue } from '../queues/index.js';
import { TestResult } from '../models/TestResult.js';
import { User } from '../lib/db.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ciphercop';
mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ Clone Worker: MongoDB connected'))
  .catch(err => console.error('❌ Clone Worker: MongoDB connection failed:', err));

// Process clone detection jobs
cloneQueue.process(async (job) => {
  const { testId, url, analysisType, mlData, aiData, screenshot } = job.data;
  const startTime = Date.now();
  
  console.log(`🔍 [Clone Worker] Processing job ${job.id} for test ${testId}`);
  
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
    
    console.log(`⚙️ [Clone Worker] Analyzing with ${analysisType} mode`);
    
    // Determine if clone detected
    let isClone = false;
    let threatLevel = 'low';
    let riskScore = 0;
    
    if (analysisType === 'combined') {
      const mlThreat = mlData?.result === 'Phishing';
      const aiThreat = aiData?.decision === 'clone';
      isClone = mlThreat || aiThreat;
      threatLevel = isClone ? 'high' : aiData?.decision === 'suspicious' ? 'medium' : 'low';
      riskScore = Math.max(
        mlData?.confidence ? mlData.confidence * 100 : 0,
        aiData?.score || 0
      );
    } else if (analysisType === 'ml') {
      isClone = mlData?.result === 'Phishing';
      threatLevel = isClone ? 'high' : 'low';
      riskScore = mlData?.confidence ? mlData.confidence * 100 : 0;
    } else if (analysisType === 'ai') {
      isClone = aiData?.decision === 'clone';
      threatLevel = aiData?.decision === 'clone' ? 'high' : 
                   aiData?.decision === 'suspicious' ? 'medium' : 'low';
      riskScore = aiData?.score || 0;
    }
    
    const processingTime = Date.now() - startTime;
    
    console.log(`✅ [Clone Worker] Analysis complete. Clone: ${isClone}, Risk: ${riskScore}`);
    
    // Update test result
    await TestResult.findByIdAndUpdate(testId, {
      processingStatus: 'completed',
      completedAt: new Date(),
      result: {
        isClone: isClone,
        threatLevel: threatLevel,
        riskScore: Math.round(riskScore),
        confidence: mlData?.confidence || aiData?.confidence || 0,
        verdict: isClone ? 'clone' : 'legitimate'
      },
      details: {
        mlAnalysis: mlData || null,
        phishpediaResult: mlData || null,
        geminiAnalysis: aiData || null,
        aiAnalysis: aiData || null,
        matchedBrand: mlData?.matched_brand || aiData?.signals?.brand_mismatch?.brand || 'unknown',
        correctDomain: mlData?.correct_domain || 'unknown',
        visualSimilarity: mlData?.confidence || 0,
        detectionTime: mlData?.detection_time || 0,
        processingTime,
        lastChecked: new Date().toLocaleString()
      },
      flags: isClone ? ['Clone website detected', 'Brand impersonation'] : ['Website appears legitimate'],
      recommendations: isClone ? 
        ['Do not enter credentials', 'Verify official domain', 'Report this website'] : 
        ['Website appears safe'],
      insights: `${analysisType.toUpperCase()} Analysis: ${isClone ? 'Clone detected' : 'Legitimate website'}`,
      processingTime,
      $push: {
        auditTrail: {
          status: 'completed',
          timestamp: new Date(),
          message: `Analysis completed successfully in ${processingTime}ms`
        }
      }
    });
    
    console.log(`💾 [Clone Worker] Results saved for test ${testId}`);
    
    return {
      success: true,
      testId,
      isClone,
      riskScore,
      processingTime
    };
    
  } catch (error) {
    console.error(`❌ [Clone Worker] Job ${job.id} failed:`, error);
    
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

console.log('🚀 Clone Worker started and listening for jobs...');
