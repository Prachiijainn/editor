# Real-Time Online Code Editor with Terminal

A powerful online code editor with real-time collaboration, integrated terminal, and multi-language support. Features real-time terminal output streaming, PTY (pseudo-terminal) support, and collaborative coding capabilities.

## 🚀 Features

### Real-Time Terminal
- **Live Terminal Output**: Real-time streaming of stdout/stderr from executed commands
- **PTY Support**: Full pseudo-terminal support for interactive applications
- **Multi-User Terminal**: Collaborative terminal sessions across multiple users
- **Process Management**: Ability to stop, interrupt, and manage running processes
- **Terminal Resize**: Dynamic terminal resizing with proper PTY handling

### Code Execution
- **Multi-Language Support**: JavaScript, Python, C, C++
- **Real-Time Output**: Live streaming of compilation and execution results
- **Error Handling**: Comprehensive error reporting and debugging
- **Process Control**: Stop execution, interrupt processes, and manage resources

### Collaboration
- **Real-Time Editing**: Live code synchronization across multiple users
- **Terminal Sharing**: Collaborative terminal sessions
- **User Presence**: See who's connected and their activities
- **Room-Based**: Private rooms for different coding sessions

### File Management
- **Workspace Isolation**: Separate workspaces for each room
- **File Operations**: Read, write, and list files in workspace
- **Persistent Storage**: Files persist during the session

## 🛠️ Installation

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- Git

### Backend Dependencies
The following system dependencies are required for full functionality:

#### Ubuntu/Debian:
```bash
sudo apt-get update
sudo apt-get install -y build-essential python3 python3-pip nodejs npm
```

#### macOS:
```bash
# Install Xcode Command Line Tools
xcode-select --install

# Install Python (if not already installed)
brew install python3
```

#### Windows:
```bash
# Install Visual Studio Build Tools
# Download from: https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2019

# Install Python from: https://www.python.org/downloads/
```

### Installation Steps

1. **Clone the repository**:
```bash
git clone <repository-url>
cd realtime-editor-main
```

2. **Install dependencies**:
```bash
npm install
```

3. **Build the frontend**:
```bash
npm run build
```

4. **Start the server**:
```bash
npm start
```

The application will be available at `http://localhost:3333`

## 🎯 Usage

### Starting a Session
1. Open the application in your browser
2. Enter your username
3. Create or join a room
4. Start coding and using the terminal!

### Using the Terminal
- **Real-time commands**: Type commands and see immediate output
- **Process control**: Use Ctrl+C to interrupt processes
- **File operations**: Use standard Unix commands (ls, cd, cat, etc.)
- **Code execution**: Run your compiled/interpreted code directly

### Code Execution
1. Select your programming language
2. Write your code in the editor
3. Click "Run" to execute
4. See real-time output in the terminal

### Collaboration
- Multiple users can join the same room
- All users see real-time code changes
- Terminal output is shared across all users
- User presence indicators show who's connected

## 🔧 Configuration

### Environment Variables
Create a `.env` file in the root directory:

```env
PORT=3333
REACT_APP_BACKEND_URL=http://localhost:3333
NODE_ENV=development
```

### Server Configuration
The server can be configured in `server.js`:

```javascript
// Terminal configuration
const terminalConfig = {
    cols: 80,
    rows: 24,
    cwd: workspacePath,
    env: process.env
};

// Process timeout (in milliseconds)
const PROCESS_TIMEOUT = 30000;
```

## 🐛 Troubleshooting

### Common Issues

#### Terminal Not Responding
1. **Check WebSocket connection**: Ensure the backend is running
2. **Verify PTY support**: Check if node-pty is properly installed
3. **Check browser console**: Look for WebSocket errors
4. **Restart the server**: Sometimes PTY processes need a fresh start

#### Code Execution Issues
1. **Language support**: Ensure the required runtime is installed
2. **File permissions**: Check workspace directory permissions
3. **Process limits**: Some systems have process limits
4. **Memory issues**: Long-running processes may be killed

#### WebSocket Connection Issues
1. **CORS settings**: Check browser CORS policies
2. **Firewall**: Ensure port 3333 is open
3. **Proxy settings**: Configure proxy if behind corporate firewall
4. **SSL/TLS**: Use HTTPS in production

### Debug Mode
Enable debug logging by setting the environment variable:

```bash
DEBUG=* npm start
```

### Performance Optimization
1. **Limit concurrent processes**: Configure max processes per room
2. **Memory management**: Monitor memory usage
3. **Process cleanup**: Ensure proper cleanup on disconnect
4. **WebSocket optimization**: Use binary transport for large outputs

## 🔒 Security Considerations

### Production Deployment
1. **HTTPS**: Always use HTTPS in production
2. **Authentication**: Implement user authentication
3. **Rate limiting**: Prevent abuse of terminal commands
4. **Process isolation**: Use containers for process isolation
5. **File system security**: Restrict file system access

### Security Best Practices
- Validate all user inputs
- Sanitize terminal commands
- Implement proper session management
- Use secure WebSocket connections
- Monitor for suspicious activities

## 📊 Monitoring

### Health Checks
The server provides health check endpoints:

```bash
# Check server status
curl http://localhost:3333/health

# Check WebSocket connection
curl http://localhost:3333/ws-health
```

### Logging
Server logs include:
- WebSocket connections/disconnections
- Terminal process creation/destruction
- Code execution events
- Error messages and stack traces

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- [node-pty](https://github.com/microsoft/node-pty) for PTY support
- [xterm.js](https://xtermjs.org/) for terminal emulation
- [Socket.IO](https://socket.io/) for real-time communication
- [CodeMirror](https://codemirror.net/) for code editing

## 📞 Support

For issues and questions:
1. Check the troubleshooting section
2. Search existing issues
3. Create a new issue with detailed information
4. Include system information and error logs
