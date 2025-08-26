# ✅ Render Deployment Checklist

Use this checklist to ensure a smooth deployment of your HR Portal to Render.

## 📋 Pre-Deployment Setup

### Database Setup
- [ ] MongoDB Atlas account created
- [ ] M0 cluster deployed (free tier)
- [ ] Database user created with strong password
- [ ] Network access configured (0.0.0.0/0)
- [ ] Connection string obtained and tested

### Repository Preparation
- [ ] Code pushed to GitHub
- [ ] `render.yaml` file present in root
- [ ] `server/.env.example` created
- [ ] `frontend/.env.example` created
- [ ] `frontend/public/_redirects` created
- [ ] Server package.json updated with production scripts
- [ ] CORS configuration updated in server/index.js
- [ ] Health check endpoint added to server

### Email Configuration
- [ ] Gmail account ready
- [ ] 2FA enabled on Gmail
- [ ] Gmail App Password generated

## 🚀 Deployment Process

### Render Account Setup
- [ ] Render account created
- [ ] GitHub connected to Render
- [ ] Repository access granted

### Backend Deployment
- [ ] Web Service created for backend
- [ ] Build command: `cd server && npm install`
- [ ] Start command: `cd server && npm start`
- [ ] Environment variables configured:
  - [ ] `NODE_ENV=production`
  - [ ] `PORT=10000`
  - [ ] `MONGODB_URL` (Atlas connection string)
  - [ ] `JWT_SECRET` (32+ characters)
  - [ ] `CLIENT_URL` (will update after frontend)
  - [ ] `SMTP_HOST=smtp.gmail.com`
  - [ ] `SMTP_PORT=587`
  - [ ] `SMTP_USER` (Gmail address)
  - [ ] `SMTP_PASS` (Gmail App Password)
  - [ ] `EMAIL_USER` (Gmail address)
  - [ ] `EMAIL_PASS` (Gmail App Password)
- [ ] Backend service deployed successfully
- [ ] Backend URL noted: `https://______.onrender.com`

### Frontend Deployment
- [ ] Static Site created for frontend
- [ ] Build command: `cd frontend && npm install && npm run build`
- [ ] Publish directory: `frontend/dist`
- [ ] Environment variables configured:
  - [ ] `VITE_API_URL` (backend URL)
- [ ] Frontend service deployed successfully
- [ ] Frontend URL noted: `https://______.onrender.com`

### Final Configuration
- [ ] Backend `CLIENT_URL` updated with frontend URL
- [ ] Backend service redeployed with updated CLIENT_URL

## 🧪 Testing & Verification

### Backend Testing
- [ ] Health check endpoint responds: `/health`
- [ ] API endpoints accessible
- [ ] Database connection working
- [ ] No CORS errors in browser console

### Frontend Testing
- [ ] Application loads without errors
- [ ] Login page displays correctly
- [ ] Static assets load properly
- [ ] Client-side routing works

### Full Application Testing
- [ ] User login/logout works
- [ ] Dashboard loads with data
- [ ] Employee management functions
- [ ] Department management functions
- [ ] Leave management functions
- [ ] Salary/payslip features work
- [ ] Attendance tracking works
- [ ] File uploads work (employee images)
- [ ] Email notifications work (password reset)
- [ ] PDF generation works (payslips)
- [ ] Excel export works (reports)

## 🔧 Post-Deployment

### Initial Setup
- [ ] Admin user created/verified
- [ ] Initial departments created
- [ ] Test employee records created
- [ ] System settings configured

### Documentation
- [ ] URLs documented for team
- [ ] Login credentials shared securely
- [ ] User guide updated (if needed)
- [ ] Deployment notes documented

### Monitoring Setup
- [ ] Render dashboard bookmarked
- [ ] Log monitoring configured
- [ ] Error tracking setup (optional)
- [ ] Performance monitoring noted

## 🚨 Troubleshooting Checklist

If something doesn't work:

### Check Logs
- [ ] Backend service logs reviewed
- [ ] Frontend build logs reviewed
- [ ] Browser console checked for errors

### Verify Configuration
- [ ] All environment variables present
- [ ] No typos in variable names/values
- [ ] URLs match exactly (no trailing slashes)
- [ ] MongoDB connection string correct

### Test Components
- [ ] Database connection tested
- [ ] API endpoints tested individually
- [ ] CORS configuration verified
- [ ] Email configuration tested

## 📊 Performance Checklist

### Free Tier Considerations
- [ ] Cold start behavior understood (~30 seconds)
- [ ] Application performance acceptable
- [ ] Database queries optimized
- [ ] Image sizes optimized

### Optimization (Optional)
- [ ] Keep-alive pings considered
- [ ] CDN usage evaluated
- [ ] Caching strategies implemented
- [ ] Bundle size optimized

## 🎯 Success Criteria

**Deployment is successful when:**
- [ ] Both services show "Live" status in Render
- [ ] Frontend loads without errors
- [ ] Users can log in successfully
- [ ] All major features work as expected
- [ ] No critical errors in logs
- [ ] Performance is acceptable

## 📝 Final Notes

**Frontend URL**: `https://______.onrender.com`  
**Backend URL**: `https://______.onrender.com`  
**Deployment Date**: `______`  
**Deployed By**: `______`  

**Next Steps**:
- [ ] Share URLs with team
- [ ] Schedule regular monitoring
- [ ] Plan for scaling if needed
- [ ] Document any custom configurations

---

**🎉 Deployment Complete!** Your HR Portal is now live on Render!