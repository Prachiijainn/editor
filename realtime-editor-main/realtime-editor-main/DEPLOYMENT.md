# 🚀 Deploy to Render - Step by Step Guide

## 📋 Prerequisites
- GitHub account
- Render account (free at render.com)

## 🔧 Step 1: Prepare Your Repository

### 1.1 Push to GitHub
```bash
# Initialize git if not already done
git init
git add .
git commit -m "Initial commit for deployment"

# Create a new repository on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git branch -M main
git push -u origin main
```

### 1.2 Verify Files
Make sure these files are in your repository:
- ✅ `package.json` (with proper scripts)
- ✅ `server-deploy.js` (deployment-ready server)
- ✅ `render.yaml` (Render configuration)
- ✅ `.gitignore` (proper exclusions)
- ✅ `build/` folder (will be created by build process)

## 🌐 Step 2: Deploy on Render

### 2.1 Create Render Account
1. Go to [render.com](https://render.com)
2. Sign up with your GitHub account
3. Verify your email

### 2.2 Create New Web Service
1. Click **"New +"** button
2. Select **"Web Service"**
3. Connect your GitHub repository
4. Select your repository

### 2.3 Configure the Service

**Basic Settings:**
- **Name**: `realtime-editor` (or your preferred name)
- **Environment**: `Node`
- **Region**: Choose closest to your users
- **Branch**: `main`

**Build & Deploy Settings:**
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`

**Environment Variables:**
- `NODE_ENV`: `production`
- `PORT`: `10000`

### 2.4 Advanced Settings (Optional)
- **Auto-Deploy**: Enable for automatic deployments
- **Health Check Path**: `/` (default)
- **Health Check Timeout**: `180` seconds

## 🔍 Step 3: Verify Deployment

### 3.1 Check Build Logs
1. Go to your service dashboard
2. Click on the latest deployment
3. Check build logs for any errors

### 3.2 Test Your Application
1. Click on your service URL
2. Test the following features:
   - ✅ Code editor loads
   - ✅ Real-time collaboration works
   - ✅ Code execution works
   - ✅ Terminal functionality (if available)

## 🛠️ Troubleshooting

### Common Issues:

#### 1. Build Fails
**Error**: `Module not found: node-pty`
**Solution**: The deployment server doesn't use node-pty, so this should not occur.

#### 2. Port Issues
**Error**: `EADDRINUSE`
**Solution**: Make sure PORT environment variable is set to `10000`

#### 3. Socket.IO Connection Issues
**Error**: WebSocket connection fails
**Solution**: 
- Check CORS settings in server-deploy.js
- Verify Render allows WebSocket connections
- Check browser console for errors

#### 4. Code Execution Not Working
**Error**: Language runtimes not available
**Solution**: 
- Render provides Node.js by default
- Python 3 should be available
- C/C++ compilation may require additional setup

### Debug Steps:
1. **Check Logs**: Go to your service → Logs
2. **Test Locally**: Run `npm start` locally first
3. **Check Environment**: Verify all environment variables are set
4. **Test Incrementally**: Test each feature one by one

## 🔧 Customization

### Environment Variables
You can add these to your Render service:

```bash
NODE_ENV=production
PORT=10000
REACT_APP_BACKEND_URL=https://your-app-name.onrender.com
```

### Custom Domain (Optional)
1. Go to your service settings
2. Click "Custom Domains"
3. Add your domain
4. Update DNS settings

## 📊 Monitoring

### Render Dashboard
- **Uptime**: Monitor service availability
- **Logs**: Check for errors
- **Metrics**: CPU, memory usage
- **Deployments**: Track deployment history

### Health Checks
Your app should respond to:
- `GET /` - Main application
- `GET /health` - Health check endpoint

## 💰 Cost Optimization

### Free Tier Limits
- **750 hours/month** (enough for 24/7 operation)
- **512 MB RAM** (sufficient for this app)
- **Shared CPU** (adequate for development)

### Tips to Stay Free
1. **Auto-sleep**: Enable for non-production apps
2. **Monitor usage**: Check Render dashboard regularly
3. **Optimize builds**: Minimize build time
4. **Clean up**: Remove unused services

## 🔄 Continuous Deployment

### Automatic Deployments
1. Enable auto-deploy in Render
2. Push changes to main branch
3. Render automatically rebuilds and deploys

### Manual Deployments
1. Go to your service dashboard
2. Click "Manual Deploy"
3. Select branch/commit
4. Click "Deploy"

## 🚀 Production Checklist

Before going live:
- [ ] All features tested
- [ ] Environment variables set
- [ ] Custom domain configured (if needed)
- [ ] SSL certificate enabled
- [ ] Monitoring set up
- [ ] Error logging configured
- [ ] Performance optimized

## 📞 Support

### Render Support
- **Documentation**: [render.com/docs](https://render.com/docs)
- **Community**: [render.com/community](https://render.com/community)
- **Status**: [status.render.com](https://status.render.com)

### Common Commands
```bash
# Check deployment status
curl https://your-app-name.onrender.com

# Test WebSocket connection
wscat -c wss://your-app-name.onrender.com

# Check logs
# (via Render dashboard)
```

## 🎉 Success!

Once deployed, your app will be available at:
`https://your-app-name.onrender.com`

Share this URL with others to collaborate in real-time! 🚀 