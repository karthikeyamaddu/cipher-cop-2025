import express from "express";
import {signup,login,logout} from "./src/controller/auth.js";
import { connectDB, User } from "./src/lib/db.js";
import cookieParser from "cookie-parser"
import { protectRoute } from "./src/controller/tokengen.js";
import { phishingDetector } from "./src/checks/phishing.js";
import { TestResult } from "./src/models/TestResult.js";
import cors from "cors";
import dotenv from "dotenv";
import multer from 'multer';
import { processScreenshot, validateImage } from './src/lib/imageProcessor.js';
import { uploadToGridFS, getFromGridFS } from './src/lib/gridfs.js';

dotenv.config();
const app = express();

// Configure multer for memory storage
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
});

app.use(
    cors({
        origin: ["http://localhost:5173", "http://localhost:5174"], 
        credentials: true, 
    })
);

app.get("/", (req, res) => {
    res.send("Hello World");
});
const router = express.Router();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.post("/signup", signup);
app.post("/login", login);
app.post("/logout", logout);
app.get('/checkAuth', protectRoute, (req, res) => {
    res.status(200).json({ 
        message: 'User is authenticated', 
        user: {
            _id: req.user._id,
            fullName: req.user.fullName,
            email: req.user.email,
            role: req.user.role,
            emailVerified: req.user.emailVerified,
            accountStatus: req.user.accountStatus,
            createdAt: req.user.createdAt
        }
    });
});

app.get('/calldb', protectRoute, (req, res) => {
    res.status(200).json({ message: 'User is authenticated', user: req.user });
});

// Phishing detection endpoint
app.post('/api/phishing/analyze', protectRoute, async (req, res) => {
    const startTime = Date.now();
    try {
        const { url } = req.body;
        
        if (!url) {
            return res.status(400).json({ 
                error: 'URL is required',
                success: false 
            });
        }

        // Validate URL format - handle both full URLs and domain names
        let isValidInput = false;
        let inputUrl = url.trim();
        
        try {
            // Try parsing as full URL first
            new URL(inputUrl);
            isValidInput = true;
        } catch (urlError) {
            // If that fails, try adding protocol and parsing again
            try {
                new URL('http://' + inputUrl);
                isValidInput = true;
            } catch (protocolError) {
                // Check if it's a valid domain name pattern (more flexible)
                const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-._]*[a-zA-Z0-9]\.[a-zA-Z]{2,}(\/.*)?$/;
                if (domainRegex.test(inputUrl)) {
                    isValidInput = true;
                }
            }
        }
        
        if (!isValidInput) {
            return res.status(400).json({ 
                error: 'Invalid URL or domain format. Please enter a valid URL or domain name.',
                success: false 
            });
        }

        console.log(`Received URL analysis request for: ${inputUrl}`);

        // Perform phishing analysis
        const analysis = await phishingDetector.analyzeUrl(inputUrl);
        const processingTime = Date.now() - startTime;
        
        // Save test result to MongoDB
        const testResult = new TestResult({
            userId: req.user._id,
            testType: 'phishing-url',
            inputData: {
                url: inputUrl
            },
            result: {
                isPhishing: analysis.isPhishing,
                threatLevel: analysis.threatLevel || 'low',
                riskScore: analysis.riskScore,
                combinedRiskScore: analysis.combinedRiskScore || analysis.riskScore
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
                whoisData: analysis.whoisData
            },
            flags: analysis.flags,
            recommendations: analysis.aiRecommendations || [],
            insights: analysis.aiInsights || 'No AI insights available',
            processingTime
        });

        // Debug: Log what we're about to save
        console.log('🔍 DEBUG - About to save:');
        console.log('  aiAnalysis:', analysis.aiAnalysis);
        console.log('  aiRiskScore:', analysis.aiRiskScore);
        console.log('  details.aiAnalysis:', testResult.details.aiAnalysis);

        await testResult.save();
        
        // Add test ID to user's testResults array and increment count
        await User.findByIdAndUpdate(req.user._id, {
            $push: { testResults: testResult._id },
            $inc: { testCount: 1 }
        });
        
        console.log(`✅ Test ${testResult._id} added to user ${req.user._id}`);
        
        // Format response for frontend
        const response = {
            success: true,
            data: {
                url: analysis.url,
                domain: analysis.domain,
                isPhishing: analysis.isPhishing,
                threatLevel: analysis.threatLevel || 'low',
                riskScore: analysis.riskScore,
                combinedRiskScore: analysis.combinedRiskScore || analysis.riskScore,
                flags: analysis.flags,
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
                    lastChecked: analysis.details.lastChecked
                },
                aiAnalysis: {
                    enabled: analysis.aiAnalysis !== null,
                    analysis: analysis.aiAnalysis,
                    riskScore: analysis.aiRiskScore,
                    recommendations: analysis.aiRecommendations || [],
                    insights: analysis.aiInsights || 'No AI insights available'
                },
                whoisData: analysis.whoisData
            }
        };

        res.status(200).json(response);
        
    } catch (error) {
        console.error('Phishing analysis error:', error);
        res.status(500).json({ 
            error: 'Analysis failed: ' + error.message,
            success: false 
        });
    }
});

