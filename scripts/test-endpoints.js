const http = require('http');

const ENDPOINTS = [
    { path: '/api/stats', method: 'GET' },
    { path: '/api/financial', method: 'GET' },
    { path: '/api/branches', method: 'GET' },
    { path: '/api/projects', method: 'GET' },
    { path: '/api/leads', method: 'GET' },
    { path: '/api/orders', method: 'GET' },
];

async function testEndpoints() {
    console.log("Starting API endpoint connection tests...");
    let passed = 0;

    for (const endpoint of ENDPOINTS) {
        await new Promise((resolve) => {
            const options = {
                hostname: 'localhost',
                port: 3000,
                path: endpoint.path,
                method: endpoint.method,
                headers: {
                    // We spoof a user-agent to bypass secure cookie flags if needed for other tests
                    'User-Agent': 'node-test-script'
                }
            };

            const req = http.request(options, (res) => {
                // Even 400 or 401 means the endpoint exists and is routed correctly by Next.js
                if (res.statusCode === 404) {
                    console.error(`❌ [${endpoint.method}] ${endpoint.path} - FAILED (404 Not Found)`);
                } else {
                    console.log(`✅ [${endpoint.method}] ${endpoint.path} - OK (Status: ${res.statusCode})`);
                    passed++;
                }
                resolve();
            });

            req.on('error', (e) => {
                console.error(`❌ [${endpoint.method}] ${endpoint.path} - FAILED (Network Error: ${e.message})`);
                resolve();
            });

            req.end();
        });
    }

    console.log(`\nTest Summary: ${passed}/${ENDPOINTS.length} endpoints routed successfully.`);
    if (passed !== ENDPOINTS.length) {
        process.exit(1);
    }
}

testEndpoints();
