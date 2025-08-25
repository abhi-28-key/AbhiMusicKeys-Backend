const express = require('express');
const cors = require('cors');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const admin = require('firebase-admin');

// Load .env file
require('dotenv').config();

// Initialize Firebase Admin for secure action link generation (password reset)
try {
  if (!admin.apps.length) {
    // Prefer GOOGLE_APPLICATION_CREDENTIALS; fallback to inline env JSON
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      admin.initializeApp({ credential: admin.credential.applicationDefault() });
    } else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    } else {
      console.warn('Firebase Admin not initialized: missing service account. Password reset email endpoint will be disabled.');
    }
  }
} catch (e) {
  console.error('Failed to initialize Firebase Admin:', e);
}

// In-memory storage for payments (temporary solution)
let payments = [];

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'AbhiMusicKeys Backend is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Email configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    // Remove all whitespace in case the Gmail App Password was pasted with spaces
    pass: process.env.EMAIL_PASS ? process.env.EMAIL_PASS.replace(/\s/g, '') : process.env.EMAIL_PASS
  }
});

// Send Welcome Email endpoint
app.post('/api/send-welcome-email', async (req, res) => {
  try {
    const { to, name } = req.body || {};

    if (!to) {
      return res.status(400).json({ success: false, error: 'Missing recipient email' });
    }

    const displayName = (name && typeof name === 'string' && name.trim()) ? name.trim() : 'Musician';

    const subject = 'Welcome to AbhiMusicKeys 🎹 – Congratulations and All the Best!';
    const text = `Hi ${displayName},\n\nCongratulations on creating your AbhiMusicKeys account!\n\nEvery master was once a beginner — keep practicing, stay patient, and the music will follow.\n\nWishing you an inspired journey ahead!\n\nStart learning: https://abhimusickeys.com/\n\nWith gratitude,\nAbhiMusicKeys`;
    const html = `
      <div style="font-family:Segoe UI, Roboto, Helvetica, Arial, sans-serif; background:#0f172a; padding:24px; color:#e2e8f0;">
        <div style="max-width:640px; margin:0 auto; background:linear-gradient(135deg,#1e293b,#111827); border:1px solid #334155; border-radius:16px; overflow:hidden;">
          <div style="padding:20px 24px; background:linear-gradient(90deg,#ef4444,#ec4899,#8b5cf6); color:white; font-weight:800;">
            AbhiMusicKeys
          </div>
          <div style="padding:28px;">
            <h2 style="margin:0 0 12px; color:#ffffff;">Hi ${displayName},</h2>
            <p style="margin:0 0 8px; color:#e2e8f0; font-size:16px;">🎉 <strong>Congratulations</strong> on creating your AbhiMusicKeys account!</p>
            <p style="margin:0 0 16px; color:#cbd5e1; font-size:15px;">We’re excited to be part of your musical journey. Remember:</p>
            <blockquote style="margin:0 0 16px; padding:12px 16px; background:#0b1220; border-left:4px solid #f59e0b; border-radius:8px; color:#fde68a; font-weight:600;">
              “Every master was once a beginner — keep practicing, stay patient, and the music will follow.”
            </blockquote>
            <p style="margin:0 0 20px; color:#cbd5e1;">All the best — your consistency will make the music speak! 🎶</p>
            <a href="https://abhimusickeys.com/" target="_blank" style="display:inline-block; background:#8b5cf6; color:#fff; text-decoration:none; padding:10px 16px; border-radius:10px; font-weight:700;">Start Learning</a>
          </div>
          <div style="padding:16px 24px; border-top:1px solid #334155; color:#94a3b8; font-size:12px;">© ${new Date().getFullYear()} AbhiMusicKeys</div>
        </div>
      </div>`;

    await transporter.sendMail({
      from: `AbhiMusicKeys <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
      html
    });

    res.json({ success: true, message: 'Welcome email sent' });
  } catch (error) {
    console.error('Failed to send welcome email:', error);
    res.status(500).json({ success: false, error: 'Email send failed' });
  }
});

// Custom Password Reset via Gmail (avoids Spam)
app.post('/api/request-password-reset', async (req, res) => {
  try {
    if (!admin.apps.length) {
      return res.status(500).json({ success: false, error: 'Password reset not configured on server' });
    }

    const { email } = req.body || {};
    if (!email) {
      return res.status(400).json({ success: false, error: 'Missing email' });
    }

    console.log(`[PasswordReset] Request received for: ${email}`);

    // Generate secure reset link
    let resetLink = '';
    const continueUrl = process.env.PASSWORD_RESET_CONTINUE_URL || '';
    try {
      if (continueUrl) {
        const actionCodeSettings = { url: continueUrl, handleCodeInApp: false };
        resetLink = await admin.auth().generatePasswordResetLink(email, actionCodeSettings);
      } else {
        resetLink = await admin.auth().generatePasswordResetLink(email);
      }
    } catch (genErr) {
      // Common cause: continue URL domain not in Authorized domains; retry without settings
      console.error('generatePasswordResetLink failed, retrying without continueUrl. Error:', genErr && genErr.message);
      resetLink = await admin.auth().generatePasswordResetLink(email);
    }

    const subject = 'Reset your AbhiMusicKeys password';
    const text = `Hi,\n\nWe received a request to reset your AbhiMusicKeys password.\n\nReset password: ${resetLink}\n\nIf you didn’t request this, please ignore this email.\n\nThanks,\nAbhiMusicKeys`;
    const html = `
      <div style="font-family:Segoe UI, Roboto, Helvetica, Arial, sans-serif; background:#0f172a; padding:24px; color:#e2e8f0;">
        <div style="max-width:640px; margin:0 auto; background:linear-gradient(135deg,#1e293b,#111827); border:1px solid #334155; border-radius:16px; overflow:hidden;">
          <div style="padding:20px 24px; background:linear-gradient(90deg,#8b5cf6,#6366f1,#22d3ee); color:white; font-weight:800;">AbhiMusicKeys</div>
          <div style="padding:28px;">
            <h2 style="margin:0 0 12px; color:#ffffff;">Reset your password</h2>
            <p style="margin:0 0 16px; color:#cbd5e1;">Click the button below to reset your AbhiMusicKeys password.</p>
            <a href="${resetLink}" target="_blank" style="display:inline-block; background:#6366f1; color:#fff; text-decoration:none; padding:10px 16px; border-radius:10px; font-weight:700;">Reset Password</a>
            <p style="margin:18px 0 0; color:#94a3b8; font-size:12px;">If you didn’t request this, you can safely ignore this email.</p>
          </div>
          <div style="padding:16px 24px; border-top:1px solid #334155; color:#94a3b8; font-size:12px;">© ${new Date().getFullYear()} AbhiMusicKeys</div>
        </div>
      </div>`;

    await transporter.sendMail({
      from: `AbhiMusicKeys <${process.env.EMAIL_USER}>`,
      to: email,
      bcc: process.env.EMAIL_BCC || undefined,
      subject,
      text,
      html
    });

    console.log(`[PasswordReset] Email sent successfully to: ${email}`);
    res.json({ success: true, message: 'Password reset email sent' });
  } catch (error) {
    console.error('[PasswordReset] Failed:', error && error.message, error && error.code);
    const message = error && error.code === 'auth/user-not-found' ? 'Email not found' : 'Failed to send reset email';
    res.status(400).json({ success: false, error: message });
  }
});

// Initialize Razorpay
const keyId = process.env.RAZORPAY_KEY_ID;
const keySecret = process.env.RAZORPAY_KEY_SECRET;

console.log('🔐 Razorpay Configuration:');
console.log('Key ID:', keyId);
console.log('Key Secret:', keySecret ? '***SET***' : '***NOT SET***');
console.log('Environment:', keyId?.includes('rzp_live_') ? 'LIVE' : 'TEST');

// Validate keys
if (!keyId || !keySecret) {
  console.error('❌ Razorpay keys are missing! Please check your .env file');
  console.error('Required: RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET');
  console.error('Current .env values:');
  console.error('RAZORPAY_KEY_ID:', process.env.RAZORPAY_KEY_ID);
  console.error('RAZORPAY_KEY_SECRET:', process.env.RAZORPAY_KEY_SECRET ? '***SET***' : '***NOT SET***');
}

// Ensure key has proper format
const formattedKeyId = keyId && !keyId.startsWith('rzp_test_') && !keyId.startsWith('rzp_live_') 
  ? `rzp_test_${keyId}` 
  : keyId;

console.log('Formatted Key ID:', formattedKeyId);

// Only create Razorpay instance if keys are available
let razorpay = null;
if (keyId && keySecret) {
  razorpay = new Razorpay({
    key_id: formattedKeyId,
    key_secret: keySecret,
  });
  
  // Log environment status
  if (formattedKeyId?.includes('rzp_live_')) {
    console.log('🚀 LIVE MODE: Real payments will be processed');
  } else {
    console.log('🧪 TEST MODE: Only test payments will be processed');
  }
}

// Create order endpoint
app.post('/api/create-order', async (req, res) => {
  try {
    if (!razorpay) {
      return res.status(500).json({
        success: false,
        error: 'Razorpay not configured. Please check your API keys.'
      });
    }

    const { amount, currency = 'INR', planId, userId, userEmail } = req.body;
    
    // Validate amount
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid amount provided'
      });
    }

    const options = {
      amount: Math.round(amount * 100), // Razorpay expects amount in paise
      currency,
      receipt: `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      notes: {
        planId: planId,
        userId: userId || 'anonymous',
        userEmail: userEmail || 'unknown',
        environment: keyId?.includes('rzp_live_') ? 'live' : 'test'
      }
    };

    console.log('Creating order with options:', {
      ...options,
      notes: options.notes
    });

    const order = await razorpay.orders.create(options);
    
    console.log('Order created successfully:', {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      environment: keyId?.includes('rzp_live_') ? 'LIVE' : 'TEST'
    });
    
    res.json({
      success: true,
      order: order,
      environment: keyId?.includes('rzp_live_') ? 'live' : 'test'
    });
  } catch (error) {
    console.error('Error creating order:', error);
    
    // Provide more specific error messages
    let errorMessage = 'Failed to create order';
    if (error.statusCode === 401) {
      errorMessage = 'Razorpay authentication failed. Please check your API keys.';
    } else if (error.statusCode === 400) {
      errorMessage = 'Invalid request parameters.';
    } else if (error.statusCode === 403) {
      errorMessage = 'Access denied. Please check your Razorpay account status.';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    res.status(500).json({
      success: false,
      error: errorMessage,
      details: error
    });
  }
});

// Mock payment endpoint for testing (remove this in production)
app.post('/api/mock-create-order', async (req, res) => {
  try {
    const { amount, currency = 'INR', planId } = req.body;
    
    // Create a mock order
    const mockOrder = {
      id: `mock_order_${Date.now()}`,
      amount: amount * 100,
      currency: currency,
      receipt: `mock_receipt_${Date.now()}`,
      status: 'created',
      notes: {
        planId: planId,
        userId: req.body.userId || 'anonymous',
        mock: 'true'
      }
    };
    
    console.log('Mock order created:', mockOrder.id);
    
    res.json({
      success: true,
      order: mockOrder
    });
  } catch (error) {
    console.error('Error creating mock order:', error);
    res.status(500).json({ error: 'Failed to create mock order' });
  }
});

// Mock payment verification
app.post('/api/mock-verify-payment', async (req, res) => {
  try {
    const { planId, userId, userName, userEmail, planName, amount, planDuration } = req.body;
    
    // Mock successful payment
    const mockPayment = {
      success: true,
      message: 'Mock payment verified successfully',
      paymentId: `mock_payment_${Date.now()}`,
      orderId: `mock_order_${Date.now()}`,
      planId: planId,
      userId: userId,
      userName: userName,
      userEmail: userEmail,
      planName: planName,
      amount: amount,
      planDuration: planDuration
    };
    
    console.log('Mock payment verified:', mockPayment.paymentId);

    // Send a mock confirmation email (useful for testing)
    try {
      const formattedAmount = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount || 0);
      const to = userEmail;
      const name = userName || 'Musician';
      const subject = `Payment Successful – ${planName} (${formattedAmount})`;
      const text = `Hi ${name},\n\nYour payment for ${planName} has been verified successfully (mock).\nAmount: ${formattedAmount}\nPayment ID: ${mockPayment.paymentId}\nOrder ID: ${mockPayment.orderId}\nAccess: ${planDuration}\n\nWith gratitude,\nAbhiMusicKeys`;
      const html = `<div style=\"font-family:Segoe UI, Roboto, Helvetica, Arial, sans-serif; background:#0f172a; padding:24px; color:#e2e8f0;\"><div style=\"max-width:640px; margin:0 auto; background:linear-gradient(135deg,#1e293b,#111827); border:1px solid #334155; border-radius:16px; overflow:hidden;\"><div style=\"padding:20px 24px; background:linear-gradient(90deg,#10b981,#06b6d4,#3b82f6); color:white; font-weight:800;\">AbhiMusicKeys</div><div style=\"padding:28px;\"><h2 style=\"margin:0 0 12px; color:#ffffff;\">Payment Successful 🎉</h2><p style=\"margin:0 0 8px; color:#e2e8f0;\">Hi ${name}, thank you for your purchase!</p><div style=\"margin:14px 0; padding:12px 16px; background:#0b1220; border:1px solid #334155; border-radius:10px;\"><div style=\"margin:4px 0;\">Plan: <strong style=\"color:#93c5fd;\">${planName}</strong></div><div style=\"margin:4px 0;\">Amount: <strong style=\"color:#bbf7d0;\">${formattedAmount}</strong></div><div style=\"margin:4px 0;\">Payment ID: <code>${mockPayment.paymentId}</code></div><div style=\"margin:4px 0;\">Order ID: <code>${mockPayment.orderId}</code></div><div style=\"margin:4px 0;\">Access: <strong>${planDuration}</strong></div></div><p style=\"margin:12px 0 20px; color:#cbd5e1;\">You now have access to premium content. Keep practicing and enjoy your learning journey! 🎹</p><a href=\"https://abhimusickeys.com/\" target=\"_blank\" style=\"display:inline-block; background:#3b82f6; color:#fff; text-decoration:none; padding:10px 16px; border-radius:10px; font-weight:700;\">Go to Dashboard</a></div><div style=\"padding:16px 24px; border-top:1px solid #334155; color:#94a3b8; font-size:12px;\">© ${new Date().getFullYear()} AbhiMusicKeys</div></div></div>`;
      if (to) {
        setImmediate(() => {
          transporter.sendMail({ from: `AbhiMusicKeys <${process.env.EMAIL_USER}>`, to, subject, text, html }).catch(err => console.error('Mock payment email failed:', err));
        });
      }
    } catch (emailErr) {
      console.error('Mock payment email scheduling failed:', emailErr);
    }
    
    res.json(mockPayment);
  } catch (error) {
    console.error('Error verifying mock payment:', error);
    res.status(500).json({ error: 'Mock payment verification failed' });
  }
});

// Verify payment endpoint
app.post('/api/verify-payment', async (req, res) => {
  try {
    const {
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      planId,
      userId,
      userName,
      userEmail,
      planName,
      amount,
      planDuration
    } = req.body;

    // Verify signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature === razorpay_signature) {
      // Payment is verified - store payment data in memory
      const paymentData = {
        id: Date.now().toString(),
        userId: userId,
        userEmail: userEmail || '',
        userName: userName || 'User',
        amount: amount || 0,
        currency: 'INR',
        plan: planId,
        planName: planName || (planId === 'styles-tones' ? 'Styles & Tones Package' : 'Plan'),
        status: 'success',
        paymentMethod: 'razorpay',
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        createdAt: new Date(),
        updatedAt: new Date(),
        planDuration: planDuration || (planId === 'styles-tones' ? 'Lifetime' : 'Plan'),
        failureReason: null
      };
      
      // Store in memory
      payments.push(paymentData);
      
      console.log('Payment stored in memory with ID:', paymentData.id);

      // Fire-and-forget: send payment confirmation email
      try {
        const formattedAmount = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount || 0);
        const to = userEmail;
        const name = userName || 'Musician';
        const subject = `Payment Successful – ${paymentData.planName} (${formattedAmount})`;
        const text = `Hi ${name},\n\nThank you for your purchase! Your payment for ${paymentData.planName} has been verified successfully.\n\nAmount: ${formattedAmount}\nOrder ID: ${razorpay_order_id}\nPayment ID: ${razorpay_payment_id}\nAccess: ${paymentData.planDuration}\n\nYou now have access to premium content.\n\nWith gratitude,\nAbhiMusicKeys`;
        const html = `
          <div style="font-family:Segoe UI, Roboto, Helvetica, Arial, sans-serif; background:#0f172a; padding:24px; color:#e2e8f0;">
            <div style="max-width:640px; margin:0 auto; background:linear-gradient(135deg,#1e293b,#111827); border:1px solid #334155; border-radius:16px; overflow:hidden;">
              <div style="padding:20px 24px; background:linear-gradient(90deg,#10b981,#06b6d4,#3b82f6); color:white; font-weight:800;">AbhiMusicKeys</div>
              <div style="padding:28px;">
                <h2 style="margin:0 0 12px; color:#ffffff;">Payment Successful 🎉</h2>
                <p style="margin:0 0 8px; color:#e2e8f0;">Hi ${name}, thank you for your purchase!</p>
                <div style="margin:14px 0; padding:12px 16px; background:#0b1220; border:1px solid #334155; border-radius:10px;">
                  <div style="margin:4px 0;">Plan: <strong style="color:#93c5fd;">${paymentData.planName}</strong></div>
                  <div style="margin:4px 0;">Amount: <strong style="color:#bbf7d0;">${formattedAmount}</strong></div>
                  <div style="margin:4px 0;">Payment ID: <code>${razorpay_payment_id}</code></div>
                  <div style="margin:4px 0;">Order ID: <code>${razorpay_order_id}</code></div>
                  <div style="margin:4px 0;">Access: <strong>${paymentData.planDuration}</strong></div>
                </div>
                <p style="margin:12px 0 20px; color:#cbd5e1;">You now have access to premium content. Keep practicing and enjoy your learning journey! 🎹</p>
                <a href="https://abhimusickeys.com/" target="_blank" style="display:inline-block; background:#3b82f6; color:#fff; text-decoration:none; padding:10px 16px; border-radius:10px; font-weight:700;">Go to Dashboard</a>
              </div>
              <div style="padding:16px 24px; border-top:1px solid #334155; color:#94a3b8; font-size:12px;">© ${new Date().getFullYear()} AbhiMusicKeys</div>
            </div>
          </div>`;

        if (to) {
          setImmediate(() => {
            transporter.sendMail({
              from: `AbhiMusicKeys <${process.env.EMAIL_USER}>`,
              to,
              subject,
              text,
              html
            }).catch(err => console.error('Payment email send failed:', err));
          });
        }
      } catch (emailErr) {
        console.error('Payment email scheduling failed:', emailErr);
      }
      
      res.json({
        success: true,
        message: 'Payment verified successfully',
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
        planId: planId,
        paymentId: paymentData.id
      });
    } else {
      // Payment failed - store failure data
      const failureData = {
        id: Date.now().toString(),
        userId: userId,
        userEmail: userEmail || '',
        userName: userName || 'User',
        amount: amount || 0,
        currency: 'INR',
        plan: planId,
        planName: planName || (planId === 'styles-tones' ? 'Styles & Tones Package' : 'Plan'),
        status: 'failed',
        paymentMethod: 'razorpay',
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        createdAt: new Date(),
        updatedAt: new Date(),
        planDuration: planDuration || (planId === 'styles-tones' ? 'Lifetime' : 'Plan'),
        failureReason: 'Invalid signature'
      };
      
      // Store failure in memory
      payments.push(failureData);
      
      console.log('Payment failure stored in memory with ID:', failureData.id);
      
      res.status(400).json({
        success: false,
        error: 'Invalid signature',
        paymentId: failureData.id
      });
    }
  } catch (error) {
    console.error('Error verifying payment:', error);
    
    // Store error in memory
    try {
             const errorData = {
         id: Date.now().toString(),
         userId: req.body.userId || 'unknown',
         userEmail: req.body.userEmail || '',
         userName: req.body.userName || 'User',
         amount: req.body.amount || 0,
         currency: 'INR',
         plan: req.body.planId || 'unknown',
         planName: req.body.planName || (req.body.planId === 'styles-tones' ? 'Styles & Tones Package' : 'Plan'),
         status: 'failed',
         paymentMethod: 'razorpay',
         razorpayOrderId: req.body.razorpay_order_id || '',
         razorpayPaymentId: req.body.razorpay_payment_id || '',
         createdAt: new Date(),
         updatedAt: new Date(),
         planDuration: req.body.planDuration || (req.body.planId === 'styles-tones' ? 'Lifetime' : 'Plan'),
         failureReason: error.message || 'Payment verification failed'
       };
      
      payments.push(errorData);
      console.log('Payment error stored in memory with ID:', errorData.id);
    } catch (memoryError) {
      console.error('Failed to store payment error in memory:', memoryError);
    }
    
    res.status(500).json({
      success: false,
      error: 'Payment verification failed'
    });
  }
});