// ==================== EMAIL PHISHING STORAGE ====================
app.post('/api/phishing/analyze-email-store', protectRoute, async (req, res) => {
    const startTime = Date.now();
    try {
        const { emailData, mlResult } = req.body;
        
        if (!emailData || !mlResult) {
            return res.status(400).json({ 
                error: 'Email data and ML result are required',
                success: false 
            });
        }

        console.log(`✅ Storing email phishing test for user: ${req.user._id}`);
        
        const testResult = new TestResult({
            userId: req.user._id,
            testType: 'phishing-email',
            inputData: {
                emailSubject: emailData.subject || '',
                senderEmail: emailData.senderEmail || '',
                senderDomain: emailData.senderDomain || '',
                replyTo: emailData.replyTo || '',
                hasAttachment: emailData.hasAttachment || false,
                urgentKeywords: emailData.urgentKeywords || false
            },
            result: {
                isPhishing: mlResult.prediction === 'phishing',
                threatLevel: mlResult.prediction === 'phishing' ? 'high' : 
                            mlResult.probability > 0.3 ? 'medium' : 'low',
                riskScore: Math.round(mlResult.probability * 100),
                confidence: mlResult.confidence,
                verdict: mlResult.prediction
            },
            details: {
                mlPrediction: mlResult,
                suspiciousKeywords: mlResult.features_used?.urgent_keywords || 0,
                linkCount: mlResult.features_used?.links_count || 0,
                linkDensity: mlResult.features_used?.link_density || 0,
                htmlTags: mlResult.features_used?.html_tags || 0,
                specialChars: mlResult.features_used?.special_chars || 0,
                processingTime: Date.now() - startTime,
                lastChecked: new Date().toLocaleString()
            },
            flags: mlResult.prediction === 'phishing' ? 
                ['ML Detection: Phishing content detected'] : 
                mlResult.probability > 0.3 ? ['ML Detection: Suspicious patterns found'] : 
                ['ML Detection: Content appears legitimate'],
            recommendations: mlResult.prediction === 'phishing' ? 
                ['Do not click any links', 'Do not reply to this email', 'Report as spam'] : 
                ['Email appears safe but remain cautious'],
            insights: `ML Analysis: ${mlResult.prediction} with ${Math.round(mlResult.confidence * 100)}% confidence`,
            processingTime: Date.now() - startTime,
            ipAddress: req.ip,
            userAgent: req.get('user-agent')
        });
        
        await testResult.save();
        
        // Add test ID to user's testResults array and increment count
        await User.findByIdAndUpdate(req.user._id, {
            $push: { testResults: testResult._id },
            $inc: { testCount: 1 }
        });
        
        console.log(`✅ Test ${testResult._id} added to user ${req.user._id}`);
        
        res.status(200).json({
            success: true,
            data: {
                testId: testResult._id,
                message: 'Email phishing test stored successfully'
            }
        });
        
    } catch (error) {
        console.error('❌ Email phishing storage error:', error);
        res.status(500).json({ 
            error: 'Failed to store email test: ' + error.message,
            success: false 
        });
    }
});

// ==================== CLONE DETECTION STORAGE ====================
// ==================== IMAGE UPLOAD ENDPOINT (PARALLEL) ====================
app.post('/api/images/upload', protectRoute, upload.single('screenshot'), async (req, res) => {
    try {
        console.log('📤 Image upload started (parallel processing)');
        
        if (!req.file) {
            return res.status(400).json({ 
                success: false, 
                error: 'No image file provided' 
            });
        }
        
        console.log(`📷 Processing uploaded image: ${req.file.originalname}`);
        
        // Validate image
        await validateImage(req.file.buffer, req.file.mimetype, req.file.size);
        
        // Process screenshot (compress and create thumbnail)
        const processed = await processScreenshot(req.file.buffer, req.file.originalname);
        
        // Upload full image to GridFS
        const fullImageId = await uploadToGridFS(
            processed.full.buffer, 
            `full_${req.file.originalname}.webp`,
            {
                userId: req.user._id,
                type: 'full',
                originalName: req.file.originalname
            }
        );
        
        // Upload thumbnail to GridFS
        const thumbnailId = await uploadToGridFS(
            processed.thumbnail.buffer, 
            `thumb_${req.file.originalname}.webp`,
            {
                userId: req.user._id,
                type: 'thumbnail',
                originalName: req.file.originalname
            }
        );
        
        console.log(`✅ Images uploaded to GridFS (parallel):`);
        console.log(`  Full image ID: ${fullImageId}`);
        console.log(`  Thumbnail ID: ${thumbnailId}`);
        console.log(`  Original: ${processed.originalSize} bytes`);
        console.log(`  Compressed: ${processed.full.size + processed.thumbnail.size} bytes`);
        
        res.status(200).json({
            success: true,
            data: {
                fullImageId: fullImageId,
                thumbnailId: thumbnailId,
                screenshotName: req.file.originalname,
                imageFormat: 'webp',
                originalSize: processed.originalSize,
                compressedSize: processed.full.size + processed.thumbnail.size
            }
        });
        
    } catch (error) {
        console.error('❌ Image upload failed:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message || 'Failed to upload image'
        });
    }
});

// ==================== CLONE DETECTION STORAGE ====================
app.post('/api/clone/store', protectRoute, async (req, res) => {
    const startTime = Date.now();
    try {
        const { url, analysisType, mlData, aiData, screenshot } = req.body;
        
        if (!analysisType) {
            return res.status(400).json({ 
                error: 'Analysis type is required',
                success: false 
            });
        }

        console.log(`✅ Storing clone detection test (${analysisType}) for user: ${req.user._id}`);
        
        // Determine test type
        let testType = 'clone-combined';
        if (analysisType === 'ml') testType = 'clone-ml';
        if (analysisType === 'ai') testType = 'clone-ai';
        
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
        
        const testResult = new TestResult({
            userId: req.user._id,
            testType: testType,
            inputData: {
                url: url || '',
                screenshotName: screenshot?.name || ''
            },
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
                processingTime: Date.now() - startTime,
                lastChecked: new Date().toLocaleString()
            },
            flags: isClone ? ['Clone website detected', 'Brand impersonation'] : ['Website appears legitimate'],
            recommendations: isClone ? 
                ['Do not enter credentials', 'Verify official domain', 'Report this website'] : 
                ['Website appears safe'],
            insights: `${analysisType.toUpperCase()} Analysis: ${isClone ? 'Clone detected' : 'Legitimate website'}`,
            processingTime: Date.now() - startTime,
            ipAddress: req.ip,
            userAgent: req.get('user-agent')
        });
        
        await testResult.save();
        
        // Add test ID to user's testResults array and increment count
        await User.findByIdAndUpdate(req.user._id, {
            $push: { testResults: testResult._id },
            $inc: { testCount: 1 }
        });
        
        console.log(`✅ Test ${testResult._id} added to user ${req.user._id}`);
        
        res.status(200).json({
            success: true,
            data: {
                testId: testResult._id,
                message: 'Clone detection test stored successfully'
            }
        });
        
    } catch (error) {
        console.error('❌ Clone detection storage error:', error);
        res.status(500).json({ 
            error: 'Failed to store clone test: ' + error.message,
            success: false 
        });
    }
});

