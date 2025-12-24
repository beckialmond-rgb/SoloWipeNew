/**
 * Create a 100% off coupon for 2 months in Stripe
 * Run this with: node create-2month-free-coupon.js
 * 
 * Make sure to set STRIPE_SECRET_KEY environment variable
 */

const Stripe = require('stripe');

// Initialize Stripe - use your secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_YOUR_KEY_HERE');

async function createCoupon() {
  try {
    const coupon = await stripe.coupons.create({
      id: '2_MONTHS_FREE', // Coupon ID - you can change this
      percent_off: 100,
      duration: 'repeating',
      duration_in_months: 2,
      name: '2 Months Free - 100% Off',
      // Optional: Add redemption limits
      // max_redemptions: 100, // Limit to 100 uses
      // redeem_by: Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60), // Expires in 90 days
    });

    console.log('✅ Coupon created successfully!');
    console.log('Coupon ID:', coupon.id);
    console.log('Name:', coupon.name);
    console.log('Discount:', coupon.percent_off + '% off');
    console.log('Duration:', coupon.duration, `(${coupon.duration_in_months} months)`);
    console.log('\n📋 Use this coupon code:', coupon.id);
    console.log('\n💡 To use in your app:');
    console.log('   1. Go to subscription page');
    console.log('   2. Click "Have a coupon code?"');
    console.log('   3. Enter:', coupon.id);
    console.log('   4. Select your plan');
    
  } catch (error) {
    if (error.code === 'resource_already_exists') {
      console.log('⚠️  Coupon already exists with this ID');
      console.log('💡 Try a different ID or delete the existing coupon first');
    } else {
      console.error('❌ Error creating coupon:', error.message);
    }
  }
}

createCoupon();