// Get all payments for Revenue Analytics
app.get('/api/payments', async (req, res) => {
  try {
    const { timeFilter = 'all', planFilter = 'all', limit = 50 } = req.query;
    
    console.log('Fetching payments with filters:', { timeFilter, planFilter, limit });
    console.log('Total payments in memory:', payments.length);
    
    let filteredPayments = [...payments];
    
    // Apply time filter
    if (timeFilter === 'month') {
      const currentMonth = new Date();
      currentMonth.setDate(1);
      currentMonth.setHours(0, 0, 0, 0);
      filteredPayments = filteredPayments.filter(p => {
        const paymentDate = new Date(p.createdAt);
        return paymentDate >= currentMonth;
      });
    } else if (timeFilter === 'week') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      filteredPayments = filteredPayments.filter(p => {
        const paymentDate = new Date(p.createdAt);
        return paymentDate >= weekAgo;
      });
    }
    
    // Apply plan filter
    if (planFilter !== 'all') {
      filteredPayments = filteredPayments.filter(p => p.plan === planFilter);
    }
    
    // Sort by createdAt (newest first)
    filteredPayments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    // Apply limit
    if (limit) {
      filteredPayments = filteredPayments.slice(0, parseInt(limit));
    }
    
    console.log('Filtered payments:', filteredPayments.length);
    
    res.json({
      success: true,
      payments: filteredPayments,
      total: filteredPayments.length
    });
  } catch (error) {
    console.error('Error fetching payments:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payments',
      details: error.message
    });
  }
});

