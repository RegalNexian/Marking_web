// Quick test script to verify server performance
// Run with: node test-server.js

const axios = require('axios');

const API_BASE = process.env.API_URL || 'http://localhost:5000';

async function testEndpoint(name, url, expectedStatus = 200) {
  const start = Date.now();
  try {
    const response = await axios.get(`${API_BASE}${url}`);
    const duration = Date.now() - start;
    
    console.log(`✅ ${name}`);
    console.log(`   Status: ${response.status}`);
    console.log(`   Time: ${duration}ms`);
    console.log(`   Data length: ${JSON.stringify(response.data).length} bytes\n`);
    
    return { success: true, duration };
  } catch (error) {
    const duration = Date.now() - start;
    const status = error.response?.status || 'TIMEOUT';
    
    console.log(`❌ ${name}`);
    console.log(`   Status: ${status}`);
    console.log(`   Time: ${duration}ms`);
    console.log(`   Error: ${error.response?.data?.message || error.message}\n`);
    
    return { success: false, duration, error };
  }
}

async function runTests() {
  console.log('🧪 Testing Server Performance\n');
  console.log(`API Base: ${API_BASE}\n`);
  console.log('=' .repeat(50) + '\n');

  const results = [];

  // Test 1: Health check
  results.push(await testEndpoint('Health Check', '/api/health'));

  // Test 2: Get all tracks
  results.push(await testEndpoint('Get All Tracks', '/api/tracks'));

  // Test 3: Get all juries
  results.push(await testEndpoint('Get All Juries', '/api/juries'));

  // Test 4: Get all teams
  results.push(await testEndpoint('Get All Teams', '/api/teams'));

  // Test 5: Get leaderboard (no trackId - should handle gracefully)
  results.push(await testEndpoint('Get Leaderboard (no track)', '/api/marks/leaderboard'));

  // Test 6: Get status (no trackId)
  results.push(await testEndpoint('Get Status (no track)', '/api/marks/status'));

  // Test 7: Test 404 error
  results.push(await testEndpoint('404 Test', '/api/nonexistent', 404));

  // Test 8: Multiple rapid requests (stress test)
  console.log('🔥 Stress Test: 5 rapid requests to leaderboard\n');
  const stressStart = Date.now();
  const stressPromises = Array(5).fill(null).map(() => 
    axios.get(`${API_BASE}/api/marks/leaderboard`)
  );
  
  try {
    await Promise.all(stressPromises);
    const stressDuration = Date.now() - stressStart;
    console.log(`✅ Stress Test Completed`);
    console.log(`   Total Time: ${stressDuration}ms`);
    console.log(`   Average: ${Math.round(stressDuration / 5)}ms per request\n`);
  } catch (error) {
    console.log(`❌ Stress Test Failed: ${error.message}\n`);
  }

  // Summary
  console.log('=' .repeat(50));
  console.log('\n📊 Test Summary\n');
  
  const successCount = results.filter(r => r.success).length;
  const totalTests = results.length;
  const avgDuration = Math.round(
    results.reduce((sum, r) => sum + r.duration, 0) / results.length
  );

  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${successCount}`);
  console.log(`Failed: ${totalTests - successCount}`);
  console.log(`Average Response Time: ${avgDuration}ms`);
  
  if (avgDuration < 1000) {
    console.log('\n🎉 Performance is GOOD! (< 1s average)');
  } else if (avgDuration < 3000) {
    console.log('\n⚠️  Performance is OK (1-3s average)');
  } else {
    console.log('\n❌ Performance is POOR (> 3s average)');
  }
}

// Run the tests
runTests().catch(console.error);
