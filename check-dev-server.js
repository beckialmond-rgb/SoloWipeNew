// Quick check to see if dev server is accessible
const http = require('http');

console.log('Checking if dev server is running on port 8080...\n');

const req = http.get('http://localhost:8080', (res) => {
  console.log(`✅ Server is responding! Status: ${res.statusCode}`);
  console.log(`✅ Headers:`, res.headers);
  console.log('\n✅ Dev server is working correctly!');
  console.log('\nTo access from mobile:');
  console.log('  1. Make sure mobile is on same WiFi');
  console.log('  2. Go to: http://192.168.4.24:8080');
  process.exit(0);
});

req.on('error', (err) => {
  console.log('❌ Server is NOT responding');
  console.log('Error:', err.message);
  console.log('\nPlease start the dev server:');
  console.log('  npm run dev');
  process.exit(1);
});

req.setTimeout(3000, () => {
  console.log('❌ Connection timeout - server may not be running');
  req.destroy();
  process.exit(1);
});