// Get payment statistics for Revenue Analytics
app.get('/api/payment-stats', async (req, res) => {
  try {
    const { timeFilter = 'all' } = req.query;
    
    console.log('Fetching payment stats with timeFilter:', timeFilter);
    console.log('Total payments in memory:', payments.length);
    
    let filteredPayments = [...payments];
    
    // Apply time filter
    if (timeFilter === 'month') {
      const currentMonth = new Date();
      currentMonth.setDate(1);
      currentMonth.setHours(0, 0, 0, 0);
      filteredPayments = filteredPayments.filter(p => {
        const paymentDate = new Date(p.createdAt);
        return paymentDate >= currentMonth;
      });
    } else if (timeFilter === 'week') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      filteredPayments = filteredPayments.filter(p => {
        const paymentDate = new Date(p.createdAt);
        return paymentDate >= weekAgo;
      });
    }
    
    console.log('Filtered payments:', filteredPayments.length);
    
    // Calculate statistics
    const successfulPayments = filteredPayments.filter(p => p.status === 'success');
    const failedPayments = filteredPayments.filter(p => p.status === 'failed');
    
    console.log('Successful payments:', successfulPayments.length);
    console.log('Failed payments:', failedPayments.length);
    
    const totalRevenue = successfulPayments.reduce((sum, p) => sum + p.amount, 0);
    const monthlyRevenue = successfulPayments.filter(p => {
      const paymentDate = new Date(p.createdAt);
      const currentMonth = new Date();
      currentMonth.setDate(1);
      currentMonth.setHours(0, 0, 0, 0);
      return paymentDate >= currentMonth;
    }).reduce((sum, p) => sum + p.amount, 0);
    
    const revenueByPlan = {
      basic: successfulPayments.filter(p => p.plan === 'basic').reduce((sum, p) => sum + p.amount, 0),
      intermediate: successfulPayments.filter(p => p.plan === 'intermediate').reduce((sum, p) => sum + p.amount, 0),
      advanced: successfulPayments.filter(p => p.plan === 'advanced').reduce((sum, p) => sum + p.amount, 0),
      'styles-tones': successfulPayments.filter(p => p.plan === 'styles-tones').reduce((sum, p) => sum + p.amount, 0)
    };
    
    const averageOrderValue = successfulPayments.length > 0 ? totalRevenue / successfulPayments.length : 0;
    
    const stats = {
      totalRevenue,
      monthlyRevenue,
      totalPayments: filteredPayments.length,
      successfulPayments: successfulPayments.length,
      failedPayments: failedPayments.length,
      averageOrderValue,
      revenueByPlan,
      successRate: filteredPayments.length > 0 ? (successfulPayments.length / filteredPayments.length) * 100 : 0
    };
    
    console.log('Calculated stats:', stats);
    
    res.json({
      success: true,
      stats: stats
    });
  } catch (error) {
    console.error('Error fetching payment stats:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payment statistics',
      details: error.message
    });
  }
});

