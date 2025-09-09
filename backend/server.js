import express from "express";
import {signup,login,logout,extensionAuth} from "./src/controller/auth.js";
import { connectDB } from "./src/lib/db.js";
import cookieParser from "cookie-parser"
import { protectRoute } from "./src/controller/tokengen.js";
import { phishingDetector } from "./src/checks/phishing.js";
import { TestResult } from "./src/models/TestResult.js";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();
const app = express();

app.use(
    cors({
        origin: true, // Allow all origins for extension compatibility
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
app.post("/api/auth/extension-auth", extensionAuth);
app.get('/checkAuth', protectRoute, (req, res) => {
    res.status(200).json({ message: 'User is authenticated', user: req.user });
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
            testType: 'phishing',
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

        await testResult.save();
        
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

// Simplified phishing analysis endpoint for browser extension (no auth required)
app.post('/api/phishing/analyze-simple', async (req, res) => {
    const startTime = Date.now();
    try {
        const { url } = req.body;
        
        if (!url) {
            return res.status(400).json({ 
                error: 'URL is required',
                success: false 
            });
        }

        console.log(`Extension phishing analysis request for: ${url}`);

        // Perform phishing analysis using the same detector
        const analysis = await phishingDetector.analyzeUrl(url);
        
        // Simplified response format for extension
        const response = {
            success: true,
            data: {
                url: analysis.url,
                domain: analysis.domain,
                isPhishing: analysis.isPhishing,
                threatLevel: analysis.threatLevel || 'low',
                riskScore: analysis.riskScore,
                flags: analysis.flags,
                summary: analysis.aiInsights || 'Analysis completed'
            }
        };

        res.status(200).json(response);
        
    } catch (error) {
        console.error('Extension phishing analysis error:', error);
        res.status(500).json({ 
            error: 'Analysis failed: ' + error.message,
            success: false 
        });
    }
});

// Malware/Sandbox test result storage endpoint
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
        if (testType && ['phishing', 'malware', 'clone', 'scam', 'sandbox'].includes(testType)) {
            query.testType = testType;
        }
        
        const tests = await TestResult.find(query)
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .select('-details -__v'); // Exclude detailed data for performance
        
        const total = await TestResult.countDocuments(query);
        
        res.status(200).json({
            success: true,
            data: {
                tests,
                pagination: {
                    current: page,
                    total: Math.ceil(total / limit),
                    count: tests.length,
                    totalTests: total
                }
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

// Get user statistics (MUST come before /api/tests/:id)
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

// Get detailed test result (MUST come after /api/tests/stats)
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
