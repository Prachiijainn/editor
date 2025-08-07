const { spawn } = require('child_process');

console.log('Testing terminal functionality...');

// Test basic command execution
const testCommand = 'echo "Hello from terminal test"';

const process = spawn(testCommand, [], { 
    shell: true,
    stdio: ['pipe', 'pipe', 'pipe']
});

process.stdout.on('data', (data) => {
    console.log('Output:', data.toString());
});

process.stderr.on('data', (data) => {
    console.log('Error:', data.toString());
});

process.on('close', (exitCode) => {
    console.log(`Process completed with exit code: ${exitCode}`);
});

process.on('error', (error) => {
    console.log('Process error:', error.message);
}); 