// Get receipt by ID
app.get('/api/receipts/:id', async (req, res) => {
  try {
    const payment = payments.find(p => p.id === req.params.id);
    
    if (payment) {
      res.json({
        success: true,
        receipt: payment
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Receipt not found'
      });
    }
  } catch (error) {
    console.error('Error fetching receipt:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch receipt'
    });
  }
});



// Download endpoints
app.post('/api/download/styles', async (req, res) => {
  try {
    const { userId } = req.body;
    
    // Since frontend already verifies access, we'll trust the request
    // The frontend checks localStorage flags before making this request
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID required'
      });
    }
    
    // Replace this with your actual Google Drive file ID for styles
    const stylesFileId = process.env.GOOGLE_DRIVE_STYLES_FILE_ID || '1VQDV9perCZFtBZXfUjqhuAzleeU6cKYR';
    
    if (!stylesFileId) {
      return res.status(500).json({
        success: false,
        error: 'Styles file not configured'
      });
    }
    
    // Create direct download URL that triggers file save dialog
    // Use a more mobile-friendly Google Drive URL format
    const downloadUrl = `https://drive.google.com/uc?export=download&id=${stylesFileId}&confirm=t&uuid=`;
    
    res.json({
      success: true,
      downloadUrl: downloadUrl,
      fileName: process.env.STYLES_FILE_NAME || 'Indian_Styles_Package.zip',
      fileSize: 'Unknown',
      // Add mobile-specific instructions
      mobileInstructions: 'If download doesn\'t start automatically on mobile, please copy the link and open it in a new tab.'
    });
  } catch (error) {
    console.error('Download styles error:', error);
    res.status(500).json({ error: 'Download failed' });
  }
});

