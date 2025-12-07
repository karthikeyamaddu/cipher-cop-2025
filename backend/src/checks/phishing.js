import { exec } from 'child_process';
import { promisify } from 'util';
import urlParse from 'url-parse';
import axios from 'axios';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

const execAsync = promisify(exec);

// Initialize Gemini AI
const geminiApiKey = process.env.GEMINI_API_KEY;
let genAI = null;
let model = null;

if (geminiApiKey && geminiApiKey !== 'your_gemini_api_key_here') {
    try {
        genAI = new GoogleGenerativeAI(geminiApiKey);
        model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        console.log('Gemini AI initialized successfully');
    } catch (error) {
        console.error('Failed to initialize Gemini AI:', error.message);
    }
} else {
    console.warn('Gemini API key not found. AI analysis will be disabled.');
}

// Phishing detection service
class PhishingDetector {
    constructor() {
        this.suspiciousTlds = [
            '.tk', '.ml', '.ga', '.cf', '.top', '.click', '.download',
            '.zip', '.review', '.country', '.kim', '.cricket', '.science',
            '.work', '.party', '.gq', '.link'
        ];
        
        this.trustedDomains = [
            'google.com', 'microsoft.com', 'apple.com', 'amazon.com',
            'facebook.com', 'twitter.com', 'linkedin.com', 'github.com',
            'stackoverflow.com', 'wikipedia.org', 'reddit.com'
        ];
        
        this.phishingKeywords = [
            'verify', 'suspend', 'confirm', 'urgent', 'security',
            'account', 'login', 'password', 'update', 'expire'
        ];
    }

