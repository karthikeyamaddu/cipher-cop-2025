import express from "express";
import {signup,login,logout} from "./src/controller/auth.js";
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

// Malware detection endpoint
app.post('/api/malware/analyze', protectRoute, async (req, res) => {
    const startTime = Date.now();
    try {
        const { file, url, fileName } = req.body;
        
        if (!file && !url) {
            return res.status(400).json({ 
                error: 'File or URL is required for malware analysis',
                success: false 
            });
        }

        // Simulate malware analysis (replace with actual implementation)
        const analysis = {
            isMalware: Math.random() > 0.7,
            threatLevel: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
            riskScore: Math.floor(Math.random() * 100),
            detectedThreats: ['Trojan', 'Virus', 'Adware'][Math.floor(Math.random() * 3)],
            scanResults: {
                engines: 45,
                detections: Math.floor(Math.random() * 10)
            }
        };

        const processingTime = Date.now() - startTime;
        
        // Save test result to MongoDB
        const testResult = new TestResult({
            userId: req.user._id,
            testType: 'malware',
            inputData: {
                url: url || null,
                fileName: fileName || 'unknown_file'
            },
            result: {
                isMalware: analysis.isMalware,
                threatLevel: analysis.threatLevel,
                riskScore: analysis.riskScore
            },
            details: analysis,
            flags: analysis.isMalware ? ['Malware Detected'] : ['Clean'],
            recommendations: analysis.isMalware ? ['Quarantine file', 'Run full system scan'] : ['File appears safe'],
            insights: analysis.isMalware ? 'Potential malware detected' : 'No malware signatures found',
            processingTime
        });

        await testResult.save();
        
        res.status(200).json({
            success: true,
            data: analysis
        });
        
    } catch (error) {
        console.error('Malware analysis error:', error);
        res.status(500).json({ 
            error: 'Analysis failed: ' + error.message,
            success: false 
        });
    }
});

// Clone detection endpoint
app.post('/api/clone/analyze', protectRoute, async (req, res) => {
    const startTime = Date.now();
    try {
        const { url, originalUrl } = req.body;
        
        if (!url) {
            return res.status(400).json({ 
                error: 'URL is required for clone analysis',
                success: false 
            });
        }

        // Simulate clone analysis (replace with actual implementation)
        const analysis = {
            isClone: Math.random() > 0.6,
            similarity: Math.floor(Math.random() * 100),
            originalSite: originalUrl || 'example.com',
            cloneScore: Math.floor(Math.random() * 100),
            suspiciousElements: ['Logo similarity', 'Color scheme match', 'Layout similarity']
        };

        const processingTime = Date.now() - startTime;
        
        // Save test result to MongoDB
        const testResult = new TestResult({
            userId: req.user._id,
            testType: 'clone',
            inputData: {
                url: url,
                content: originalUrl
            },
            result: {
                isClone: analysis.isClone,
                riskScore: analysis.cloneScore,
                confidence: analysis.similarity
            },
            details: analysis,
            flags: analysis.isClone ? ['Potential Clone Site'] : ['Original Site'],
            recommendations: analysis.isClone ? ['Verify site authenticity', 'Check official domain'] : ['Site appears legitimate'],
            insights: analysis.isClone ? 'Website may be cloning another site' : 'No clone characteristics detected',
            processingTime
        });

        await testResult.save();
        
        res.status(200).json({
            success: true,
            data: analysis
        });
        
    } catch (error) {
        console.error('Clone analysis error:', error);
        res.status(500).json({ 
            error: 'Analysis failed: ' + error.message,
            success: false 
        });
    }
});

// Scam detection endpoint
app.post('/api/scam/analyze', protectRoute, async (req, res) => {
    const startTime = Date.now();
    try {
        const { content, type } = req.body; // type: 'email', 'message', 'website'
        
        if (!content) {
            return res.status(400).json({ 
                error: 'Content is required for scam analysis',
                success: false 
            });
        }

        // Simulate scam analysis (replace with actual implementation)
        const analysis = {
            isScam: Math.random() > 0.5,
            scamType: ['Phishing', 'Romance', 'Investment', 'Tech Support'][Math.floor(Math.random() * 4)],
            confidenceScore: Math.floor(Math.random() * 100),
            riskFactors: ['Urgent language', 'Money request', 'Suspicious links'],
            sentiment: 'manipulative'
        };

        const processingTime = Date.now() - startTime;
        
        // Save test result to MongoDB
        const testResult = new TestResult({
            userId: req.user._id,
            testType: 'scam',
            inputData: {
                content: content,
                url: type
            },
            result: {
                isScam: analysis.isScam,
                riskScore: analysis.confidenceScore,
                confidence: analysis.confidenceScore
            },
            details: analysis,
            flags: analysis.isScam ? ['Potential Scam'] : ['Appears Legitimate'],
            recommendations: analysis.isScam ? ['Do not respond', 'Report to authorities'] : ['Content appears safe'],
            insights: analysis.isScam ? `Potential ${analysis.scamType} scam detected` : 'No scam indicators found',
            processingTime
        });

        await testResult.save();
        
        res.status(200).json({
            success: true,
            data: analysis
        });
        
    } catch (error) {
        console.error('Scam analysis error:', error);
        res.status(500).json({ 
            error: 'Analysis failed: ' + error.message,
            success: false 
        });
    }
});

// Get user's test history
app.get('/api/tests/history', protectRoute, async (req, res) => {
    try {
        const { page = 1, limit = 10, testType } = req.query;
        
        const query = { userId: req.user._id };
        if (testType && ['phishing', 'malware', 'clone', 'scam'].includes(testType)) {
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

// Get detailed test result
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

// Get user statistics
app.get('/api/tests/stats', protectRoute, async (req, res) => {
    try {
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
        
        const totalTests = await TestResult.countDocuments({ userId: req.user._id });
        
        res.status(200).json({
            success: true,
            data: {
                totalTests,
                byType: stats,
                summary: {
                    totalThreats: stats.reduce((sum, stat) => sum + stat.threatsFound, 0),
                    avgRiskScore: stats.reduce((sum, stat) => sum + (stat.avgRiskScore || 0), 0) / stats.length || 0
                }
            }
        });
        
    } catch (error) {
        console.error('Test stats error:', error);
        res.status(500).json({ 
            error: 'Failed to fetch test statistics',
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
