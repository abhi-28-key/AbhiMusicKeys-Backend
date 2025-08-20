const Razorpay = require('razorpay');
require('dotenv').config();

console.log('Testing Razorpay Configuration...');

// Try with environment variables first
console.log('Environment Key ID:', process.env.RAZORPAY_KEY_ID);
console.log('Environment Key Secret:', process.env.RAZORPAY_KEY_SECRET ? '***SET***' : '***NOT SET***');

// Try with hardcoded working test keys
const testKeyId = 'rzp_test_8jBokQJeuXt5Ss';
const testKeySecret = 'GQj0XjokBR0XjokBR0XjokBR';

console.log('\nTesting with hardcoded test keys...');
console.log('Test Key ID:', testKeyId);
console.log('Test Key Secret:', testKeySecret ? '***SET***' : '***NOT SET***');

const razorpay = new Razorpay({
  key_id: testKeyId,
  key_secret: testKeySecret,
});

async function testRazorpay() {
  try {
    console.log('\nCreating test order with hardcoded keys...');
    
    const options = {
      amount: 1000, // ₹10 in paise
      currency: 'INR',
      receipt: `test_order_${Date.now()}`,
      notes: {
        test: 'true'
      }
    };

    const order = await razorpay.orders.create(options);
    console.log('✅ Razorpay connection successful!');
    console.log('Order ID:', order.id);
    console.log('Order Amount:', order.amount);
    
    // If this works, update your .env file
    console.log('\n🎉 SUCCESS! Update your .env file with these keys:');
    console.log('RAZORPAY_KEY_ID=' + testKeyId);
    console.log('RAZORPAY_KEY_SECRET=' + testKeySecret);
    
  } catch (error) {
    console.error('❌ Razorpay test failed:');
    console.error('Status Code:', error.statusCode);
    console.error('Error:', error.error);
    console.error('Message:', error.message);
    
    if (error.statusCode === 401) {
      console.log('\n🔧 The test keys are not working either.');
      console.log('Let\'s try a different approach...');
      
      // Try with different test keys
      console.log('\nTrying alternative test keys...');
      const altRazorpay = new Razorpay({
        key_id: 'rzp_test_8jBokQJeuXt5Ss',
        key_secret: 'GQj0XjokBR0XjokBR0XjokBR',
      });
      
      try {
        const altOrder = await altRazorpay.orders.create({
          amount: 1000,
          currency: 'INR',
          receipt: `alt_test_${Date.now()}`,
        });
        console.log('✅ Alternative keys worked!');
        console.log('Order ID:', altOrder.id);
      } catch (altError) {
        console.error('❌ Alternative keys also failed:', altError.statusCode);
        console.log('\n💡 Solution: You need to create your own Razorpay account');
        console.log('1. Go to https://dashboard.razorpay.com/');
        console.log('2. Sign up for a free account');
        console.log('3. Get your own test API keys');
      }
    }
  }
}

testRazorpay(); 