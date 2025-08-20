# Email Configuration Guide for AbhiMusicKeys

## Step-by-Step Setup

### Step 1: Create .env file
Create a file named `.env` in the `abhimusickeys/backend/` directory with the following content:

```env
# Email Configuration
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Razorpay Configuration (existing)
RAZORPAY_KEY_ID=rzp_test_rrurCWnRVbZZG1
RAZORPAY_KEY_SECRET=your-razorpay-secret-key
```

### Step 2: Gmail App Password Setup

#### Option A: If you have 2-Factor Authentication enabled:

1. **Go to Google Account Settings**
   - Visit: https://myaccount.google.com/
   - Click on "Security" in the left sidebar

2. **Enable 2-Step Verification** (if not already enabled)
   - Find "2-Step Verification" and click "Get started"
   - Follow the setup process

3. **Generate App Password**
   - In Security section, find "App passwords"
   - Click "App passwords"
   - Select "Mail" from the dropdown
   - Click "Generate"
   - Copy the 16-character password (e.g., `abcd efgh ijkl mnop`)

4. **Use the App Password**
   - Replace `your-app-password` in `.env` with the generated password
   - Remove spaces from the password

#### Option B: If you don't have 2-Factor Authentication:

1. **Enable "Less secure app access"**
   - Go to: https://myaccount.google.com/security
   - Scroll down to "Less secure app access"
   - Turn it ON
   - Use your regular Gmail password

### Step 3: Update .env file

Replace the placeholders in your `.env` file:

```env
# Email Configuration
EMAIL_USER=your-actual-email@gmail.com
EMAIL_PASS=your-16-character-app-password

# Razorpay Configuration (existing)
RAZORPAY_KEY_ID=rzp_test_rrurCWnRVbZZG1
RAZORPAY_KEY_SECRET=your-razorpay-secret-key
```

### Step 4: Test the Configuration

1. **Restart the server:**
   ```bash
   cd abhimusickeys/backend
   node server.js
   ```

2. **Test email functionality:**
   ```bash
   curl http://localhost:5000/api/health
   ```

3. **Check console output:**
   - You should see: "Server running on port 5000"
   - Verify email configuration is working

### Step 5: Troubleshooting

#### Common Issues:

1. **"Invalid login" error:**
   - Make sure you're using the app password, not your regular password
   - Ensure 2-Factor Authentication is enabled
   - Check that the app password is correct

2. **"Less secure app access" error:**
   - Enable "Less secure app access" in Google Account settings
   - Or use app passwords (recommended)

3. **Email not received:**
   - Check spam/junk folder
   - Verify email address is correct
   - Check server console for errors

4. **"Authentication failed" error:**
   - Double-check your email and password
   - Ensure no extra spaces in the password
   - Try generating a new app password

### Step 6: Security Best Practices

1. **Use App Passwords** (recommended)
   - More secure than "Less secure app access"
   - Can be revoked individually
   - Works with 2-Factor Authentication

2. **Never commit .env file**
   - Add `.env` to your `.gitignore` file
   - Keep your credentials private

3. **Regular password rotation**
   - Change app passwords periodically
   - Monitor for suspicious activity

### Example .env file:

```env
# Email Configuration
EMAIL_USER=abhimusickeys@gmail.com
EMAIL_PASS=abcd efgh ijkl mnop

# Razorpay Configuration
RAZORPAY_KEY_ID=rzp_test_rrurCWnRVbZZG1
RAZORPAY_KEY_SECRET=your-razorpay-secret-key
```

### Testing Commands:

```bash
# Test health endpoint
curl http://localhost:5000/api/health

# Test server functionality
curl http://localhost:5000/api/health
```

### Success Indicators:

✅ **Server starts without errors**  
✅ **Console shows "Server running on port 5000"**  
✅ **Email configuration is working**  
✅ **All endpoints respond correctly**  

### Need Help?

If you encounter issues:
1. Check the server console for error messages
2. Verify your Gmail settings
3. Test with a simple email first
4. Ensure no firewall is blocking the connection 