// ==================== CLONE DETECTION WITH IMAGE STORAGE ====================
app.post('/api/clone/store-with-image', protectRoute, upload.single('screenshot'), async (req, res) => {
    const startTime = Date.now();
    try {
        console.log('📸 Clone detection with image upload started');
        
        // Parse analysis data from form
        const analysisData = JSON.parse(req.body.analysisData || '{}');
        const { aiData, mlData, url } = analysisData;
        
        let fullImageId = null;
        let thumbnailId = null;
        let originalSize = 0;
        let compressedSize = 0;
        let screenshotName = null;
        
        // Process image if uploaded
        if (req.file) {
            console.log(`📷 Processing uploaded image: ${req.file.originalname}`);
            
            // Validate image
            await validateImage(req.file.buffer, req.file.mimetype, req.file.size);
            
            // Process screenshot (compress and create thumbnail)
            const processed = await processScreenshot(req.file.buffer, req.file.originalname);
            
            // Upload full image to GridFS
            fullImageId = await uploadToGridFS(
                processed.full.buffer, 
                `full_${req.file.originalname}.webp`,
                {
                    userId: req.user._id,
                    type: 'full',
                    originalName: req.file.originalname
                }
            );
            
            // Upload thumbnail to GridFS
            thumbnailId = await uploadToGridFS(
                processed.thumbnail.buffer, 
                `thumb_${req.file.originalname}.webp`,
                {
                    userId: req.user._id,
                    type: 'thumbnail',
                    originalName: req.file.originalname
                }
            );
            
            originalSize = processed.originalSize;
            compressedSize = processed.full.size + processed.thumbnail.size;
            screenshotName = req.file.originalname;
            
            console.log(`✅ Images uploaded to GridFS:`);
            console.log(`  Full image ID: ${fullImageId}`);
            console.log(`  Thumbnail ID: ${thumbnailId}`);
        }
        
        // Determine test type based on analysis data
        let testType = 'clone-combined'; // Default
        if (aiData && !mlData) testType = 'clone-ai';
        else if (mlData && !aiData) testType = 'clone-ml';
        
        // Determine overall result
        const aiIsClone = aiData?.decision === 'clone' || aiData?.isClone;
        const mlIsClone = mlData?.result === 'Phishing' || mlData?.isClone;
        const isClone = aiIsClone || mlIsClone;
        
        // Calculate risk score (prioritize AI if available)
        const aiRiskScore = aiData?.score || aiData?.riskScore || 0;
        const mlRiskScore = mlData?.confidence ? mlData.confidence * 100 : 0;
        const riskScore = aiRiskScore || mlRiskScore || 0;
        
        // Determine threat level
        let threatLevel = 'low';
        if (riskScore >= 70) threatLevel = 'high';
        else if (riskScore >= 40) threatLevel = 'medium';
        
        // Create test result
        const testResult = new TestResult({
            userId: req.user._id,
            testType: testType,
            inputData: {
                url: url,
                screenshotName: screenshotName,
                fullImageId: fullImageId,
                thumbnailId: thumbnailId,
                imageFormat: 'webp',
                originalSize: originalSize,
                compressedSize: compressedSize
            },
            result: {
                isClone: isClone,
                threatLevel: threatLevel,
                riskScore: riskScore,
                confidence: Math.max(aiData?.confidence || 0, mlData?.confidence || 0)
            },
            details: {
                // AI Analysis (Gemini)
                aiAnalysis: aiData ? {
                    decision: aiData.decision,
                    score: aiData.score || aiData.riskScore,
                    detectedBrand: aiData.detectedBrand,
                    signals: aiData.signals,
                    recommendations: aiData.recommendations,
                    confidence: aiData.confidence
                } : null,
                
                // ML Analysis (Phishpedia)
                mlAnalysis: mlData ? {
                    result: mlData.result,
                    matchedBrand: mlData.matched_brand,
                    confidence: mlData.confidence,
                    legitimateDomain: mlData.legitimate_domain,
                    detectionTime: mlData.detection_time,
                    phishpediaResult: mlData
                } : null,
                
                processingTime: Date.now() - startTime,
                lastChecked: new Date().toISOString()
            },
            flags: [],
            recommendations: aiData?.recommendations || [],
            insights: aiData?.insights || mlData?.insights || 'Clone detection analysis completed.',
            status: 'completed',
            processingTime: Date.now() - startTime
        });
        
        // Save to database
        await testResult.save();
        
        // Update user test count
        await User.findByIdAndUpdate(req.user._id, {
            $push: { testResults: testResult._id },
            $inc: { testCount: 1 }
        });
        
        console.log(`✅ Clone detection with image saved: ${testResult._id}`);
        
        res.status(200).json({
            success: true,
            data: {
                testId: testResult._id,
                testType: testType,
                isClone: isClone,
                riskScore: riskScore,
                threatLevel: threatLevel,
                fullImageId: fullImageId,
                thumbnailId: thumbnailId,
                originalSize: originalSize,
                compressedSize: compressedSize,
                processingTime: Date.now() - startTime
            }
        });
        
    } catch (error) {
        console.error('❌ Clone detection with image failed:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message || 'Failed to save clone detection result with image'
        });
    }
});