    // Main phishing analysis function
    async analyzeUrl(url) {
        try {
            // Normalize the URL - add protocol if missing
            let normalizedUrl = url.trim();
            
            // If URL doesn't start with protocol, add https://
            if (!normalizedUrl.match(/^https?:\/\//)) {
                normalizedUrl = 'https://' + normalizedUrl;
            }
            
            console.log(`Analyzing URL: ${url} -> normalized: ${normalizedUrl}`);
            
            // Parse the URL
            const parsedUrl = urlParse(normalizedUrl, true);
            
            // Get domain info
            const domain = parsedUrl.hostname ? parsedUrl.hostname.toLowerCase() : url.toLowerCase();
            
            // Validate domain format
            if (!domain || !domain.includes('.')) {
                throw new Error('Invalid domain format');
            }
            
            const domainParts = domain.split('.');
            
            // Initialize analysis result
            const analysis = {
                url: url, // Keep original URL for display
                normalizedUrl: normalizedUrl,
                domain: domain,
                isPhishing: false,
                riskScore: 0,
                flags: [],
                whoisData: null,
                details: {
                    domainAge: null,
                    registrar: null,
                    country: null,
                    reputation: 0,
                    similarDomains: 0,
                    lastChecked: new Date().toISOString()
                }
            };

            // Perform WHOIS lookup
            try {
                analysis.whoisData = await this.performWhoisLookup(domain);
                analysis.details = this.extractWhoisDetails(analysis.whoisData, analysis.details);
            } catch (error) {
                console.log('WHOIS lookup failed:', error.message);
                analysis.flags.push('WHOIS lookup failed');
            }

            // Analyze domain structure
            this.analyzeDomainStructure(parsedUrl, analysis);
            
            // Check for suspicious patterns
            this.checkSuspiciousPatterns(parsedUrl, analysis);
            
            // Check against known indicators
            this.checkPhishingIndicators(parsedUrl, analysis);
            
            // Calculate final risk score
            this.calculateRiskScore(analysis);
            
            // Perform Gemini AI analysis if available
            try {
                console.log('Starting Gemini AI analysis...');
                const aiResults = await this.analyzeWithGemini(url, analysis.whoisData, analysis);
                
                // Add AI results to the analysis
                analysis.aiAnalysis = aiResults.aiAnalysis;
                analysis.aiRiskScore = aiResults.aiRiskScore;
                analysis.aiRecommendations = aiResults.aiRecommendations;
                analysis.aiInsights = aiResults.aiInsights;
                
                // If AI provided a risk score, we can optionally combine it with our score
                if (aiResults.aiRiskScore !== null) {
                    // Weighted average: 60% traditional analysis, 40% AI analysis
                    const combinedScore = Math.round((analysis.riskScore * 0.6) + (aiResults.aiRiskScore * 0.4));
                    analysis.combinedRiskScore = combinedScore;
                    
                    // Update threat level based on combined score
                    if (combinedScore >= 70) {
                        analysis.threatLevel = 'high';
                        analysis.isPhishing = true;
                    } else if (combinedScore >= 40) {
                        analysis.threatLevel = 'medium';
                        analysis.isPhishing = false;
                    } else {
                        analysis.threatLevel = 'low';
                        analysis.isPhishing = false;
                    }
                } else {
                    analysis.combinedRiskScore = analysis.riskScore;
                }
                
                console.log('Gemini AI analysis completed successfully');
                
            } catch (aiError) {
                console.error('Gemini AI analysis failed:', aiError.message);
                analysis.aiAnalysis = null;
                analysis.aiRiskScore = null;
                analysis.aiRecommendations = ['AI analysis failed - rely on traditional analysis'];
                analysis.aiInsights = `AI analysis error: ${aiError.message}`;
                analysis.combinedRiskScore = analysis.riskScore;
            }
            
            return analysis;
            
        } catch (error) {
            throw new Error(`Analysis failed: ${error.message}`);
        }
    }

    // Perform WHOIS lookup using WhoisXML API
    async performWhoisLookup(domain) {
        const apiKey = process.env.WHOIS_API_KEY;
        
        if (!apiKey) {
            console.warn('WHOIS API key not found. Using fallback method.');
            return this.performFallbackWhoisLookup(domain);
        }

        try {
            console.log(`Performing WHOIS lookup for domain: ${domain}`);
            
            // Using WhoisXML API
            const response = await axios.get('https://www.whoisxmlapi.com/whoisserver/WhoisService', {
                params: {
                    apiKey: apiKey,
                    domainName: domain,
                    outputFormat: 'JSON'
                },
                timeout: 10000
            });

            console.log('WhoisXML API Response received');

            if (response.data && response.data.WhoisRecord) {
                return {
                    domain: domain,
                    data: response.data.WhoisRecord,
                    raw: JSON.stringify(response.data, null, 2),
                    timestamp: new Date().toISOString(),
                    success: true,
                    source: 'whoisxml_api'
                };
            } else {
                throw new Error('API returned no WhoisRecord data');
            }
            
        } catch (error) {
            console.error('WhoisXML API lookup failed:', error.message);
            
            // Fallback to command line or mock data
            console.log('Falling back to local lookup...');
            return this.performFallbackWhoisLookup(domain);
        }
    }

    // Try WhoisXML API as fallback
    async tryWhoisXMLAPI(domain) {
        const apiKey = process.env.WHOIS_API_KEY;
        
        try {
            console.log('Trying WhoisXML API...');
            const response = await axios.get('https://www.whoisxmlapi.com/whoisserver/WhoisService', {
                params: {
                    apiKey: apiKey,
                    domainName: domain,
                    outputFormat: 'JSON'
                },
                timeout: 10000
            });

            if (response.data && response.data.WhoisRecord) {
                return {
                    domain: domain,
                    data: response.data.WhoisRecord,
                    raw: JSON.stringify(response.data, null, 2),
                    timestamp: new Date().toISOString(),
                    success: true,
                    source: 'whoisxml_api'
                };
            } else {
                throw new Error('WhoisXML API returned no data');
            }
        } catch (error) {
            console.log('WhoisXML API failed:', error.message);
            throw new Error('WhoisXML API failed: ' + error.message);
        }
    }

    // Fallback WHOIS lookup (provides mock data for testing)
    async performFallbackWhoisLookup(domain) {
        console.log(`Using fallback lookup for domain: ${domain}`);
        
        // Generate realistic mock data for testing
        const mockRegistrars = ['GoDaddy LLC', 'Namecheap Inc', 'Google LLC', 'Cloudflare Inc', 'Network Solutions'];
        const mockCountries = ['US', 'CA', 'GB', 'DE', 'AU'];
        const randomDaysAgo = Math.floor(Math.random() * 3000) + 30; // 30-3030 days ago
        const creationDate = new Date(Date.now() - randomDaysAgo * 24 * 60 * 60 * 1000);
        
        return {
            domain: domain,
            data: {
                createdDate: creationDate.toISOString(),
                registrarName: mockRegistrars[Math.floor(Math.random() * mockRegistrars.length)],
                registrant: {
                    organization: Math.random() > 0.5 ? 'Privacy Protection Service' : 'Domain Owner',
                    countryCode: mockCountries[Math.floor(Math.random() * mockCountries.length)]
                },
                expiresDate: new Date(creationDate.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString(),
                nameServers: {
                    hostNames: ['ns1.example.com', 'ns2.example.com']
                },
                estimatedDomainAge: randomDaysAgo,
                domainAvailability: 'UNAVAILABLE'
            },
            raw: `Mock WHOIS data for ${domain}`,
            timestamp: new Date().toISOString(),
            success: true,
            source: 'mock_data'
        };
    }

    // Extract relevant details from WHOIS data
    extractWhoisDetails(whoisData, details) {
        if (!whoisData) return details;
        
        try {
            // Handle API response format
            if (whoisData.data && whoisData.source !== 'command_line_fallback' && whoisData.source !== 'mock_data') {
                return this.extractFromAPIResponse(whoisData.data, details);
            }
            
            // Handle raw text format (command line or mock data)
            if (whoisData.raw) {
                return this.extractFromRawText(whoisData.raw, details);
            }
            
        } catch (error) {
            console.error('Error extracting WHOIS details:', error);
        }
        
        return details;
    }

    // Extract details from API response
    extractFromAPIResponse(apiData, details) {
        // Handle WhoisJSON API format
        console.log('Extracting details from API data:', JSON.stringify(apiData, null, 2));
        
        // Extract creation date and calculate age
        if (apiData.createdDate || apiData.createdDateNormalized) {
            const creationDate = new Date(apiData.createdDate || apiData.createdDateNormalized);
            if (!isNaN(creationDate.getTime())) {
                const ageInDays = Math.floor((Date.now() - creationDate.getTime()) / (1000 * 60 * 60 * 24));
                details.domainAge = `${ageInDays} days`;
                details.creationDate = creationDate.toISOString().split('T')[0];
            }
        }
        
        // Use estimatedDomainAge if available (more accurate)
        if (apiData.estimatedDomainAge) {
            details.domainAge = `${apiData.estimatedDomainAge} days`;
        }
        
        // Extract registrar information
        if (apiData.registrarName) {
            details.registrar = apiData.registrarName;
        }
        
        // Extract country information
        if (apiData.registrant && apiData.registrant.countryCode) {
            details.country = apiData.registrant.countryCode;
        }
        
        // Extract organization
        if (apiData.registrant && apiData.registrant.organization) {
            details.organization = apiData.registrant.organization;
        }
        
        // Extract expiry date
        if (apiData.expiresDate || apiData.expiresDateNormalized) {
            details.expiryDate = apiData.expiresDate || apiData.expiresDateNormalized;
        }
        
        // Extract name servers
        if (apiData.nameServers && apiData.nameServers.hostNames) {
            details.nameServers = apiData.nameServers.hostNames.join(', ');
        }
        
        // Extract status
        if (apiData.status) {
            details.status = apiData.status;
        }
        
        // Privacy protection detection
        if (apiData.registrant && apiData.registrant.organization) {
            const org = apiData.registrant.organization.toLowerCase();
            if (org.includes('privacy') || org.includes('redacted') || org.includes('whoisguard')) {
                details.privacyProtection = true;
            }
        }
        
        // Domain availability
        if (apiData.domainAvailability) {
            details.availability = apiData.domainAvailability;
        }
        
        // Contact email
        if (apiData.contactEmail) {
            details.contactEmail = apiData.contactEmail;
        }
        
        // Calculate reputation based on various factors
        details.reputation = this.calculateDomainReputation(apiData, details);
        details.similarDomains = Math.floor(Math.random() * 5); // This would need a separate API
        
        return details;
    }

    // Extract details from raw text (fallback method)
    extractFromRawText(raw, details) {
        const rawLower = raw.toLowerCase();
        
        // Extract creation date
        const datePatterns = [
            /creation date[:\s]+([^\n\r]+)/i,
            /created[:\s]+([^\n\r]+)/i,
            /registered[:\s]+([^\n\r]+)/i,
            /domain created[:\s]+([^\n\r]+)/i
        ];
        
        for (const pattern of datePatterns) {
            const match = rawLower.match(pattern);
            if (match) {
                const creationDate = new Date(match[1]);
                if (!isNaN(creationDate.getTime())) {
                    const ageInDays = Math.floor((Date.now() - creationDate.getTime()) / (1000 * 60 * 60 * 24));
                    details.domainAge = `${ageInDays} days`;
                    break;
                }
            }
        }
        
        // Extract registrar
        const registrarMatch = rawLower.match(/registrar[:\s]+([^\n\r]+)/i);
        if (registrarMatch) {
            details.registrar = registrarMatch[1].trim();
        }
        
        // Extract country
        const countryMatch = rawLower.match(/country[:\s]+([^\n\r]+)/i);
        if (countryMatch) {
            details.country = countryMatch[1].trim();
        }
        
        // Generate reputation score
        details.reputation = Math.floor(Math.random() * 100);
        details.similarDomains = Math.floor(Math.random() * 5);
        
        return details;
    }

    // Calculate domain reputation based on WHOIS data
    calculateDomainReputation(apiData, details) {
        let reputation = 50; // Base score
        
        // Age factor
        if (details.domainAge) {
            const ageInDays = parseInt(details.domainAge);
            if (ageInDays > 365) reputation += 30;
            else if (ageInDays > 90) reputation += 15;
            else if (ageInDays < 30) reputation -= 20;
        }
        
        // Registrar factor
        const trustedRegistrars = [
            'godaddy', 'namecheap', 'google', 'amazon', 'cloudflare',
            'network solutions', 'tucows', 'enom'
        ];
        
        if (details.registrar && trustedRegistrars.some(reg => 
            details.registrar.toLowerCase().includes(reg))) {
            reputation += 10;
        }
        
        // Privacy protection (can be suspicious for certain contexts)
        if (details.privacyProtection) {
            reputation -= 5;
        }
        
        // Status factor
        if (details.status && details.status.includes('clientTransferProhibited')) {
            reputation += 5;
        }
        
        return Math.max(0, Math.min(100, reputation));
    }

    // Analyze domain structure for suspicious patterns
    analyzeDomainStructure(parsedUrl, analysis) {
        const domain = parsedUrl.hostname.toLowerCase();
        const path = parsedUrl.pathname.toLowerCase();
        
        // Check for suspicious TLDs
        for (const tld of this.suspiciousTlds) {
            if (domain.endsWith(tld)) {
                analysis.flags.push(`Suspicious TLD: ${tld}`);
                analysis.riskScore += 25;
            }
        }
        
        // Check for excessive subdomains
        const subdomains = domain.split('.').length - 2;
        if (subdomains > 2) {
            analysis.flags.push(`Excessive subdomains: ${subdomains}`);
            analysis.riskScore += 15;
        }
        
        // Check for suspicious characters
        if (domain.includes('-') && domain.split('-').length > 3) {
            analysis.flags.push('Multiple hyphens in domain');
            analysis.riskScore += 10;
        }
        
        // Check for mixed character sets or confusing characters
        if (/[0-9]/.test(domain) && /[a-z]/.test(domain)) {
            const numbers = (domain.match(/[0-9]/g) || []).length;
            if (numbers > 2) {
                analysis.flags.push('Mixed numbers and letters');
                analysis.riskScore += 10;
            }
        }
    }

    // Check for suspicious patterns in URL
    checkSuspiciousPatterns(parsedUrl, analysis) {
        const fullUrl = parsedUrl.href.toLowerCase();
        const domain = parsedUrl.hostname.toLowerCase();
        
        // Check for URL shorteners (often used in phishing)
        const shorteners = ['bit.ly', 'tinyurl.com', 'short.link', 't.co', 'goo.gl'];
        if (shorteners.some(shortener => domain.includes(shortener))) {
            analysis.flags.push('URL shortener detected');
            analysis.riskScore += 20;
        }
        
        // Check for suspicious keywords in domain
        for (const keyword of this.phishingKeywords) {
            if (domain.includes(keyword)) {
                analysis.flags.push(`Suspicious keyword in domain: ${keyword}`);
                analysis.riskScore += 15;
            }
        }
        
        // Check for typosquatting of popular domains
        for (const trustedDomain of this.trustedDomains) {
            if (this.isLikelyTyposquat(domain, trustedDomain)) {
                analysis.flags.push(`Possible typosquat of ${trustedDomain}`);
                analysis.riskScore += 35;
            }
        }
        
        // Check for suspicious paths
        const suspiciousPaths = ['/login', '/verify', '/secure', '/account', '/update'];
        if (suspiciousPaths.some(path => parsedUrl.pathname.includes(path))) {
            analysis.flags.push('Suspicious path detected');
            analysis.riskScore += 10;
        }
    }

    // Check against known phishing indicators
    checkPhishingIndicators(parsedUrl, analysis) {
        const domain = parsedUrl.hostname.toLowerCase();
        
        // Check for IP address instead of domain
        if (/^\d+\.\d+\.\d+\.\d+/.test(domain)) {
            analysis.flags.push('IP address instead of domain name');
            analysis.riskScore += 40;
        }
        
        // Check domain length (extremely long domains are suspicious)
        if (domain.length > 50) {
            analysis.flags.push('Unusually long domain name');
            analysis.riskScore += 20;
        }
        
        // Check for new domains (if we have creation date)
        if (analysis.details.domainAge) {
            const ageInDays = parseInt(analysis.details.domainAge);
            if (ageInDays < 30) {
                analysis.flags.push('Very new domain (less than 30 days)');
                analysis.riskScore += 30;
            } else if (ageInDays < 90) {
                analysis.flags.push('Recent domain (less than 90 days)');
                analysis.riskScore += 15;
            }
        }
    }

    // Simple typosquatting detection
    isLikelyTyposquat(domain, trustedDomain) {
        // Remove TLD for comparison
        const domainBase = domain.split('.')[0];
        const trustedBase = trustedDomain.split('.')[0];
        
        // Check if domains are similar length and have high similarity
        if (Math.abs(domainBase.length - trustedBase.length) <= 2) {
            const similarity = this.calculateSimilarity(domainBase, trustedBase);
            return similarity > 0.7 && similarity < 1.0;
        }
        
        return false;
    }

    // Calculate string similarity (simple implementation)
    calculateSimilarity(str1, str2) {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        
        if (longer.length === 0) return 1.0;
        
        const editDistance = this.levenshteinDistance(longer, shorter);
        return (longer.length - editDistance) / longer.length;
    }

    // Levenshtein distance calculation
    levenshteinDistance(str1, str2) {
        const matrix = [];
        
        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }
        
        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }
        
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        
        return matrix[str2.length][str1.length];
    }

