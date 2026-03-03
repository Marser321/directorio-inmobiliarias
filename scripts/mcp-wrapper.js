const { spawn } = require('child_process');

const args = process.argv.slice(2);
const child = spawn(args[0], args.slice(1), {
    stdio: ['inherit', 'pipe', 'inherit'],
    env: process.env
});

child.stdout.on('data', (data) => {
    const lines = data.toString().split('\n');
    lines.forEach(line => {
        if (line.trim() === '') return;
        try {
            // Check if it's a valid JSON-RPC message
            JSON.parse(line);
            process.stdout.write(line + '\n');
        } catch (e) {
            // Not JSON, redirect to stderr
            process.stderr.write(line + '\n');
        }
    });
});

child.on('exit', (code) => {
    process.exit(code);
});