// ==================== CLONE DETECTION WITH IMAGE IDS (PARALLEL) ====================
app.post('/api/clone/store-with-image-id', protectRoute, async (req, res) => {
    const startTime = Date.now();
    try {
        console.log('💾 Saving clone detection with pre-uploaded images');
        
        const { aiData, mlData, url, imageData } = req.body;
        
        // Extract image data
        const fullImageId = imageData?.fullImageId;
        const thumbnailId = imageData?.thumbnailId;
        const screenshotName = imageData?.screenshotName;
        const originalSize = imageData?.originalSize;
        const compressedSize = imageData?.compressedSize;
        
        // Determine test type based on analysis data
        let testType = 'clone-combined'; // Default
        if (aiData && !mlData) testType = 'clone-ai';
        else if (mlData && !aiData) testType = 'clone-ml';
        
        // Determine overall result
        const aiIsClone = aiData?.decision === 'clone' || aiData?.isClone;
        const mlIsClone = mlData?.result === 'Phishing' || mlData?.isClone;
        const isClone = aiIsClone || mlIsClone;
        
        // Calculate risk score (prioritize AI if available)
        const aiRiskScore = aiData?.score || aiData?.riskScore || 0;
        const mlRiskScore = mlData?.confidence ? mlData.confidence * 100 : 0;
        const riskScore = aiRiskScore || mlRiskScore || 0;
        
        // Determine threat level
        let threatLevel = 'low';
        if (riskScore >= 70) threatLevel = 'high';
        else if (riskScore >= 40) threatLevel = 'medium';
        
        // Create test result
        const testResult = new TestResult({
            userId: req.user._id,
            testType: testType,
            inputData: {
                url: url,
                screenshotName: screenshotName,
                fullImageId: fullImageId,
                thumbnailId: thumbnailId,
                imageFormat: 'webp',
                originalSize: originalSize,
                compressedSize: compressedSize
            },
            result: {
                isClone: isClone,
                threatLevel: threatLevel,
                riskScore: riskScore,
                confidence: Math.max(aiData?.confidence || 0, mlData?.confidence || 0)
            },
            details: {
                // AI Analysis (Gemini)
                aiAnalysis: aiData ? {
                    decision: aiData.decision,
                    score: aiData.score || aiData.riskScore,
                    detectedBrand: aiData.detectedBrand,
                    signals: aiData.signals,
                    recommendations: aiData.recommendations,
                    confidence: aiData.confidence
                } : null,
                
                // ML Analysis (Phishpedia)
                mlAnalysis: mlData ? {
                    result: mlData.result,
                    matchedBrand: mlData.matched_brand,
                    confidence: mlData.confidence,
                    legitimateDomain: mlData.legitimate_domain,
                    detectionTime: mlData.detection_time,
                    phishpediaResult: mlData
                } : null,
                
                processingTime: Date.now() - startTime,
                lastChecked: new Date().toISOString()
            },
            flags: [],
            recommendations: aiData?.recommendations || [],
            insights: aiData?.insights || mlData?.insights || 'Clone detection analysis completed.',
            
            // Tags for filtering and analytics
            tags: {
                analysisType: testType === 'clone-ai' ? 'ai' : testType === 'clone-ml' ? 'ml' : 'combined',
                inputType: (url && screenshotName) ? 'both' : screenshotName ? 'screenshot-only' : 'url-only'
            },
            
            status: 'completed',
            processingTime: Date.now() - startTime
        });
        
        // Save to database
        await testResult.save();
        
        // Update user test count
        await User.findByIdAndUpdate(req.user._id, {
            $push: { testResults: testResult._id },
            $inc: { testCount: 1 }
        });
        
        console.log(`✅ Clone detection saved with image IDs: ${testResult._id}`);
        console.log(`🏷️ Tags: ${testResult.tags.analysisType} | ${testResult.tags.inputType}`);
        
        res.status(200).json({
            success: true,
            data: {
                testId: testResult._id,
                testType: testType,
                isClone: isClone,
                riskScore: riskScore,
                threatLevel: threatLevel,
                tags: testResult.tags,
                processingTime: Date.now() - startTime
            }
        });
        
    } catch (error) {
        console.error('❌ Clone detection save failed:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message || 'Failed to save clone detection result'
        });
    }
});

// ==================== IMAGE RETRIEVAL ENDPOINTS ====================

// Get full image from GridFS
app.get('/api/images/full/:fileId', protectRoute, async (req, res) => {
    try {
        const { fileId } = req.params;
        
        console.log(`📥 Retrieving full image: ${fileId}`);
        
        // Get file stream from GridFS
        const downloadStream = await getFromGridFS(fileId);
        
        // Set headers
        res.set({
            'Content-Type': 'image/webp',
            'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
            'Access-Control-Allow-Origin': 'http://localhost:5173',
            'Access-Control-Allow-Credentials': 'true'
        });
        
        // Handle stream errors
        downloadStream.on('error', (error) => {
            console.error(`❌ Error streaming full image ${fileId}:`, error);
            if (!res.headersSent) {
                res.status(404).json({ success: false, error: 'Image not found' });
            }
        });
        
        // Pipe stream to response
        downloadStream.pipe(res);
        
    } catch (error) {
        console.error(`❌ Failed to retrieve full image ${req.params.fileId}:`, error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to retrieve image' 
        });
    }
});

// Get thumbnail from GridFS
app.get('/api/images/thumbnail/:fileId', protectRoute, async (req, res) => {
    try {
        const { fileId } = req.params;
        
        console.log(`📥 Retrieving thumbnail: ${fileId}`);
        
        // Get file stream from GridFS
        const downloadStream = await getFromGridFS(fileId);
        
        // Set headers
        res.set({
            'Content-Type': 'image/webp',
            'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
            'Access-Control-Allow-Origin': 'http://localhost:5173',
            'Access-Control-Allow-Credentials': 'true'
        });
        
        // Handle stream errors
        downloadStream.on('error', (error) => {
            console.error(`❌ Error streaming thumbnail ${fileId}:`, error);
            if (!res.headersSent) {
                res.status(404).json({ success: false, error: 'Thumbnail not found' });
            }
        });
        
        // Pipe stream to response
        downloadStream.pipe(res);
        
    } catch (error) {
        console.error(`❌ Failed to retrieve thumbnail ${req.params.fileId}:`, error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to retrieve thumbnail' 
        });
    }
});

