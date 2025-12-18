// Phase 3: Environment Variable Verification Script
// Run this in browser console on your deployed site to verify environment variables

(function() {
  console.log('🔍 Phase 3: Environment Variable Verification\n');
  console.log('=' .repeat(50));
  
  // Check frontend environment variables
  console.log('\n📦 Frontend Environment Variables (Vite):');
  console.log('-'.repeat(50));
  
  const frontendVars = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_PUBLISHABLE_KEY',
    'VITE_SUPABASE_PROJECT_ID'
  ];
  
  let frontendOk = true;
  frontendVars.forEach(varName => {
    const value = import.meta.env[varName];
    if (value) {
      // Mask sensitive values
      const displayValue = varName.includes('KEY') 
        ? value.substring(0, 20) + '...' 
        : value;
      console.log(`✅ ${varName}: ${displayValue}`);
    } else {
      console.log(`❌ ${varName}: NOT SET`);
      frontendOk = false;
    }
  });
  
  // Test Supabase connection
  console.log('\n🔌 Supabase Connection Test:');
  console.log('-'.repeat(50));
  
  if (import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) {
    try {
      // Try to create a Supabase client (if available)
      if (window.supabase) {
        console.log('✅ Supabase client available');
      } else {
        console.log('⚠️  Supabase client not found in window (may be normal)');
      }
      
      // Check URL format
      const url = import.meta.env.VITE_SUPABASE_URL;
      if (url.startsWith('https://') && url.includes('.supabase.co')) {
        console.log('✅ Supabase URL format looks correct');
      } else {
        console.log('❌ Supabase URL format looks incorrect');
      }
      
      // Check key format
      const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      if (key && key.length > 20) {
        console.log('✅ Supabase key format looks correct');
      } else {
        console.log('❌ Supabase key format looks incorrect');
      }
    } catch (error) {
      console.log('❌ Error testing Supabase:', error.message);
    }
  } else {
    console.log('❌ Cannot test Supabase connection - variables missing');
  }
  
  // Summary
  console.log('\n📊 Summary:');
  console.log('=' .repeat(50));
  
  if (frontendOk) {
    console.log('✅ All frontend environment variables are set');
  } else {
    console.log('❌ Some frontend environment variables are missing');
    console.log('   → Check Netlify Dashboard → Site settings → Environment variables');
  }
  
  console.log('\n💡 Note: Edge Function secrets cannot be verified from browser.');
  console.log('   Check Supabase Dashboard → Edge Functions → Secrets');
  
  console.log('\n' + '=' .repeat(50));
})();
