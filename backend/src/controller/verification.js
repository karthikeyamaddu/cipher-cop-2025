import { User } from '../lib/db.js';

const VERIFICATION_SERVICE_URL = 'http://localhost:5009';

// Helper function to call Flask verification service
const callVerificationService = async (endpoint, data) => {
  try {
    console.log(`Calling verification service: ${VERIFICATION_SERVICE_URL}${endpoint}`);
    console.log('Request data:', data);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    
    const response = await fetch(`${VERIFICATION_SERVICE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    const result = await response.json();
    console.log('Verification service response:', result);
    
    return result;
  } catch (error) {
    console.error(`Verification service error (${endpoint}):`, error);
    throw new Error('Verification service unavailable');
  }
};

// Send Email OTP
export const sendEmailOTP = async (req, res) => {
  try {
    console.log('Send Email OTP request received:', req.body);
    const { email } = req.body;
    
    if (!email) {
      console.log('Email validation failed: Email is required');
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log('Email validation failed: Invalid format');
      return res.status(400).json({
        success: false,
        error: 'Invalid email format'
      });
    }

    // Check if this is the user's email
    const user = await User.findById(req.user._id);
    console.log('User email:', user.email, 'Request email:', email.toLowerCase());
    
    if (user.email !== email.toLowerCase()) {
      console.log('Email validation failed: Email does not match account');
      return res.status(400).json({
        success: false,
        error: 'Email does not match your account'
      });
    }

    console.log('Calling Flask verification service...');
    // Call Flask service
    const result = await callVerificationService('/send-email-otp', { email });
    
    if (result.success) {
      return res.json({
        success: true,
        message: result.message
      });
    } else {
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to send OTP'
      });
    }

  } catch (error) {
    console.error('Send email OTP error:', error);
    return res.status(500).json({
      success: false,
      error: 'An error occurred while sending OTP'
    });
  }
};

// Verify Email OTP
export const verifyEmailOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    
    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        error: 'Email and OTP are required'
      });
    }

    // Check if this is the user's email
    const user = await User.findById(req.user._id);
    if (user.email !== email.toLowerCase()) {
      return res.status(400).json({
        success: false,
        error: 'Email does not match your account'
      });
    }

    // Call Flask service
    const result = await callVerificationService('/verify-email-otp', { email, otp });
    
    if (result.success) {
      // Update user's email verification status
      await User.findByIdAndUpdate(req.user._id, {
        emailVerified: true
      });

      return res.json({
        success: true,
        message: 'Email verified successfully'
      });
    } else {
      return res.status(400).json({
        success: false,
        error: result.error || 'Invalid or expired OTP'
      });
    }

  } catch (error) {
    console.error('Verify email OTP error:', error);
    return res.status(500).json({
      success: false,
      error: 'An error occurred while verifying OTP'
    });
  }
};

// Send Phone OTP
export const sendPhoneOTP = async (req, res) => {
  try {
    const { phone } = req.body;
    
    if (!phone) {
      return res.status(400).json({
        success: false,
        error: 'Phone number is required'
      });
    }

    // Clean and validate phone format (more flexible validation)
    const cleanPhone = phone.replace(/[\s\-\(\)\+]/g, '');
    const phoneRegex = /^\d{10,15}$/; // Allow 10-15 digits for international numbers
    if (!phoneRegex.test(cleanPhone)) {
      return res.status(400).json({
        success: false,
        error: 'Phone number must be 10-15 digits'
      });
    }

    // Allow users to verify any phone number (not just their saved one)
    // This enables users to verify new phone numbers before saving them
    console.log(`User ${req.user._id} attempting to verify phone: ${cleanPhone}`);

    // Call Flask service with cleaned phone number
    const result = await callVerificationService('/send-phone-otp', { phone: cleanPhone });
    
    if (result.success) {
      return res.json({
        success: true,
        message: result.message
      });
    } else {
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to send OTP'
      });
    }

  } catch (error) {
    console.error('Send phone OTP error:', error);
    return res.status(500).json({
      success: false,
      error: 'An error occurred while sending OTP'
    });
  }
};

// Verify Phone OTP
export const verifyPhoneOTP = async (req, res) => {
  try {
    const { phone, otp } = req.body;
    
    if (!phone || !otp) {
      return res.status(400).json({
        success: false,
        error: 'Phone number and OTP are required'
      });
    }

    // Clean phone number to match what was sent for OTP
    const cleanPhone = phone.replace(/[\s\-\(\)\+]/g, '');

    // Call Flask service to verify OTP
    const result = await callVerificationService('/verify-phone-otp', { phone: cleanPhone, otp });
    
    if (result.success) {
      // Update user's phone number and verification status
      // This allows users to verify and save new phone numbers
      await User.findByIdAndUpdate(req.user._id, {
        phone: cleanPhone,
        phoneVerified: true
      });

      console.log(`Phone verified and saved for user ${req.user._id}: ${cleanPhone}`);

      return res.json({
        success: true,
        message: 'Phone number verified and saved successfully'
      });
    } else {
      return res.status(400).json({
        success: false,
        error: result.error || 'Invalid or expired OTP'
      });
    }

  } catch (error) {
    console.error('Verify phone OTP error:', error);
    return res.status(500).json({
      success: false,
      error: 'An error occurred while verifying OTP'
    });
  }
};

// Get verification status
export const getVerificationStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('email phone emailVerified phoneVerified');
    
    return res.json({
      success: true,
      data: {
        email: user.email,
        phone: user.phone,
        emailVerified: user.emailVerified,
        phoneVerified: user.phoneVerified
      }
    });

  } catch (error) {
    console.error('Get verification status error:', error);
    return res.status(500).json({
      success: false,
      error: 'An error occurred while fetching verification status'
    });
  }
};