// ==================== SCAM PHONE DETECTION STORAGE ====================
app.post('/api/scam/store', protectRoute, async (req, res) => {
    const startTime = Date.now();
    try {
        const { phoneNumber, score, verdict, providers, enhancedAnalysis, aiAnalysis, reportsCount } = req.body;
        
        if (!phoneNumber || score === undefined) {
            return res.status(400).json({ 
                error: 'Phone number and score are required',
                success: false 
            });
        }

        console.log(`✅ Storing scam detection test for user: ${req.user._id}`);
        
        // Hash phone number for privacy
        const crypto = await import('crypto');
        const phoneHash = crypto.createHash('sha256').update(phoneNumber).digest('hex');
        
        const testResult = new TestResult({
            userId: req.user._id,
            testType: 'scam-phone',
            inputData: {
                phoneNumberHash: phoneHash
            },
            result: {
                isScam: score >= 50,
                threatLevel: score >= 80 ? 'high' : score >= 50 ? 'medium' : 'low',
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
                processingTime: Date.now() - startTime,
                lastChecked: new Date().toLocaleString()
            },
            flags: score >= 50 ? ['High scam risk detected', 'Multiple fraud indicators'] : ['Number appears legitimate'],
            recommendations: score >= 50 ? 
                ['Do not answer calls from this number', 'Block this number', 'Report as scam'] : 
                ['Number appears safe but remain cautious'],
            insights: aiAnalysis?.explanation || `Scam risk score: ${score}/100`,
            processingTime: Date.now() - startTime,
            ipAddress: req.ip,
            userAgent: req.get('user-agent')
        });
        
        await testResult.save();
        
        // Add test ID to user's testResults array and increment count
        await User.findByIdAndUpdate(req.user._id, {
            $push: { testResults: testResult._id },
            $inc: { testCount: 1 }
        });
        
        console.log(`✅ Test ${testResult._id} added to user ${req.user._id}`);
        
        res.status(200).json({
            success: true,
            data: {
                testId: testResult._id,
                message: 'Scam detection test stored successfully'
            }
        });
        
    } catch (error) {
        console.error('❌ Scam detection storage error:', error);
        res.status(500).json({ 
            error: 'Failed to store scam test: ' + error.message,
            success: false 
        });
    }
});

// ==================== MALWARE VIRUSTOTAL STORAGE ====================
app.post('/api/malware/store', protectRoute, async (req, res) => {
    const startTime = Date.now();
    try {
        const { fileName, testType, result } = req.body;
        
        if (!fileName || !testType || !result) {
            return res.status(400).json({ 
                error: 'fileName, testType, and result are required',
                success: false 
            });
        }

        console.log(`Storing ${testType} test result for file: ${fileName}`);
        
        // Save test result to MongoDB
        const testResult = new TestResult({
            userId: req.user._id,
            testType: testType, // 'sandbox' or 'malware'
            inputData: {
                fileName: fileName
            },
            result: {
                isMalware: result.positives > 0 || result.verdict === 'malicious',
                threatLevel: result.verdict || (result.positives > 10 ? 'high' : result.positives > 0 ? 'medium' : 'low'),
                riskScore: result.threatScore || (result.positives / (result.total || 1)) * 100,
            },
            details: {
                processingTime: Date.now() - startTime,
                fileName: fileName,
                scanDate: result.scanDate || new Date().toISOString().split('T')[0],
                detections: result.detections || [],
                analysisType: testType,
                sandboxData: result.sandboxData || null,
                positives: result.positives || 0,
                total: result.total || 1,
                verdict: result.verdict || 'unknown'
            }
        });
        
        await testResult.save();
        
        // Add test ID to user's testResults array and increment count
        await User.findByIdAndUpdate(req.user._id, {
            $push: { testResults: testResult._id },
            $inc: { testCount: 1 }
        });
        
        console.log(`✅ Test ${testResult._id} added to user ${req.user._id}`);
        
        res.status(200).json({
            success: true,
            data: {
                testId: testResult._id,
                message: `${testType} test result stored successfully`
            }
        });
        
    } catch (error) {
        console.error('Malware test storage error:', error);
        res.status(500).json({ 
            error: 'Failed to store malware test result: ' + error.message,
            success: false 
        });
    }
});




// Get user's test history
app.get('/api/tests/history', protectRoute, async (req, res) => {
    try {
        const { page = 1, limit = 10, testType } = req.query;
        
        const query = { userId: req.user._id };
        
        // Filter by test type using regex to match prefixes
        if (testType) {
            // Use regex to match test types that start with the given prefix
            // e.g., 'phishing' matches 'phishing-url' and 'phishing-email'
            query.testType = { $regex: new RegExp(`^${testType}`) };
        }
        
        let tests = await TestResult.find(query)
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);
        
        // Convert to plain objects
        tests = tests.map(test => test.toObject());
        
        const total = await TestResult.countDocuments(query);
        
        res.status(200).json({
            success: true,
            data: tests,  // Return tests array directly for frontend compatibility
            pagination: {
                current: page,
                total: Math.ceil(total / limit),
                count: tests.length,
                totalTests: total
            }
        });
        
    } catch (error) {
        console.error('Test history error:', error);
        res.status(500).json({ 
            error: 'Failed to fetch test history',
            success: false 
        });
    }
});

