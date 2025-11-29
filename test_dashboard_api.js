const http = require('http');
const { spawn } = require('child_process');

function makeRequest(method, path, data) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, body: JSON.parse(body) });
                } catch (e) {
                    resolve({ status: res.statusCode, body: body });
                }
            });
        });

        req.on('error', (e) => reject(e));
        if (data) req.write(JSON.stringify(data));
        req.end();
    });
}

async function testAPI() {
    console.log('Testing Business API...');

    // 1. Create Business
    const newBusiness = {
        name: 'Muscat Burgers',
        phoneNumber: 'whatsapp:+1234567890',
        sheetId: 'test-sheet-id',
        systemInstruction: 'You are a burger expert.'
    };

    console.log('Creating business...');
    const createRes = await makeRequest('POST', '/api/businesses', newBusiness);
    console.log('Create Status:', createRes.status);

    if (createRes.status !== 201) {
        console.error('Failed to create business:', createRes.body);
        return;
    }
    const createdId = createRes.body._id;
    console.log('Created ID:', createdId);

    // 2. List Businesses
    console.log('Listing businesses...');
    const listRes = await makeRequest('GET', '/api/businesses');
    console.log('List Status:', listRes.status);
    console.log('Count:', listRes.body.length);

    // 3. Delete Business
    console.log('Deleting business...');
    const deleteRes = await makeRequest('DELETE', `/api/businesses/${createdId}`);
    console.log('Delete Status:', deleteRes.status);

    console.log('API Test Complete.');
}

async function run() {
    console.log('Starting server...');
    // Use shell: true to avoid issues with path resolution on Windows
    const server = spawn('node', ['index.js'], { stdio: 'pipe', shell: true });

    server.stdout.on('data', (data) => {
        // console.log(`Server: ${data}`);
        if (data.toString().includes('Server running')) {
            console.log('Server started. Running tests...');
            testAPI().then(() => {
                console.log('Stopping server...');
                // On Windows, killing the shell doesn't always kill the child. 
                // But for this test, exiting the process is usually enough if we don't care about cleanup.
                // Or we can use taskkill.
                spawn("taskkill", ["/pid", server.pid, '/f', '/t']);
                process.exit(0);
            });
        }
    });

    server.stderr.on('data', (data) => {
        console.error(`Server Error: ${data}`);
    });
}

run();