app.post('/api/download/tones', async (req, res) => {
  try {
    const { userId } = req.body;
    
    // Since frontend already verifies access, we'll trust the request
    // The frontend checks localStorage flags before making this request
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID required'
      });
    }
    
    // Replace this with your actual Google Drive file ID for tones
    const tonesFileId = process.env.GOOGLE_DRIVE_TONES_FILE_ID || '1sLhbzIcBxHl8gVkpyLd_y6T42qb8azJ9';
    
    if (!tonesFileId) {
      return res.status(500).json({
        success: false,
        error: 'Tones file not configured'
      });
    }
    
    // Create direct download URL that triggers file save dialog
    // Use a more mobile-friendly Google Drive URL format
    const downloadUrl = `https://drive.google.com/uc?export=download&id=${tonesFileId}&confirm=t&uuid=`;
    
    res.json({
      success: true,
      downloadUrl: downloadUrl,
      fileName: process.env.TONES_FILE_NAME || 'Indian_Tones_Package.zip',
      fileSize: 'Unknown',
      // Add mobile-specific instructions
      mobileInstructions: 'If download doesn\'t start automatically on mobile, please copy the link and open it in a new tab.'
    });
  } catch (error) {
    console.error('Download tones error:', error);
    res.status(500).json({ error: 'Download failed' });
  }
});

