// Run this in your browser console to find the exact redirect URI being sent
// Copy and paste this entire script into your browser console, then press Enter

(function() {
  console.log('=== GO CARDLESS REDIRECT URI DIAGNOSTIC ===');
  console.log('');
  
  const currentHostname = window.location.hostname;
  const currentOrigin = window.location.origin;
  const isProduction = currentHostname === 'solowipe.co.uk' || currentHostname === 'www.solowipe.co.uk';
  
  const redirectUrl = isProduction 
    ? 'https://solowipe.co.uk/gocardless-callback'
    : `${window.location.origin}/gocardless-callback`;
  
  console.log('Current hostname:', currentHostname);
  console.log('Current origin:', currentOrigin);
  console.log('Is production:', isProduction);
  console.log('');
  console.log('🔍 REDIRECT URI THAT WILL BE SENT:');
  console.log('   ', redirectUrl);
  console.log('');
  console.log('📋 VERIFICATION CHECKLIST:');
  console.log('   1. Copy the redirect URI above');
  console.log('   2. Go to GoCardless Dashboard → Settings → API → Redirect URIs');
  console.log('   3. Verify this EXACT URI is registered (character-for-character)');
  console.log('   4. Check for:');
  console.log('      - Trailing slash (should NOT have / at end)');
  console.log('      - Protocol (should be https for production, http for localhost)');
  console.log('      - Domain (should match exactly, no www if not using www)');
  console.log('      - Port (for localhost, must match your dev server port)');
  console.log('');
  console.log('=== END DIAGNOSTIC ===');
  
  return redirectUrl;
})();

