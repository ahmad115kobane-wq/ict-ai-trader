// اختبار API مباشرة
const https = require('https');

const EMAIL = 'a@a.a';
const PASSWORD = '123123';

async function testAPI() {
  console.log('🔐 Step 1: Login...\n');
  
  // Step 1: Login
  const loginData = JSON.stringify({ email: EMAIL, password: PASSWORD });
  
  const loginOptions = {
    hostname: 'ict-ai-trader-production.up.railway.app',
    port: 443,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(loginData)
    }
  };

  const token = await new Promise((resolve, reject) => {
    const req = https.request(loginOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (response.token) {
            console.log('✅ Login successful');
            console.log(`👤 User ID: ${response.user.id}\n`);
            resolve(response.token);
          } else {
            console.log('❌ Login failed:', response);
            reject(new Error('Login failed'));
          }
        } catch (error) {
          reject(error);
        }
      });
    });
    req.on('error', reject);
    req.write(loginData);
    req.end();
  });

  console.log('📥 Step 2: Fetch notifications...\n');

  // Step 2: Fetch notifications
  const notifOptions = {
    hostname: 'ict-ai-trader-production.up.railway.app',
    port: 443,
    path: '/api/system-notifications?limit=50',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  };

  await new Promise((resolve, reject) => {
    const req = https.request(notifOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          console.log('📊 API Response:');
          console.log(JSON.stringify(response, null, 2));
          
          if (response.success && response.notifications) {
            console.log(`\n✅ Found ${response.notifications.length} notifications\n`);
            
            response.notifications.forEach((notif, index) => {
              console.log(`${index + 1}. ${notif.title}`);
              console.log(`   📝 ${notif.message}`);
              console.log(`   🆔 ID: ${notif.id}`);
              console.log(`   📅 Created: ${notif.created_at}`);
              console.log(`   ${notif.read ? '✅ Read' : '🔵 Unread'}\n`);
            });
          } else {
            console.log('\n❌ No notifications or API error');
          }
          
          resolve();
        } catch (error) {
          console.error('❌ Parse error:', error.message);
          reject(error);
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

testAPI().catch(console.error);