// Get user purchases endpoint
app.post('/api/user-purchases', async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing user ID' 
      });
    }

    console.log('Checking purchases for user:', userId);
    console.log('Total payments in memory:', payments.length);

    // Find all successful purchases for this user from memory
    const userPurchases = payments.filter(payment => 
      payment.userId === userId && payment.status === 'success'
    ).map(payment => ({
      id: payment.id,
      userId: payment.userId,
      userName: payment.userName || 'User',
      userEmail: payment.userEmail || '',
      planName: payment.planName || 'Plan',
      amount: payment.amount || 0,
      currency: payment.currency || 'INR',
      paymentId: payment.razorpayPaymentId || '',
      orderId: payment.razorpayOrderId || '',
      purchaseDate: payment.createdAt,
      planDuration: payment.planDuration || 'Plan',
      status: 'active'
    }));

    console.log('User purchases found:', userPurchases.length);

    // All purchases are valid (lifetime access)
    const validPurchases = userPurchases;

    res.json({ 
      success: true, 
      purchases: validPurchases,
      totalPurchases: validPurchases.length
    });
  } catch (error) {
    console.error('User purchases check error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to check purchases' 
    });
  }
});

// Verify download access endpoint
app.post('/api/verify-download-access', async (req, res) => {
  try {
    const { userId, paymentId } = req.body;
    
    if (!userId || !paymentId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required parameters' 
      });
    }

    // Check if this payment exists in memory
    const validPayment = payments.find(payment => 
      payment.razorpayPaymentId === paymentId && 
      payment.userId === userId && 
      payment.status === 'success'
    );

    if (!validPayment) {
      return res.status(403).json({ 
        success: false, 
        error: 'Invalid payment or access denied' 
      });
    }

    // Payment is valid (lifetime access)
    // No expiration check needed

    res.json({ 
      success: true, 
      message: 'Access granted',
      payment: validPayment
    });
  } catch (error) {
    console.error('Download access verification error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Verification failed' 
    });
  }
});

