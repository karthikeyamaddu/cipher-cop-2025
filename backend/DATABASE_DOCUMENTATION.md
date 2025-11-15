# 🗄️ CipherCop Database Documentation

## 📊 Database Overview

**Database Name**: `ciphercop`  
**Type**: MongoDB Atlas  
**Connection**: `mongodb+srv://fraudlens:fraudlens123@cluster0.qmhucr4.mongodb.net/ciphercop`

---

## 📦 Collections

### 1. **users** Collection

**Purpose**: Store user account information and authentication data

**Schema**:
```javascript
{
  _id: ObjectId,                    // Auto-generated MongoDB ID
  email: String,                    // User email (unique, indexed, lowercase)
  fullName: String,                 // User's full name
  password: String,                 // Bcrypt hashed password (10 salt rounds)
  phone: String,                    // Optional phone number
  accountStatus: String,            // 'active', 'suspended', 'deleted'
  role: String,                     // 'user', 'admin', 'premium'
  emailVerified: Boolean,           // Email verification status
  lastLogin: Date,                  // Last login timestamp
  loginCount: Number,               // Total login count
  createdAt: Date,                  // Account creation timestamp
  updatedAt: Date                   // Last update timestamp
}
```

**Indexes**:
- `email` (unique, ascending)
- `createdAt` (descending)
- `accountStatus` (ascending)

**Default Values**:
- `accountStatus`: 'active'
- `role`: 'user'
- `emailVerified`: false
- `loginCount`: 0
- `phone`: ''

**Validation Rules**:
- Email must be unique and valid format
- Password must be at least 6 characters
- Email is automatically converted to lowercase
- All string fields are trimmed

**Related Endpoints**:
- `POST /signup` - Create new user
- `POST /login` - Authenticate user
- `POST /logout` - Clear authentication
- `GET /checkAuth` - Verify authentication status
- `PUT /api/user/update` - Update user profile
- `PUT /api/user/change-password` - Change password

---

### 2. **testresults** Collection

**Purpose**: Store all security test results (phishing, malware, clone, scam, sandbox, email)

**Schema**:
```javascript
{
  _id: ObjectId,
  userId: ObjectId,                 // Reference to users._id (indexed)
  testType: String,                 // 'phishing', 'malware', 'clone', 'scam', 'sandbox'
  
  inputData: {
    url: String,                    // For phishing/clone URL analysis
    email: String,                  // For email phishing (subject only)
    content: String,                // For content analysis
    fileName: String                // For malware/sandbox files
  },
  
  result: {
    isPhishing: Boolean,
    isMalware: Boolean,
    isClone: Boolean,
    isScam: Boolean,
    threatLevel: String,            // 'low', 'medium', 'high'
    riskScore: Number,              // 0-100
    combinedRiskScore: Number,      // Combined AI + traditional score
    confidence: Number              // ML confidence score
  },
  
  details: {
    // Phishing details
    domainAge: String,
    registrar: String,
    country: String,
    reputation: Number,
    aiAnalysis: Object,
    whoisData: Object,
    
    // Malware details
    detections: Array,
    scanDate: String,
    sandboxData: Object,
    
    // Common
    processingTime: Number,
    lastChecked: String
  },
  
  flags: [String],                  // Security flags/warnings
  recommendations: [String],        // AI recommendations
  insights: String,                 // AI insights text
  status: String,                   // 'completed', 'failed', 'processing'
  processingTime: Number,           // Milliseconds
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes**:
- `userId` + `createdAt` (compound, descending)
- `testType` + `createdAt` (compound, descending)

**Related Endpoints**:
- `POST /api/phishing/analyze` - Phishing URL detection
- `POST /api/phishing/analyze-email-store` - Email phishing storage (NEW)
- `POST /api/clone/store` - Clone detection storage (NEW)
- `POST /api/scam/store` - Scam phone detection storage (NEW)
- `POST /api/malware/store` - Malware/Sandbox results (ENHANCED)
- `GET /api/tests/history` - Get user's test history
- `GET /api/tests/stats` - Get user statistics
- `GET /api/tests/:id` - Get specific test details

---

### 3. **results** Collection (Legacy)

**Purpose**: Legacy collection with loose schema

**Status**: ⚠️ **NOT ACTIVELY USED** - Can be removed or repurposed

**Schema**:
```javascript
{} // Loose schema (strict: false)
```

---

## 🔗 User Data Linking

### Primary Key
All collections link to users via the `userId` field which references `users._id`

### Query Examples

**Get all tests for a user**:
```javascript
TestResult.find({ userId: req.user._id })
  .sort({ createdAt: -1 })
  .limit(10)