// Get detailed test result
// Get user statistics
app.get('/api/tests/stats', protectRoute, async (req, res) => {
    try {
        console.log('Stats endpoint called for user:', req.user._id);
        
        const stats = await TestResult.aggregate([
            { $match: { userId: req.user._id } },
            {
                $group: {
                    _id: '$testType',
                    count: { $sum: 1 },
                    threatsFound: {
                        $sum: {
                            $cond: [
                                {
                                    $or: [
                                        { $eq: ['$result.isPhishing', true] },
                                        { $eq: ['$result.isMalware', true] },
                                        { $eq: ['$result.isClone', true] },
                                        { $eq: ['$result.isScam', true] }
                                    ]
                                },
                                1,
                                0
                            ]
                        }
                    },
                    avgRiskScore: { $avg: '$result.riskScore' },
                    lastTest: { $max: '$createdAt' }
                }
            }
        ]);
        
        console.log('Aggregation result:', stats);
        
        const totalTests = await TestResult.countDocuments({ userId: req.user._id });
        console.log('Total tests:', totalTests);
        
        const summary = {
            totalThreats: stats.reduce((sum, stat) => sum + stat.threatsFound, 0),
            avgRiskScore: stats.length > 0 
                ? stats.reduce((sum, stat) => sum + (stat.avgRiskScore || 0), 0) / stats.length 
                : 0
        };
        
        res.status(200).json({
            success: true,
            data: {
                totalTests,
                byType: stats,
                summary
            }
        });
        
    } catch (error) {
        console.error('Test stats error:', error);
        res.status(500).json({ 
            error: 'Failed to fetch test statistics: ' + error.message,
            success: false 
        });
    }
});

app.get('/api/tests/:id', protectRoute, async (req, res) => {
    try {
        const test = await TestResult.findOne({ 
            _id: req.params.id, 
            userId: req.user._id 
        });
        
        if (!test) {
            return res.status(404).json({ 
                error: 'Test not found',
                success: false 
            });
        }
        
        res.status(200).json({
            success: true,
            data: test
        });
        
    } catch (error) {
        console.error('Test detail error:', error);
        res.status(500).json({ 
            error: 'Failed to fetch test details',
            success: false 
        });
    }
});

// Email content analysis endpoint
app.post('/api/phishing/analyze-email', protectRoute, async (req, res) => {
    try {
        const { content } = req.body;
        
        if (!content) {
            return res.status(400).json({ 
                error: 'Email content is required',
                success: false 
            });
        }

        // Simple email analysis (can be enhanced)
        const analysis = analyzeEmailContent(content);
        
        res.status(200).json({
            success: true,
            data: analysis
        });
        
    } catch (error) {
        console.error('Email analysis error:', error);
        res.status(500).json({ 
            error: 'Email analysis failed: ' + error.message,
            success: false 
        });
    }
});

// Simple email content analysis function
function analyzeEmailContent(content) {
    const suspiciousKeywords = [
        'urgent', 'verify', 'suspend', 'confirm', 'click here',
        'act now', 'limited time', 'expire', 'account locked',
        'security alert', 'update payment', 'congratulations'
    ];
    
    const phishingIndicators = [
        'bit.ly', 'tinyurl', 'suspicious-bank', 'paypal-security',
        'amazon-verify', 'microsoft-update', 'apple-id'
    ];
    
    let suspiciousScore = 0;
    const flags = [];
    const contentLower = content.toLowerCase();
    
    // Check for suspicious keywords
    suspiciousKeywords.forEach(keyword => {
        if (contentLower.includes(keyword)) {
            flags.push(`Suspicious keyword: ${keyword}`);
            suspiciousScore += 10;
        }
    });
    
    // Check for phishing indicators
    phishingIndicators.forEach(indicator => {
        if (contentLower.includes(indicator)) {
            flags.push(`Phishing indicator: ${indicator}`);
            suspiciousScore += 20;
        }
    });
    
    // Check for suspicious links count
    const linkCount = (content.match(/https?:\/\/[^\s]+/g) || []).length;
    if (linkCount > 3) {
        flags.push(`Multiple links detected: ${linkCount}`);
        suspiciousScore += 15;
    }
    
    // Determine threat level
    let threatLevel = 'safe';
    if (suspiciousScore >= 50) {
        threatLevel = 'high';
    } else if (suspiciousScore >= 25) {
        threatLevel = 'medium';
    }
    
    return {
        threatLevel,
        riskScore: Math.min(suspiciousScore, 100),
        flags,
        details: {
            suspiciousKeywords: flags.filter(f => f.includes('keyword')).length,
            phishingIndicators: flags.filter(f => f.includes('indicator')).length,
            linkCount,
            contentLength: content.length,
            lastChecked: new Date().toISOString()
        }
    };
}

// Malware test result storage endpoint
app.post('/api/malware/store', protectRoute, async (req, res) => {
    const startTime = Date.now();
    try {
        console.log('=== MALWARE STORAGE ENDPOINT ===');
        console.log('Request body:', JSON.stringify(req.body, null, 2));
        console.log('User from token:', req.user ? req.user._id : 'No user');
        
        const { fileName, testType, result } = req.body;
        
        console.log('Extracted values:');
        console.log('fileName:', fileName);
        console.log('testType:', testType);
        console.log('result:', result);
        
        if (!fileName || !testType || !result) {
            console.log('❌ Missing required fields');
            return res.status(400).json({ 
                error: 'fileName, testType, and result are required',
                success: false 
            });
        }

        console.log(`✅ Storing ${testType} malware test result for file: ${fileName}`);
        
        console.log('Creating TestResult document...');
        // Save test result to MongoDB
        const testResult = new TestResult({
            userId: req.user._id,
            testType: testType, // 'malware' or 'sandbox'
            inputData: {
                fileName: fileName
            },
            result: {
                isMalware: result.positives > 0 || result.verdict === 'malicious',
                threatLevel: result.verdict || (result.positives > 10 ? 'high' : result.positives > 0 ? 'medium' : 'low'),
                riskScore: result.threatScore || (result.positives / (result.total || 1)) * 100,
                positives: result.positives || 0,
                total: result.total || 1,
                verdict: result.verdict || 'unknown',
                sandboxData: result.sandboxData || null
            },
            details: {
                processingTime: Date.now() - startTime,
                fileName: fileName,
                scanDate: result.scanDate || new Date().toISOString().split('T')[0],
                detections: result.detections || [],
                analysisType: testType
            }
        });
        
        console.log('Saving to MongoDB...');
        await testResult.save();
        console.log('✅ Successfully saved to MongoDB');
        
        res.status(200).json({
            success: true,
            data: {
                testId: testResult._id,
                message: `${testType} test result stored successfully`
            }
        });
        
    } catch (error) {
        console.error('❌ Malware test storage error:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({ 
            error: 'Failed to store malware test result: ' + error.message,
            success: false 
        });
    }
});