// In-memory storage for YouTube channels (replace with database in production)
let youtubeChannels = [
  { 
    id: 'UCJ5v_MCY6GNUBTO8o3knCvw', 
    title: 'Dany Unique Official', 
    username: 'danyuniqueofficial',
    url: 'https://www.youtube.com/@danyuniqueofficial',
    isActive: true,
    videoCount: 150
  },
  { 
    id: 'UC8R8Kp_e1PMwPlgtYlRnCGA', 
    title: 'Bhanu Pala', 
    username: 'bhanupala2600',
    url: 'https://www.youtube.com/@bhanupala2600',
    isActive: true,
    videoCount: 89
  },
  { 
    id: 'UCQhKdjJx6WJYL7Xjz_9_8vQ', 
    title: 'Sandies Music', 
    username: 'sandiesmusic',
    url: 'https://www.youtube.com/@sandiesmusic',
    isActive: true,
    videoCount: 234
  },
  { 
    id: 'UC2XdaAVUannpueHwXmOquZg', 
    title: 'Noel Jyothi', 
    username: 'noeljyothi',
    url: 'https://www.youtube.com/@noeljyothi',
    isActive: true,
    videoCount: 67
  }
];

// Get all YouTube channels
app.get('/api/youtube-channels', (req, res) => {
  try {
    res.json({
      success: true,
      channels: youtubeChannels
    });
  } catch (error) {
    console.error('Error fetching YouTube channels:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch YouTube channels'
    });
  }
});