```

**Get user statistics**:
```javascript
TestResult.aggregate([
  { $match: { userId: req.user._id } },
  { $group: {
      _id: '$testType',
      count: { $sum: 1 },
      avgRiskScore: { $avg: '$result.riskScore' }
  }}
])
```

**Get specific test**:
```javascript
TestResult.findOne({ 
  _id: testId, 
  userId: req.user._id 
})
```

---

## 🔐 Security Features

### Password Security
- **Hashing**: bcrypt with 10 salt rounds
- **Storage**: Never returned in API responses
- **Verification**: bcrypt.compare() during login

### Authentication
- **Method**: JWT tokens in HTTP-only cookies
- **Expiration**: 7 days
- **Secret**: Stored in environment variable
- **Middleware**: `protectRoute` for protected endpoints

### Data Privacy
- **Email content**: Never stored (only subject/metadata)
- **File content**: Never stored (only file names)
- **Phone numbers**: Hashed before storage (future feature)
- **Passwords**: Always bcrypt hashed

### Account Status
- **active**: Normal user account
- **suspended**: Account temporarily disabled
- **deleted**: Account marked for deletion

---

## 📈 Current Implementation Status

### ✅ Implemented Features
1. **User Management**
   - Registration with validation
   - Login with account status check
   - Logout functionality
   - Authentication verification
   - Profile updates
   - Password changes
   - Login tracking (lastLogin, loginCount)

2. **Test Results Storage**
   - Phishing URL detection
   - Malware/Sandbox analysis
   - Test history retrieval
   - User statistics

### ✅ Newly Implemented Features (Phase 2)
1. **Clone Detection Storage** - ✅ Implemented (`POST /api/clone/store`)
2. **Scam Detection Storage** - ✅ Implemented (`POST /api/scam/store`)
3. **Email Phishing Storage** - ✅ Implemented (`POST /api/phishing/analyze-email-store`)
4. **Enhanced Malware Storage** - ✅ Improved with file hash and size

### ❌ Pending Features (Future Phases)
1. **Known Threats Cache** - Not implemented
2. **Activity Logs** - Not implemented
3. **User Preferences** - Not implemented
4. **API Rate Limiting** - Not implemented
5. **Community Reports** - Not implemented

---

## 📊 Database Statistics

### Storage Estimates
- **User document**: ~500 bytes
- **Test result**: ~2-10 KB (varies by test type)
- **Average per user**: ~562 KB (100 tests)

### Scaling Projections
- **1,000 users**: ~562 MB
- **10,000 users**: ~5.6 GB
- **100,000 users**: ~56 GB

### MongoDB Atlas Free Tier
- **Storage**: 512 MB
- **Capacity**: ~900 active users with 100 tests each

---

## 🔧 Maintenance

### Backup Strategy
- MongoDB Atlas automatic backups
- Point-in-time recovery available
- Export data via MongoDB Compass

### Index Maintenance
- Indexes automatically maintained by MongoDB
- Monitor index usage via Atlas dashboard
- Add indexes as query patterns emerge

### Data Retention
- User accounts: Indefinite (until user deletes)
- Test results: Indefinite (user history)
- Activity logs: 90 days (future feature)
- Profile history: 1 year (future feature)

---

## 🚀 Future Enhancements

### Phase 2: Performance & Security
- Known threats cache collection
- API usage tracking collection
- Activity logs collection

### Phase 3: User Experience
- User preferences collection
- Profile change history collection

### Phase 4: Community Features
- Community reports collection
- Shared threat intelligence

---

## 📝 Change Log

### Version 1.2 (Current - Phase 2 Complete)
- ✅ Added 8 test types support with correct naming
- ✅ Email phishing storage: `phishing-email`
- ✅ Clone detection storage: `clone-ai`, `clone-ml`, `clone-combined`
- ✅ Scam phone detection storage: `scam-phone`
- ✅ Malware storage: `malware-virustotal`, `malware-sandbox`
- ✅ Phishing URL storage: `phishing-url`
- ✅ User test tracking: `testResults` array and `testCount`
- ✅ All frontend pages integrated with database storage
- ✅ Phone number hashing for privacy
- ✅ Comprehensive test result fields
- ✅ Additional indexes for performance

### Version 1.0 (Phase 1)
- ✅ Enhanced user schema with role, status, verification
- ✅ Added login tracking (lastLogin, loginCount)
- ✅ Improved validation and error handling
- ✅ Account status checking on login
- ✅ Email normalization (lowercase)
- ✅ Better indexing for performance

### Version 0.9 (Initial)
- Basic user authentication
- Test results storage for phishing and malware
- Simple user profile management

---

## 🆘 Troubleshooting

### Connection Issues
```javascript
// Check connection string in backend/src/lib/db.js
mongodb+srv://fraudlens:fraudlens123@cluster0.qmhucr4.mongodb.net/ciphercop
```

### Common Errors
1. **"Email already exists"** - User trying to register with existing email
2. **"Account suspended"** - User account has been suspended by admin
3. **"User not found"** - Invalid userId in JWT token
4. **"Unauthorized"** - Missing or invalid JWT token

### Debug Mode
Enable detailed logging:
```javascript
// In backend/server.js
console.log('User from token:', req.user);
console.log('Test result:', testResult);
```

---

## 📞 Support

For database-related issues:
1. Check MongoDB Atlas dashboard for connection status
2. Verify environment variables in `.env` file
3. Review server logs for error messages
4. Check collection indexes in MongoDB Compass

---

**Last Updated**: January 2025  
**Database Version**: 1.1 (Phase 2 Complete)  
**MongoDB Version**: 6.0+  
**Test Types Supported**: 8 (phishing-url, phishing-email, clone-ai, clone-ml, clone-combined, malware-virustotal, malware-sandbox, scam-phone)