// User profile update endpoint
app.put('/api/user/update', protectRoute, async (req, res) => {
    try {
        const { fullName, email, phone } = req.body;
        const userId = req.user._id;
        
        console.log('Updating user profile for:', userId);
        
        // Validate required fields
        if (!fullName || !email) {
            return res.status(400).json({
                error: 'Full name and email are required',
                success: false
            });
        }
        
        // Check if email is already taken by another user
        if (email !== req.user.email) {
            const existingUser = await User.findOne({ email, _id: { $ne: userId } });
            if (existingUser) {
                return res.status(400).json({
                    error: 'Email is already in use by another account',
                    success: false
                });
            }
        }

        // Validate phone if provided
        if (phone) {
            const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
            const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
            if (!phoneRegex.test(cleanPhone)) {
                return res.status(400).json({
                    error: 'Please enter a valid phone number',
                    success: false
                });
            }
        }
        
        // Update user
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { fullName, email, phone: phone || '' },
            { new: true, runValidators: true }
        ).select('-password');
        
        if (!updatedUser) {
            return res.status(404).json({
                error: 'User not found',
                success: false
            });
        }
        
        res.status(200).json({
            success: true,
            data: {
                _id: updatedUser._id,
                fullName: updatedUser.fullName,
                email: updatedUser.email,
                message: 'Profile updated successfully'
            }
        });
        
    } catch (error) {
        console.error('User update error:', error);
        res.status(500).json({
            error: 'Failed to update profile: ' + error.message,
            success: false
        });
    }
});

// Password change endpoint
app.put('/api/user/change-password', protectRoute, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user._id;
        
        console.log('Changing password for user:', userId);
        
        // Validate required fields
        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                error: 'Current password and new password are required',
                success: false
            });
        }
        
        // Validate new password strength
        if (newPassword.length < 6) {
            return res.status(400).json({
                error: 'New password must be at least 6 characters long',
                success: false
            });
        }
        
        // Get user with password
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                error: 'User not found',
                success: false
            });
        }
        
        // Verify current password
        const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
        if (!isCurrentPasswordValid) {
            return res.status(400).json({
                error: 'Current password is incorrect',
                success: false
            });
        }
        
        // Hash new password
        const saltRounds = 10;
        const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);
        
        // Update password
        await User.findByIdAndUpdate(userId, { password: hashedNewPassword });
        
        res.status(200).json({
            success: true,
            message: 'Password changed successfully'
        });
        
    } catch (error) {
        console.error('Password change error:', error);
        res.status(500).json({
            error: 'Failed to change password: ' + error.message,
            success: false
        });
    }
});

// Get user profile endpoint
app.get('/api/user/profile', protectRoute, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password');
        
        if (!user) {
            return res.status(404).json({
                error: 'User not found',
                success: false
            });
        }
        
        res.status(200).json({
            success: true,
            data: {
                _id: user._id,
                fullName: user.fullName,
                email: user.email,
                phone: user.phone,
                role: user.role,
                accountStatus: user.accountStatus,
                emailVerified: user.emailVerified,
                lastLogin: user.lastLogin,
                loginCount: user.loginCount,
                testCount: user.testCount || 0,
                totalTests: user.testResults?.length || 0,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt
            }
        });
        
    } catch (error) {
        console.error('Profile fetch error:', error);
        res.status(500).json({
            error: 'Failed to fetch profile: ' + error.message,
            success: false
        });
    }
});

// Get ALL user's activities (all test results)
app.get('/api/user/activities', protectRoute, async (req, res) => {
    try {
        const { limit = 20, page = 1 } = req.query;
        
        // Fetch ALL tests for this user (no filtering by type)
        const tests = await TestResult.find({ userId: req.user._id })
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit))
            .select('testType inputData result createdAt');
        
        // Get total count for pagination
        const totalCount = await TestResult.countDocuments({ userId: req.user._id });
        
        res.status(200).json({
            success: true,
            data: tests,
            pagination: {
                total: totalCount,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(totalCount / parseInt(limit))
            }
        });
        
    } catch (error) {
        console.error('Activities fetch error:', error);
        res.status(500).json({
            error: 'Failed to fetch activities: ' + error.message,
            success: false
        });
    }
});

// Get user's test history with filtering (for feature pages)
app.get('/api/tests/history', protectRoute, async (req, res) => {
    try {
        const { testType, limit = 10 } = req.query;
        
        // Build query
        const query = { userId: req.user._id };
        
        // Filter by test type if provided (supports regex for multiple types)
        if (testType) {
            query.testType = { $regex: new RegExp(`^${testType}`) };
        }
        
        // Fetch tests sorted by most recent
        let tests = await TestResult.find(query)
            .sort({ createdAt: -1 })
            .limit(parseInt(limit));
        
        // Convert to plain objects
        tests = tests.map(test => test.toObject());
        
        // Debug: Log what we're returning
        if (tests.length > 0) {
            console.log('🔍 DEBUG - Returning test history:');
            console.log('  First test has details?', !!tests[0].details);
            console.log('  First test details.aiAnalysis?', tests[0].details?.aiAnalysis);
            console.log('  First test FULL OBJECT:', JSON.stringify(tests[0], null, 2));
        }
        
        res.status(200).json({
            success: true,
            data: tests
        });
        
    } catch (error) {
        console.error('Test history fetch error:', error);
        res.status(500).json({
            error: 'Failed to fetch test history: ' + error.message,
            success: false
        });
    }
});