// Add new YouTube channel
app.post('/api/youtube-channels', (req, res) => {
  try {
    const { title, username, url, videoCount = 0 } = req.body;
    
    if (!title || !username || !url) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: title, username, url'
      });
    }

    // Extract channel ID from URL if possible
    let channelId = '';
    if (url.includes('@')) {
      channelId = url.split('@')[1].split('/')[0];
    } else if (url.includes('channel/')) {
      channelId = url.split('channel/')[1].split('/')[0];
    }

    const newChannel = {
      id: channelId || `channel_${Date.now()}`,
      title,
      username,
      url,
      isActive: true,
      videoCount: parseInt(videoCount) || 0
    };

    youtubeChannels.push(newChannel);
    
    console.log('New YouTube channel added:', newChannel);
    
    res.json({
      success: true,
      channel: newChannel,
      message: 'YouTube channel added successfully'
    });
  } catch (error) {
    console.error('Error adding YouTube channel:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add YouTube channel'
    });
  }
});

// Update YouTube channel status
app.put('/api/youtube-channels/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { isActive, title, username, url, videoCount } = req.body;
    
    const channelIndex = youtubeChannels.findIndex(channel => channel.id === id);
    
    if (channelIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Channel not found'
      });
    }

    // Update channel properties
    if (isActive !== undefined) youtubeChannels[channelIndex].isActive = isActive;
    if (title) youtubeChannels[channelIndex].title = title;
    if (username) youtubeChannels[channelIndex].username = username;
    if (url) youtubeChannels[channelIndex].url = url;
    if (videoCount !== undefined) youtubeChannels[channelIndex].videoCount = parseInt(videoCount);

    console.log('YouTube channel updated:', youtubeChannels[channelIndex]);
    
    res.json({
      success: true,
      channel: youtubeChannels[channelIndex],
      message: 'YouTube channel updated successfully'
    });
  } catch (error) {
    console.error('Error updating YouTube channel:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update YouTube channel'
    });
  }
});

// Delete YouTube channel
app.delete('/api/youtube-channels/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    const channelIndex = youtubeChannels.findIndex(channel => channel.id === id);
    
    if (channelIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Channel not found'
      });
    }

    const deletedChannel = youtubeChannels.splice(channelIndex, 1)[0];
    
    console.log('YouTube channel deleted:', deletedChannel);
    
    res.json({
      success: true,
      message: 'YouTube channel deleted successfully',
      deletedChannel
    });
  } catch (error) {
    console.error('Error deleting YouTube channel:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete YouTube channel'
    });
  }
});



// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
}); 