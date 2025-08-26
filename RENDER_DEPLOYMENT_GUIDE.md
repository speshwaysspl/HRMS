# 🚀 HR Portal Deployment Guide for Render

This comprehensive guide will walk you through deploying your MERN Stack HR Portal to Render, a modern cloud platform that offers free hosting for web applications.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Database Setup](#database-setup)
3. [Repository Preparation](#repository-preparation)
4. [Backend Deployment](#backend-deployment)
5. [Frontend Deployment](#frontend-deployment)
6. [Environment Configuration](#environment-configuration)
7. [Testing & Verification](#testing--verification)
8. [Post-Deployment](#post-deployment)
9. [Troubleshooting](#troubleshooting)

## 🔧 Prerequisites

### Required Accounts
- **GitHub Account** (to host your code)
- **Render Account** (free tier available)
- **MongoDB Atlas Account** (free tier available)
- **Gmail Account** (for email notifications)

### Local Setup
- Git installed and configured
- Node.js (v18 or higher)
- Your HR Portal project ready

## 🍃 Database Setup

### Step 1: Set Up MongoDB Atlas

**Follow the detailed guide**: [MongoDB Atlas Setup](./MONGODB_ATLAS_SETUP.md)

**Quick Summary**:
1. Create MongoDB Atlas account
2. Create a new project and M0 cluster (free)
3. Create database user with strong password
4. Configure network access (allow 0.0.0.0/0)
5. Get connection string

**Your connection string should look like**:
```
mongodb+srv://username:password@cluster.mongodb.net/hr_portal?retryWrites=true&w=majority
```

## 📁 Repository Preparation

### Step 1: Push to GitHub

```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit changes
git commit -m "Prepare for Render deployment"

# Add GitHub remote (replace with your repository URL)
git remote add origin https://github.com/yourusername/hr-portal.git

# Push to GitHub
git push -u origin main
```

### Step 2: Verify Files

Ensure these files are in your repository:
- ✅ `render.yaml` (root directory)
- ✅ `server/.env.example`
- ✅ `frontend/.env.example`
- ✅ `frontend/public/_redirects`
- ✅ Updated `server/package.json` with production scripts
- ✅ Updated `server/index.js` with CORS and health check

## 🖥️ Backend Deployment

### Step 1: Create Render Account

1. Go to [Render.com](https://render.com)
2. Sign up with GitHub (recommended)
3. Authorize Render to access your repositories

### Step 2: Deploy Backend Service

1. **Dashboard**: Click "New +" → "Web Service"
2. **Repository**: Select your HR Portal repository
3. **Configuration**:
   - **Name**: `hr-portal-backend`
   - **Runtime**: `Node`
   - **Build Command**: `cd server && npm install`
   - **Start Command**: `cd server && npm start`
   - **Plan**: `Free`

### Step 3: Configure Environment Variables

In the Render dashboard, go to your backend service → Environment:

```bash
# Required Variables
NODE_ENV=production
PORT=10000
MONGODB_URL=mongodb+srv://username:password@cluster.mongodb.net/hr_portal?retryWrites=true&w=majority
JWT_SECRET=your-super-secure-jwt-secret-minimum-32-characters
CLIENT_URL=https://your-frontend-app.onrender.com

# Email Configuration (Gmail)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-gmail-app-password
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-gmail-app-password
```

**⚠️ Important Notes**:
- Replace `your-frontend-app` with your actual frontend service name
- Use Gmail App Password, not your regular password
- Generate a strong JWT secret (32+ characters)

### Step 4: Deploy Backend

1. Click "Create Web Service"
2. Wait for deployment (5-10 minutes)
3. Note your backend URL: `https://hr-portal-backend-xxx.onrender.com`

## 🌐 Frontend Deployment

### Step 1: Deploy Frontend Service

1. **Dashboard**: Click "New +" → "Static Site"
2. **Repository**: Select your HR Portal repository
3. **Configuration**:
   - **Name**: `hr-portal-frontend`
   - **Build Command**: `cd frontend && npm install && npm run build`
   - **Publish Directory**: `frontend/dist`

### Step 2: Configure Frontend Environment

In the Render dashboard, go to your frontend service → Environment:

```bash
VITE_API_URL=https://your-backend-service-url.onrender.com
```

**Replace** `your-backend-service-url` with your actual backend URL from Step 4 above.

### Step 3: Deploy Frontend

1. Click "Create Static Site"
2. Wait for deployment (3-5 minutes)
3. Note your frontend URL: `https://hr-portal-frontend-xxx.onrender.com`

## 🔧 Environment Configuration

### Step 1: Update Backend CLIENT_URL

1. Go to your backend service in Render
2. Navigate to Environment variables
3. Update `CLIENT_URL` with your frontend URL:
   ```bash
   CLIENT_URL=https://hr-portal-frontend-xxx.onrender.com
   ```
4. Save and redeploy

### Step 2: Gmail App Password Setup

1. **Enable 2FA** on your Gmail account
2. Go to **Google Account Settings** → **Security**
3. Click **App passwords**
4. Generate password for "Mail"
5. Use this password in `SMTP_PASS` and `EMAIL_PASS`

## ✅ Testing & Verification

### Step 1: Backend Health Check

Visit: `https://your-backend-url.onrender.com/health`

Expected response:
```json
{
  "status": "OK",
  "message": "Server is running"
}
```

### Step 2: Frontend Access

Visit: `https://your-frontend-url.onrender.com`

You should see the HR Portal login page.

### Step 3: Full Application Test

1. **Login**: Try logging in with existing credentials
2. **Database**: Check if data loads correctly
3. **API**: Test creating/updating records
4. **Email**: Test password reset functionality
5. **File Upload**: Test employee image uploads

## 🔄 Post-Deployment

### Step 1: Create Admin User (if needed)

If you need to create an initial admin user, you can:

1. **Option A**: Use your existing seed script
2. **Option B**: Create via MongoDB Atlas interface
3. **Option C**: Temporarily add a registration endpoint

### Step 2: Configure Custom Domain (Optional)

1. **Render Pro Plan** required for custom domains
2. Go to service settings → Custom Domains
3. Add your domain and configure DNS

### Step 3: Monitor Application

- **Logs**: Check Render dashboard for application logs
- **Performance**: Monitor response times
- **Errors**: Set up error tracking if needed

## 🐛 Troubleshooting

### Common Issues

#### 1. Build Failures

**Backend Build Fails**:
```bash
# Check logs for:
- Missing dependencies
- Node version compatibility
- Environment variable issues
```

**Frontend Build Fails**:
```bash
# Common causes:
- Missing VITE_API_URL
- Build command incorrect
- Dependency conflicts
```

#### 2. Runtime Errors

**Database Connection Issues**:
- Verify MongoDB Atlas connection string
- Check network access settings (0.0.0.0/0)
- Ensure database user has correct permissions

**CORS Errors**:
- Verify `CLIENT_URL` matches frontend URL exactly
- Check for trailing slashes
- Ensure both services are deployed

**Email Not Working**:
- Use Gmail App Password, not regular password
- Verify SMTP settings
- Check Gmail security settings

#### 3. Performance Issues

**Slow Cold Starts**:
- Render free tier has cold starts (~30 seconds)
- Consider upgrading to paid plan for production
- Implement keep-alive pings if needed

### Debug Steps

1. **Check Logs**:
   - Render Dashboard → Service → Logs
   - Look for error messages and stack traces

2. **Test Endpoints**:
   ```bash
   # Test backend health
   curl https://your-backend-url.onrender.com/health
   
   # Test API endpoint
   curl https://your-backend-url.onrender.com/api/auth/verify
   ```

3. **Environment Variables**:
   - Verify all required variables are set
   - Check for typos in variable names
   - Ensure no extra spaces or quotes

## 📊 Monitoring & Maintenance

### Regular Tasks

1. **Monitor Logs**: Check for errors weekly
2. **Database Backup**: MongoDB Atlas handles this automatically
3. **Security Updates**: Update dependencies monthly
4. **Performance**: Monitor response times

### Scaling Considerations

- **Free Tier Limits**: 750 hours/month, cold starts
- **Paid Plans**: Better performance, no cold starts
- **Database**: Upgrade MongoDB Atlas as data grows

## 🎉 Success Checklist

- [ ] MongoDB Atlas cluster created and configured
- [ ] Repository pushed to GitHub
- [ ] Backend service deployed on Render
- [ ] Frontend static site deployed on Render
- [ ] All environment variables configured
- [ ] Backend health check responds
- [ ] Frontend loads correctly
- [ ] Login functionality works
- [ ] Database operations work
- [ ] Email notifications work
- [ ] File uploads work

## 📞 Support Resources

- **Render Documentation**: [docs.render.com](https://docs.render.com)
- **Render Community**: [community.render.com](https://community.render.com)
- **MongoDB Atlas Support**: [support.mongodb.com](https://support.mongodb.com)
- **GitHub Issues**: Create issues in your repository

---

**🎊 Congratulations!** Your HR Portal is now live on Render!

**Frontend URL**: `https://your-frontend-app.onrender.com`  
**Backend URL**: `https://your-backend-app.onrender.com`

Share these URLs with your team and start managing your HR operations in the cloud! 🚀