// Mark test as viewed by user
app.put('/api/tests/:testId/mark-viewed', protectRoute, async (req, res) => {
    try {
        const { testId } = req.params;
        
        // Update test result
        const testResult = await TestResult.findOneAndUpdate(
            { _id: testId, userId: req.user._id },
            { 
                viewedByUser: true,
                viewedAt: new Date()
            },
            { new: true }
        );
        
        if (!testResult) {
            return res.status(404).json({
                success: false,
                error: 'Test not found'
            });
        }
        
        res.status(200).json({
            success: true,
            message: 'Test marked as viewed'
        });
        
    } catch (error) {
        console.error('Mark viewed error:', error);
        res.status(500).json({
            error: 'Failed to mark test as viewed: ' + error.message,
            success: false
        });
    }
});

// Get dashboard statistics
app.get('/api/dashboard/stats', protectRoute, async (req, res) => {
    try {
        const userId = req.user._id;
        
        // Get all user tests
        const allTests = await TestResult.find({ userId }).select('testType result.riskScore createdAt');
        
        // Calculate time ranges
        const now = new Date();
        const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);
        const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
        const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
        
        // Count tests by type
        const testsByType = {
            'phishing-url': 0,
            'phishing-email': 0,
            'clone-ai': 0,
            'clone-ml': 0,
            'clone-combined': 0,
            'malware-virustotal': 0,
            'malware-sandbox': 0,
            'scam-phone': 0
        };
        
        // Count tests by time period
        let testsLast24h = 0;
        let testsLast7d = 0;
        let testsLast30d = 0;
        
        // Calculate average risk scores
        let totalRiskScore = 0;
        let riskScoreCount = 0;
        
        // Process all tests
        allTests.forEach(test => {
            // Count by type
            if (testsByType.hasOwnProperty(test.testType)) {
                testsByType[test.testType]++;
            }
            
            // Count by time period
            const testDate = new Date(test.createdAt);
            if (testDate >= oneDayAgo) testsLast24h++;
            if (testDate >= sevenDaysAgo) testsLast7d++;
            if (testDate >= thirtyDaysAgo) testsLast30d++;
            
            // Calculate risk score average
            if (test.result && typeof test.result.riskScore === 'number') {
                totalRiskScore += test.result.riskScore;
                riskScoreCount++;
            }
        });
        
        // Group tests for display
        const groupedTests = {
            phishing: testsByType['phishing-url'] + testsByType['phishing-email'],
            clone: testsByType['clone-ai'] + testsByType['clone-ml'] + testsByType['clone-combined'],
            malware: testsByType['malware-virustotal'] + testsByType['malware-sandbox'],
            scam: testsByType['scam-phone']
        };
        
        // Get recent tests (last 5)
        const recentTests = await TestResult.find({ userId })
            .sort({ createdAt: -1 })
            .limit(5)
            .select('testType inputData result.riskScore result.threatLevel createdAt');
        
        res.status(200).json({
            success: true,
            data: {
                totalTests: allTests.length,
                testsLast24h,
                testsLast7d,
                testsLast30d,
                testsByType: groupedTests,
                detailedTestsByType: testsByType,
                averageRiskScore: riskScoreCount > 0 ? Math.round(totalRiskScore / riskScoreCount) : 0,
                recentTests
            }
        });
        
    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({
            error: 'Failed to fetch dashboard statistics: ' + error.message,
            success: false
        });
    }
});

// Email verification endpoint
app.post('/api/user/verify-email', protectRoute, async (req, res) => {
    try {
        const { email } = req.body;
        const userId = req.user._id;
        
        console.log('Email verification requested for:', email);
        
        // Validate email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email || !emailRegex.test(email)) {
            return res.status(400).json({
                error: 'Please enter a valid email address',
                success: false
            });
        }
        
        // In a real application, you would:
        // 1. Generate a verification token
        // 2. Send an email with the verification link
        // 3. Store the token in database with expiration
        
        // For demo purposes, we'll just return success
        console.log(`Verification email would be sent to: ${email}`);
        
        res.status(200).json({
            success: true,
            message: 'Verification email sent successfully'
        });
        
    } catch (error) {
        console.error('Email verification error:', error);
        res.status(500).json({
            error: 'Failed to send verification email: ' + error.message,
            success: false
        });
    }
});

// Phone verification endpoint
app.post('/api/user/verify-phone', protectRoute, async (req, res) => {
    try {
        const { phone } = req.body;
        const userId = req.user._id;
        
        console.log('Phone verification requested for:', phone);
        
        // Validate phone
        const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
        const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
        if (!phone || !phoneRegex.test(cleanPhone)) {
            return res.status(400).json({
                error: 'Please enter a valid phone number',
                success: false
            });
        }
        
        // In a real application, you would:
        // 1. Generate a verification code (OTP)
        // 2. Send SMS with the verification code
        // 3. Store the code in database with expiration
        // 4. Provide endpoint to verify the code
        
        // For demo purposes, we'll just return success
        console.log(`Verification code would be sent to: ${phone}`);
        
        res.status(200).json({
            success: true,
            message: 'Verification code sent successfully'
        });
        
    } catch (error) {
        console.error('Phone verification error:', error);
        res.status(500).json({
            error: 'Failed to send verification code: ' + error.message,
            success: false
        });
    }
});

const PORT = 5001; 

const server = app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
    connectDB();
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.log(`Port ${PORT} is busy, trying port ${PORT + 1}...`);
        const newPort = PORT + 1;
        app.listen(newPort, () => {
            console.log(`Server running at http://localhost:${newPort}/`);
            connectDB();
        });
    } else {
        console.error('Server error:', err);
    }
});
