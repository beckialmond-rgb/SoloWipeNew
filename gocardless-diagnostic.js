// GoCardless Connection Diagnostic Script
// Run this in your browser console (F12) when you get the "No authorization code" error

console.log('=== GOCARDLESS CONNECTION DIAGNOSTIC ===\n');

// 1. Check current URL
console.log('1. CURRENT URL:');
console.log('   Full URL:', window.location.href);
console.log('   Path:', window.location.pathname);
console.log('   Query:', window.location.search);
console.log('   Hash:', window.location.hash);
console.log('');

// 2. Check URL parameters
const urlParams = new URLSearchParams(window.location.search);
const hashParams = new URLSearchParams(window.location.hash.substring(1));
console.log('2. URL PARAMETERS:');
console.log('   Code (query):', urlParams.get('code') || 'MISSING');
console.log('   Code (hash):', hashParams.get('code') || 'MISSING');
console.log('   Error:', urlParams.get('error') || hashParams.get('error') || 'NONE');
console.log('   Error Description:', urlParams.get('error_description') || hashParams.get('error_description') || 'NONE');
console.log('   State:', urlParams.get('state') || hashParams.get('state') || 'MISSING');
console.log('');

// 3. Check localStorage
console.log('3. LOCALSTORAGE DATA:');
const sessionToken = localStorage.getItem('gocardless_session_token');
const userId = localStorage.getItem('gocardless_user_id');
const redirectUrl = localStorage.getItem('gocardless_redirect_url');
const state = localStorage.getItem('gocardless_state');
console.log('   Session Token:', sessionToken ? `${sessionToken.substring(0, 20)}...` : 'MISSING');
console.log('   User ID:', userId || 'MISSING');
console.log('   Redirect URL:', redirectUrl || 'MISSING');
console.log('   State:', state ? `${state.substring(0, 20)}...` : 'MISSING');
console.log('');

// 4. Determine expected redirect URL
const currentHostname = window.location.hostname;
const isProduction = currentHostname === 'solowipe.co.uk' || currentHostname === 'www.solowipe.co.uk';
const expectedRedirectUrl = isProduction 
  ? 'https://solowipe.co.uk/gocardless-callback'
  : `${window.location.origin}/gocardless-callback`;

console.log('4. EXPECTED CONFIGURATION:');
console.log('   Hostname:', currentHostname);
console.log('   Is Production:', isProduction);
console.log('   Expected Redirect URL:', expectedRedirectUrl);
console.log('');

// 5. Check if redirect URL matches
console.log('5. REDIRECT URL VERIFICATION:');
if (redirectUrl) {
  console.log('   Stored Redirect URL:', redirectUrl);
  console.log('   Expected Redirect URL:', expectedRedirectUrl);
  console.log('   Match:', redirectUrl === expectedRedirectUrl ? '✅ YES' : '❌ NO');
  if (redirectUrl !== expectedRedirectUrl) {
    console.log('   ⚠️ MISMATCH DETECTED!');
    console.log('   This could cause the "No authorization code" error.');
  }
} else {
  console.log('   ⚠️ No redirect URL in localStorage');
  console.log('   Using fallback:', expectedRedirectUrl);
}
console.log('');

// 6. Diagnosis
console.log('6. DIAGNOSIS:');
const code = urlParams.get('code') || hashParams.get('code');
const error = urlParams.get('error') || hashParams.get('error');

if (code) {
  console.log('   ✅ Authorization code found in URL');
  console.log('   Code:', code.substring(0, 20) + '...');
} else if (error) {
  console.log('   ❌ GoCardless returned an error:', error);
  console.log('   Error Description:', urlParams.get('error_description') || hashParams.get('error_description') || 'NONE');
} else {
  console.log('   ❌ No authorization code in URL');
  console.log('   Possible causes:');
  console.log('   1. Redirect URI not registered in GoCardless Dashboard');
  console.log('   2. Redirect URI mismatch (must match exactly)');
  console.log('   3. Wrong environment (sandbox vs live)');
  console.log('   4. Authorization was cancelled');
  console.log('');
  console.log('   ⚠️ ACTION REQUIRED:');
  console.log('   1. Go to: https://manage.gocardless.com/settings/api');
  console.log('   2. Find "Redirect URIs" section');
  console.log('   3. Verify this EXACT URL is registered:', expectedRedirectUrl);
  console.log('   4. Check: NO trailing slash, correct protocol (https), correct domain');
  console.log('   5. Make sure environment matches (sandbox Client ID → sandbox URIs, live Client ID → live URIs)');
}
console.log('');

// 7. Recommendations
console.log('7. RECOMMENDATIONS:');
if (!code && !error) {
  console.log('   • Clear localStorage and try again:');
  console.log('     localStorage.removeItem("gocardless_session_token");');
  console.log('     localStorage.removeItem("gocardless_user_id");');
  console.log('     localStorage.removeItem("gocardless_redirect_url");');
  console.log('     localStorage.removeItem("gocardless_state");');
  console.log('   • Go to Settings → GoCardless and click "Connect GoCardless"');
  console.log('   • Verify redirect URI in GoCardless Dashboard');
} else if (error) {
  console.log('   • Check error description above');
  console.log('   • Try connecting again');
} else {
  console.log('   • Code found - connection should proceed');
}
console.log('');

console.log('=== END DIAGNOSTIC ===');

// Export diagnostic function for reuse
window.gocardlessDiagnostic = function() {
  // Re-run the diagnostic
  console.clear();
  eval(this.toString().split('window.gocardlessDiagnostic')[0]);
};

console.log('💡 Tip: Run gocardlessDiagnostic() anytime to re-run this diagnostic');





