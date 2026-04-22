const http = require('http');

// Test if server is running on port 8000
function testServer() {
  const options = {
    hostname: 'localhost',
    port: 8000,
    path: '/',
    method: 'GET',
    timeout: 2000
  };

  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    res.on('end', () => {
      console.log('✓ Server is running!');
      console.log(`Status: ${res.statusCode}`);
      console.log('Response:', data);
    });
  });

  req.on('error', (error) => {
    console.log('✗ Server not running:', error.message);
  });

  req.end();
}

testServer();
