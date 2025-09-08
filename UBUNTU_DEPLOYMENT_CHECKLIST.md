# 🚀 Ubuntu Deployment Checklist - SPESHWAY HR Portal

Use this checklist to ensure you complete all deployment steps correctly.

## 📋 Pre-Deployment Checklist

### Server Preparation
- [ ] Ubuntu server (20.04 LTS or 22.04 LTS) ready
- [ ] Root/sudo access confirmed
- [ ] Domain name configured (optional)
- [ ] SSH access working
- [ ] Firewall configured (ports 22, 80, 443, 10000)

### Local Preparation
- [ ] Application code pushed to GitHub
- [ ] Environment variables documented
- [ ] Database schema and seed data ready
- [ ] SSL certificate requirements understood

## 🔧 Installation Checklist

### System Updates
- [ ] `sudo apt update && sudo apt upgrade -y`
- [ ] Essential packages installed
- [ ] New user created (optional): `sudo adduser speshway`

### Node.js v22 Installation
- [ ] NodeSource repository added
- [ ] Node.js v22 installed
- [ ] Version verified: `node --version` (should show v22.x.x)
- [ ] npm working: `npm --version`

### MongoDB Installation
- [ ] MongoDB 7.0 repository added
- [ ] MongoDB installed and started
- [ ] Admin user created
- [ ] Application database and user created
- [ ] Authentication enabled
- [ ] MongoDB service enabled for auto-start

### Application Deployment
- [ ] Repository cloned to `/home/speshway/SPESHWAY`
- [ ] Dependencies installed: `npm run install:all`
- [ ] Frontend built: `npm run client:build`
- [ ] Build artifacts verified in `frontend/dist/`

## ⚙️ Configuration Checklist

### Backend Environment (.env)
- [ ] `PORT=10000`
- [ ] `NODE_ENV=production`
- [ ] `MONGODB_URL` configured with credentials
- [ ] `JWT_SECRET` set (32+ characters)
- [ ] `CLIENT_URL` set to domain
- [ ] Email SMTP settings configured
- [ ] Environment file secured (600 permissions)

### Frontend Environment
- [ ] `VITE_API_URL` set to backend URL
- [ ] Frontend rebuilt after env changes

### PM2 Process Management
- [ ] PM2 installed globally
- [ ] `ecosystem.config.js` created
- [ ] Application started with PM2
- [ ] PM2 configuration saved
- [ ] PM2 startup script configured
- [ ] Application status verified: `pm2 status`

## 🌐 Web Server Checklist

### Nginx Installation
- [ ] Nginx installed
- [ ] Nginx started and enabled
- [ ] Default site removed

### Nginx Configuration
- [ ] Site configuration created in `/etc/nginx/sites-available/`
- [ ] Static file serving configured
- [ ] API proxy configured
- [ ] Upload handling configured
- [ ] Security headers added
- [ ] Gzip compression enabled
- [ ] Site enabled in `/etc/nginx/sites-enabled/`
- [ ] Configuration tested: `sudo nginx -t`
- [ ] Nginx reloaded

### SSL Certificate
- [ ] Certbot installed
- [ ] SSL certificate obtained
- [ ] HTTPS redirect configured
- [ ] Auto-renewal tested: `sudo certbot renew --dry-run`
- [ ] Cron job for renewal setup

## 🛡️ Security Checklist

### SSH Security
- [ ] SSH key authentication enabled
- [ ] Password authentication disabled
- [ ] Root login disabled
- [ ] SSH port changed (optional)
- [ ] SSH service restarted

### Firewall & Protection
- [ ] UFW firewall enabled
- [ ] Required ports allowed (22/2222, 80, 443)
- [ ] Fail2Ban installed and configured
- [ ] Fail2Ban started and enabled

### Application Security
- [ ] Database authentication enabled
- [ ] Strong passwords used
- [ ] Environment variables secured
- [ ] File permissions set correctly
- [ ] Log rotation configured

## 📊 Monitoring & Maintenance Checklist

### Logging
- [ ] PM2 logs working: `pm2 logs`
- [ ] Nginx logs accessible
- [ ] MongoDB logs accessible
- [ ] Log rotation configured

### Backup Strategy
- [ ] Backup script created
- [ ] Database backup tested
- [ ] Application files backup tested
- [ ] Automated backup scheduled
- [ ] Backup retention policy set

### Monitoring Setup
- [ ] PM2 monitoring configured
- [ ] System resource monitoring setup
- [ ] SSL certificate expiry monitoring
- [ ] Disk space monitoring

## 🧪 Testing Checklist

### Application Testing
- [ ] Application accessible via domain/IP
- [ ] Frontend loads correctly
- [ ] API endpoints responding
- [ ] Database connections working
- [ ] User authentication working
- [ ] File uploads working
- [ ] Email notifications working

### Performance Testing
- [ ] Page load times acceptable
- [ ] API response times good
- [ ] Database queries optimized
- [ ] Static files served efficiently
- [ ] Gzip compression working

### Security Testing
- [ ] HTTPS working correctly
- [ ] HTTP redirects to HTTPS
- [ ] Security headers present
- [ ] No sensitive data exposed
- [ ] Authentication required for protected routes

## 🚀 Go-Live Checklist

### Final Verification
- [ ] All application features tested
- [ ] Performance benchmarks met
- [ ] Security scan completed
- [ ] Backup and recovery tested
- [ ] Monitoring alerts configured

### Documentation
- [ ] Deployment process documented
- [ ] Environment variables documented
- [ ] Backup procedures documented
- [ ] Troubleshooting guide available
- [ ] Contact information updated

### Post-Deployment
- [ ] DNS propagation verified
- [ ] Search engine indexing configured
- [ ] Analytics setup (if required)
- [ ] User training completed
- [ ] Support procedures established

## 🔧 Common Commands Reference

### Application Management
```bash
# Check application status
pm2 status
pm2 logs
pm2 restart speshway-hr-portal

# Update application
cd /home/speshway/SPESHWAY
git pull origin main
npm run client:build
pm2 restart speshway-hr-portal
```

### System Monitoring
```bash
# Check system resources
htop
df -h
free -h

# Check services
sudo systemctl status nginx
sudo systemctl status mongod
pm2 status
```

### Troubleshooting
```bash
# Check logs
pm2 logs --lines 50
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/mongodb/mongod.log

# Test configurations
sudo nginx -t
mongosh --eval "db.adminCommand('ismaster')"
```

## 📞 Emergency Contacts

- **System Administrator**: [Your Contact]
- **Database Administrator**: [Your Contact]
- **Application Developer**: [Your Contact]
- **Domain/DNS Provider**: [Provider Contact]
- **SSL Certificate Provider**: [Provider Contact]

---

## ✅ Deployment Status

**Deployment Date**: ___________
**Deployed By**: ___________
**Version**: ___________
**Domain**: ___________
**Server IP**: ___________

**Sign-off**:
- [ ] Technical Lead: ___________
- [ ] System Administrator: ___________
- [ ] Project Manager: ___________

---

*Keep this checklist for future deployments and updates!*