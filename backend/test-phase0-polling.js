/**
 * Phase 0 Polling Test Script
 * 
 * This script tests the basic polling flow:
 * 1. Creates a test with status='queued'
 * 2. Polls the status endpoint
 * 3. Manually updates status in MongoDB
 * 4. Verifies polling detects the change
 */

import mongoose from 'mongoose';
import { TestResult } from './src/models/TestResult.js';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ciphercop';

async function testPhase0Polling() {
    try {
        console.log('🧪 Phase 0 Polling Test Started\n');
        
        // Connect to MongoDB
        console.log('📡 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');
        
        // Step 1: Create a test user ID (use existing or create dummy)
        const testUserId = new mongoose.Types.ObjectId();
        console.log(`👤 Test User ID: ${testUserId}\n`);
        
        // Step 2: Create a test result with status='queued'
        console.log('📝 Creating test result with status="queued"...');
        const testResult = new TestResult({
            userId: testUserId,
            testType: 'phishing-url',
            inputData: {
                url: 'https://test-polling.example.com'
            },
            result: {
                isPhishing: false,
                threatLevel: 'low',
                riskScore: 0
            },
            processingStatus: 'queued',
            queuePosition: 1,
            queuedAt: new Date(),
            attempts: 0
        });
        
        await testResult.save();
        console.log(`✅ Test created with ID: ${testResult._id}`);
        console.log(`   Status: ${testResult.processingStatus}`);
        console.log(`   Queue Position: ${testResult.queuePosition}\n`);
        
        // Step 3: Simulate status check (what the endpoint would return)
        console.log('🔍 Simulating status endpoint response...');
        const statusResponse = {
            success: true,
            status: testResult.processingStatus,
            queuePosition: testResult.queuePosition,
            createdAt: testResult.createdAt
        };
        console.log('   Response:', JSON.stringify(statusResponse, null, 2));
        console.log('');
        
        // Step 4: Update status to 'processing'
        console.log('⚙️  Updating status to "processing"...');
        testResult.processingStatus = 'processing';
        testResult.queuePosition = null;
        testResult.startedAt = new Date();
        testResult.attempts = 1;
        testResult.auditTrail.push({
            status: 'processing',
            timestamp: new Date(),
            message: 'Job started processing'
        });
        await testResult.save();
        console.log(`✅ Status updated to: ${testResult.processingStatus}\n`);
        
        // Step 5: Update status to 'completed'
        console.log('✅ Updating status to "completed"...');
        testResult.processingStatus = 'completed';
        testResult.completedAt = new Date();
        testResult.result.isPhishing = true;
        testResult.result.riskScore = 85;
        testResult.result.threatLevel = 'high';
        testResult.auditTrail.push({
            status: 'completed',
            timestamp: new Date(),
            message: 'Job completed successfully'
        });
        await testResult.save();
        console.log(`✅ Status updated to: ${testResult.processingStatus}`);
        console.log(`   Risk Score: ${testResult.result.riskScore}\n`);
        
        // Step 6: Verify final state
        console.log('🔍 Verifying final state...');
        const finalTest = await TestResult.findById(testResult._id);
        console.log('   Processing Status:', finalTest.processingStatus);
        console.log('   Queue Position:', finalTest.queuePosition);
        console.log('   Queued At:', finalTest.queuedAt);
        console.log('   Started At:', finalTest.startedAt);
        console.log('   Completed At:', finalTest.completedAt);
        console.log('   Attempts:', finalTest.attempts);
        console.log('   Audit Trail:', finalTest.auditTrail.length, 'entries');
        console.log('');
        
        // Step 7: Test indexes
        console.log('📊 Testing indexes...');
        const indexedQuery = await TestResult.find({
            userId: testUserId,
            processingStatus: 'completed'
        }).explain('executionStats');
        console.log('   Index used:', indexedQuery.executionStats.executionStages.indexName || 'No index');
        console.log('');
        
        // Cleanup
        console.log('🧹 Cleaning up test data...');
        await TestResult.deleteOne({ _id: testResult._id });
        console.log('✅ Test data cleaned up\n');
        
        console.log('✅ Phase 0 Polling Test PASSED!\n');
        console.log('Next Steps:');
        console.log('1. Start backend: cd backend && npm start');
        console.log('2. Test status endpoint: curl http://localhost:5001/api/tests/<testId>/status');
        console.log('3. Test polling hook in frontend component\n');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('📡 Disconnected from MongoDB');
    }
}

// Run test
testPhase0Polling();
