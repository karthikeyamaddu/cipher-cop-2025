# 🚀 Quick Test Guide - Phase 1: User Features

## ⚡ 5-Minute Test

### Step 1: Start Backend (30 seconds)
```bash
cd backend
npm start
```

**Expected Output**:
```
Server running at http://localhost:5001/
MONGO DB Connected: cluster0.qmhucr4.mongodb.net
```

### Step 2: Run Test Script (1 minute)
```bash
test-user-feature.bat
```

**What It Tests**:
- ✅ User registration
- ✅ User login
- ✅ Auth verification
- ✅ Profile retrieval

### Step 3: Check MongoDB (2 minutes)
1. Open https://cloud.mongodb.com
2. Login with credentials
3. Go to: Clusters → Browse Collections
4. Select: `ciphercop` database → `users` collection
5. Find your test user

**Verify These Fields**:
```javascript
{
  _id: ObjectId("..."),           // ✅ Should be present
  email: "testuser@ciphercop.com", // ✅ Should be lowercase
  fullName: "Test User",
  password: "$2a$10$...",          // ✅ Should be hashed
  phone: "",
  accountStatus: "active",         // ✅ Should be 'active'
  role: "user",                    // ✅ Should be 'user'
  emailVerified: false,            // ✅ Should be false
  lastLogin: ISODate("..."),       // ✅ Should have timestamp
  loginCount: 1,                   // ✅ Should be 1 (or more)
  createdAt: ISODate("..."),
  updatedAt: ISODate("...")
}
```

### Step 4: Test Login Count (1 minute)
Run login test 3 times:
```bash
curl -X POST http://localhost:5001/login -H "Content-Type: application/json" -d "{\"email\": \"testuser@ciphercop.com\", \"password\": \"test123456\"}"
```

**Check MongoDB**: `loginCount` should increment each time

### Step 5: Test Profile Endpoint (30 seconds)
```bash
# First login to get cookie
curl -X POST http://localhost:5001/login -H "Content-Type: application/json" -c cookies.txt -d "{\"email\": \"testuser@ciphercop.com\", \"password\": \"test123456\"}"

# Then get profile
curl -X GET http://localhost:5001/api/user/profile -b cookies.txt
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "_id": "67a1b2c3d4e5f6g7h8i9j0k1",
    "fullName": "Test User",
    "email": "testuser@ciphercop.com",
    "phone": "",
    "role": "user",
    "accountStatus": "active",
    "emailVerified": false,
    "lastLogin": "2025-01-15T10:30:00.000Z",
    "loginCount": 4,
    "createdAt": "2025-01-15T10:00:00.000Z",
    "updatedAt": "2025-01-15T10:30:00.000Z"
  }
}
```

---

## ✅ Success Checklist

- [ ] Backend starts without errors
- [ ] Test script runs successfully
- [ ] User appears in MongoDB with `_id`
- [ ] All new fields are present
- [ ] `loginCount` increments on each login
- [ ] `lastLogin` updates on each login
- [ ] Profile endpoint returns complete data
- [ ] Email is stored in lowercase
- [ ] Password is hashed (starts with $2a$)
- [ ] Default values are correct

---

## 🎯 What to Look For

### ✅ GOOD Signs
- User `_id` is a MongoDB ObjectId
- Email is lowercase
- Password is hashed (long string starting with $2a$)
- `accountStatus` is 'active'
- `role` is 'user'
- `loginCount` increments
- `lastLogin` updates

### ❌ BAD Signs
- No `_id` field
- Email is uppercase
- Password is plain text
- Missing new fields
- `loginCount` doesn't increment
- `lastLogin` doesn't update

---

## 🐛 Quick Fixes

### Problem: "MongoDB connection error"
**Fix**: Check `.env` file has correct MongoDB URL

### Problem: "Email already exists"
**Fix**: Delete test user from MongoDB or use different email

### Problem: Test script fails
**Fix**: Make sure backend is running on port 5001

### Problem: No `_id` in response
**Fix**: Check MongoDB - `_id` is auto-assigned on save

### Problem: `loginCount` not incrementing
**Fix**: Check `auth.js` login function has `$inc` operator

---

## 📞 Need Help?

**Check These Files**:
1. `PHASE1_COMPLETE.md` - Complete summary
2. `USER_FEATURE_IMPLEMENTATION.md` - Detailed guide
3. `DATABASE_DOCUMENTATION.md` - Database docs

**Common Commands**:
```bash
# Start backend
cd backend
npm start

# Test registration
curl -X POST http://localhost:5001/signup -H "Content-Type: application/json" -d "{\"fullName\": \"Test\", \"email\": \"test@test.com\", \"password\": \"test123\"}"

# Test login
curl -X POST http://localhost:5001/login -H "Content-Type: application/json" -c cookies.txt -d "{\"email\": \"test@test.com\", \"password\": \"test123\"}"

# Test profile
curl -X GET http://localhost:5001/api/user/profile -b cookies.txt
```

---

## ✅ When Everything Works

**You should see**:
1. ✅ User created with MongoDB `_id`
2. ✅ All new fields present in database
3. ✅ Login updates `lastLogin` and `loginCount`
4. ✅ Profile endpoint returns complete data
5. ✅ User data properly linked via `userId`

**Then say**: "Phase 1 verified" and we'll move to Phase 2!

---

**Estimated Time**: 5 minutes  
**Difficulty**: Easy  
**Status**: Ready for Testing
