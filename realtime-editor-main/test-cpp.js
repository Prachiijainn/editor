const { spawn } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');

async function testCppCompilation() {
    const workspacePath = path.join(os.tmpdir(), 'cpp-test');
    fs.ensureDirSync(workspacePath);
    
    const testCode = `#include <iostream>
#include <string>

int main() {
    std::cout << "Hello from C++!" << std::endl;
    return 0;
}`;
    
    const filename = 'test.cpp';
    const filePath = path.join(workspacePath, filename);
    
    try {
        // Write test code
        await fs.writeFile(filePath, testCode);
        console.log('Test code written to:', filePath);
        
        // Compile with g++
        console.log('Compiling with g++...');
        const compileProcess = spawn('g++', [filename, '-o', 'test', '-std=c++11'], { 
            cwd: workspacePath,
            stdio: 'pipe'
        });
        
        let compileOutput = '';
        let compileError = '';
        
        compileProcess.stdout.on('data', (data) => {
            compileOutput += data.toString();
        });
        
        compileProcess.stderr.on('data', (data) => {
            compileError += data.toString();
        });
        
        compileProcess.on('close', (code) => {
            if (code === 0) {
                console.log('✅ Compilation successful!');
                console.log('Output:', compileOutput);
                
                // Run the compiled program
                console.log('Running compiled program...');
                const runProcess = spawn('./test', [], { 
                    cwd: workspacePath,
                    stdio: 'pipe'
                });
                
                let runOutput = '';
                let runError = '';
                
                runProcess.stdout.on('data', (data) => {
                    runOutput += data.toString();
                });
                
                runProcess.stderr.on('data', (data) => {
                    runError += data.toString();
                });
                
                runProcess.on('close', (exitCode) => {
                    if (exitCode === 0) {
                        console.log('✅ Program executed successfully!');
                        console.log('Output:', runOutput);
                    } else {
                        console.log('❌ Program execution failed');
                        console.log('Error:', runError);
                    }
                });
            } else {
                console.log('❌ Compilation failed!');
                console.log('Error:', compileError);
            }
        });
        
    } catch (error) {
        console.error('Test failed:', error);
    }
}

// Check if g++ is available
function checkGppAvailability() {
    const { spawn } = require('child_process');
    const gppCheck = spawn('g++', ['--version']);
    
    gppCheck.on('close', (code) => {
        if (code === 0) {
            console.log('✅ g++ is available');
            testCppCompilation();
        } else {
            console.log('❌ g++ is not available. Please install a C++ compiler.');
            console.log('On Windows, you can install MinGW or Visual Studio Build Tools.');
            console.log('On macOS, install Xcode Command Line Tools.');
            console.log('On Ubuntu/Debian: sudo apt-get install build-essential');
        }
    });
    
    gppCheck.on('error', (error) => {
        console.log('❌ g++ is not available:', error.message);
        console.log('Please install a C++ compiler.');
    });
}

console.log('Testing C++ compilation...');
checkGppAvailability(); 