    // Calculate final risk score and determine if it's phishing
    calculateRiskScore(analysis) {
        // Ensure risk score doesn't exceed 100
        analysis.riskScore = Math.min(analysis.riskScore, 100);
        
        // Determine phishing classification
        if (analysis.riskScore >= 70) {
            analysis.isPhishing = true;
            analysis.threatLevel = 'high';
        } else if (analysis.riskScore >= 40) {
            analysis.isPhishing = false;
            analysis.threatLevel = 'medium';
        } else {
            analysis.isPhishing = false;
            analysis.threatLevel = 'low';
        }
        
        // Update details
        analysis.details.reputation = Math.max(0, 100 - analysis.riskScore);
    }

    // Analyze URL and WHOIS data using Gemini AI
    async analyzeWithGemini(url, whoisData, currentAnalysis) {
        if (!model) {
            console.log('Gemini AI not available, skipping AI analysis');
            return {
                aiAnalysis: null,
                aiRiskScore: null,
                aiRecommendations: [],
                aiInsights: 'AI analysis not available - please add Gemini API key'
            };
        }

        try {
            console.log('Starting Gemini AI analysis...');
            
            // Prepare the prompt with URL and WHOIS data
            const prompt = `
As a cybersecurity expert, analyze this URL for phishing threats and respond with ONLY a valid JSON object.

URL: ${url}

WHOIS Data: ${JSON.stringify(whoisData, null, 2)}

Current Analysis: Risk Score ${currentAnalysis.riskScore}, Flags: ${currentAnalysis.flags.join(', ')}

Respond with ONLY this JSON structure (no other text):
{
  "riskScore": 85,
  "threatLevel": "high",
  "isPhishing": true,
  "confidence": 95,
  "riskFactors": ["Specific risk factor 1", "Specific risk factor 2"],
  "legitimacyIndicators": ["Any positive indicators found"],
  "recommendations": ["Specific recommendation 1", "Specific recommendation 2"],
  "technicalInsights": "Brief technical analysis summary",
  "summary": "Concise overall assessment"
}

Analysis focus: domain reputation, URL structure, registrar trust, geographic risks, technical indicators.
IMPORTANT: Return ONLY the JSON object, no additional text before or after.`;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            
            console.log('Gemini AI raw response:', text);
            
            // Try to parse the JSON response
            try {
                // Clean the response text to extract JSON
                let cleanedText = text.trim();
                
                // Remove any markdown code blocks if present
                cleanedText = cleanedText.replace(/```json\s*/g, '');
                cleanedText = cleanedText.replace(/```\s*/g, '');
                
                // Try to find JSON object in the text
                const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    cleanedText = jsonMatch[0];
                }
                
                console.log('Cleaned AI response for parsing:', cleanedText);
                
                const aiAnalysis = JSON.parse(cleanedText);
                
                // Validate required fields
                const validatedAnalysis = {
                    riskScore: aiAnalysis.riskScore || currentAnalysis.riskScore,
                    threatLevel: aiAnalysis.threatLevel || currentAnalysis.threatLevel,
                    isPhishing: aiAnalysis.isPhishing !== undefined ? aiAnalysis.isPhishing : currentAnalysis.isPhishing,
                    confidence: aiAnalysis.confidence || 70,
                    riskFactors: Array.isArray(aiAnalysis.riskFactors) ? aiAnalysis.riskFactors : [],
                    legitimacyIndicators: Array.isArray(aiAnalysis.legitimacyIndicators) ? aiAnalysis.legitimacyIndicators : [],
                    recommendations: Array.isArray(aiAnalysis.recommendations) ? aiAnalysis.recommendations : ['Review analysis manually'],
                    technicalInsights: aiAnalysis.technicalInsights || 'Technical analysis completed',
                    summary: aiAnalysis.summary || 'AI analysis completed'
                };
                
                return {
                    aiAnalysis: validatedAnalysis,
                    aiRiskScore: validatedAnalysis.riskScore,
                    aiRecommendations: validatedAnalysis.recommendations,
                    aiInsights: validatedAnalysis.summary
                };
                
            } catch (parseError) {
                console.error('Failed to parse Gemini AI response as JSON:', parseError.message);
                console.error('Raw response:', text);
                
                // Try to extract useful information from the text even if JSON parsing failed
                const extractedInfo = this.extractInfoFromText(text, currentAnalysis);
                
                return {
                    aiAnalysis: extractedInfo,
                    aiRiskScore: extractedInfo.riskScore,
                    aiRecommendations: extractedInfo.recommendations,
                    aiInsights: extractedInfo.summary
                };
            }
            
        } catch (error) {
            console.error('Gemini AI analysis failed:', error.message);
            
            return {
                aiAnalysis: null,
                aiRiskScore: null,
                aiRecommendations: ['AI analysis failed - rely on traditional analysis'],
                aiInsights: `AI analysis error: ${error.message}`
            };
        }
    }

    // Helper method to extract information from text when JSON parsing fails
    extractInfoFromText(text, currentAnalysis) {
        // Try to extract risk score from text
        let riskScore = currentAnalysis.riskScore;
        const riskMatch = text.match(/risk.*?score.*?(\d+)/i);
        if (riskMatch) {
            riskScore = parseInt(riskMatch[1]);
        }

        // Try to extract confidence
        let confidence = 70;
        const confidenceMatch = text.match(/confidence.*?(\d+)/i);
        if (confidenceMatch) {
            confidence = parseInt(confidenceMatch[1]);
        }

        // Extract recommendations
        let recommendations = ['Review the analysis manually'];
        const recMatch = text.match(/recommendations?[:\s]*(.+?)(?=\n|$)/i);
        if (recMatch) {
            recommendations = [recMatch[1].trim()];
        }

        return {
            riskScore: riskScore,
            threatLevel: riskScore >= 70 ? 'high' : riskScore >= 40 ? 'medium' : 'low',
            isPhishing: riskScore >= 70,
            confidence: confidence,
            riskFactors: ['Analysis parsing failed - manual review needed'],
            legitimacyIndicators: [],
            recommendations: recommendations,
            technicalInsights: text.substring(0, 200) + '...',
            summary: 'AI analysis completed with parsing issues'
        };
    }
}

// Create and export singleton instance
const phishingDetector = new PhishingDetector();

export { phishingDetector };
