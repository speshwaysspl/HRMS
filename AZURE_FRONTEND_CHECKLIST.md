# ☁️ Azure Frontend Deployment Checklist - SPESHWAY HR Portal

Use this checklist to ensure successful deployment of your React frontend to Azure Linux VM.

## 📋 Pre-Deployment Checklist

### Azure Account Setup
- [ ] Azure subscription active and accessible
- [ ] Resource group created: `speshway-frontend-rg`
- [ ] Budget alerts configured (optional)
- [ ] Access permissions verified

### Local Preparation
- [ ] SSH key pair generated
- [ ] GitHub repository accessible
- [ ] Domain name ready (if using custom domain)
- [ ] Backend API URL documented

## ☁️ Azure VM Creation

### VM Configuration
- [ ] Virtual Machine created: `speshway-frontend-vm`
- [ ] Image: Ubuntu Server 22.04 LTS - x64 Gen2
- [ ] Size: Standard_B1s (basic) or Standard_B2s (recommended)
- [ ] Authentication: SSH public key
- [ ] Username: `azureuser`
- [ ] SSH key downloaded and secured

### Networking Setup
- [ ] Virtual network created: `speshway-frontend-vnet`
- [ ] Public IP assigned: `speshway-frontend-ip`
- [ ] Network Security Group configured
- [ ] Inbound rules: SSH (22), HTTP (80), HTTPS (443)
- [ ] SSH connection tested

## 🐧 Linux Server Setup

### Initial Configuration
- [ ] System packages updated: `sudo apt update && sudo apt upgrade -y`
- [ ] Essential packages installed
- [ ] Timezone configured
- [ ] UFW firewall enabled
- [ ] Firewall rules configured (SSH, HTTP, HTTPS)

### User Management
- [ ] Application user created: `speshway`
- [ ] User added to sudo group
- [ ] SSH access configured for new user
- [ ] Switched to application user

## 🟢 Node.js Installation

### Node.js v22 Setup
- [ ] NodeSource repository added
- [ ] Node.js v22 installed
- [ ] Version verified: `node --version`
- [ ] npm working: `npm --version`
- [ ] PM2 installed globally (optional)

## 📦 Application Deployment

### Repository Setup
- [ ] Repository cloned to `/home/speshway/SPESHWAY`
- [ ] Frontend directory accessible
- [ ] Dependencies installed: `npm install`

### Environment Configuration
- [ ] `.env` file created from `.env.example`
- [ ] `VITE_API_URL` configured correctly
- [ ] Backend API URL verified

### Build Process
- [ ] Production build completed: `npm run build`
- [ ] Build output verified in `dist/` folder
- [ ] Build size checked
- [ ] No build errors or warnings

### File Deployment
- [ ] Web root directory created: `/var/www/speshway-frontend`
- [ ] Built files copied to web root
- [ ] File ownership set: `www-data:www-data`
- [ ] File permissions set: `755`

## 🌐 Nginx Web Server

### Installation
- [ ] Nginx installed
- [ ] Nginx started and enabled
- [ ] Default site removed
- [ ] Service status verified

### Configuration
- [ ] Site configuration created: `/etc/nginx/sites-available/speshway-frontend`
- [ ] React Router (SPA) routing configured
- [ ] Static file caching configured
- [ ] API proxy configured (if backend on same server)
- [ ] Security headers added
- [ ] Gzip compression enabled
- [ ] Configuration syntax tested: `sudo nginx -t`
- [ ] Site enabled in `sites-enabled`
- [ ] Nginx reloaded

### Testing
- [ ] HTTP access working: `curl http://localhost`
- [ ] Frontend loads correctly
- [ ] Static assets loading
- [ ] React routing working

## 🔒 Domain and SSL Setup

### Domain Configuration
- [ ] VM public IP obtained
- [ ] DNS A record configured
- [ ] DNS propagation verified
- [ ] Domain pointing to VM

### SSL Certificate
- [ ] Certbot installed
- [ ] SSL certificate obtained for domain
- [ ] HTTPS redirect configured
- [ ] Certificate auto-renewal tested
- [ ] Renewal cron job/timer setup
- [ ] SSL grade verified (A+ recommended)

## 🛡️ Security Configuration

### SSH Security
- [ ] SSH port changed (optional): `2222`
- [ ] Root login disabled
- [ ] Password authentication disabled
- [ ] Key-only authentication enabled
- [ ] SSH service restarted
- [ ] Firewall updated for new SSH port

### System Security
- [ ] Fail2Ban installed and configured
- [ ] Fail2Ban enabled and started
- [ ] Unattended upgrades configured
- [ ] Log rotation setup
- [ ] File permissions secured

### Azure Security
- [ ] Network Security Group rules reviewed
- [ ] Unnecessary ports closed
- [ ] Azure Security Center recommendations reviewed
- [ ] VM disk encryption enabled (optional)

## 📊 Monitoring Setup

### Log Monitoring
- [ ] Log monitoring script created
- [ ] Nginx access logs accessible
- [ ] Nginx error logs accessible
- [ ] System logs accessible
- [ ] Log rotation configured

### Performance Monitoring
- [ ] Performance monitoring script created
- [ ] System resource monitoring setup
- [ ] Nginx status monitoring
- [ ] Azure VM metrics configured

### Backup Strategy
- [ ] Backup script created
- [ ] Web files backup tested
- [ ] Nginx configuration backup tested
- [ ] SSL certificates backup tested
- [ ] Automated backup scheduled
- [ ] Backup retention policy set

## 🧪 Testing and Validation

### Functionality Testing
- [ ] Frontend loads via domain
- [ ] All pages accessible
- [ ] Navigation working
- [ ] Static assets loading
- [ ] API calls working (if applicable)
- [ ] Forms submitting correctly
- [ ] Responsive design working

### Performance Testing
- [ ] Page load times acceptable (<3 seconds)
- [ ] Lighthouse score good (>90)
- [ ] Gzip compression working
- [ ] Static file caching working
- [ ] CDN integration (if applicable)

### Security Testing
- [ ] HTTPS working correctly
- [ ] HTTP redirects to HTTPS
- [ ] Security headers present
- [ ] SSL Labs grade A or A+
- [ ] No mixed content warnings
- [ ] XSS protection working

## 🚀 Go-Live Checklist

### Final Verification
- [ ] All features tested and working
- [ ] Performance benchmarks met
- [ ] Security scan completed
- [ ] Backup and recovery tested
- [ ] Monitoring alerts configured
- [ ] Documentation updated

### Azure Specific
- [ ] VM auto-shutdown configured (if needed)
- [ ] Azure Backup configured
- [ ] Cost monitoring setup
- [ ] Resource tags applied
- [ ] Azure Monitor alerts configured

### Post-Deployment
- [ ] DNS propagation complete
- [ ] Search engine indexing configured
- [ ] Analytics setup (Google Analytics, etc.)
- [ ] User acceptance testing completed
- [ ] Support procedures documented

## 🔧 Maintenance Commands

### Daily Operations
```bash
# Check system status
sudo systemctl status nginx
df -h
free -h

# Monitor logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Check SSL certificate
sudo certbot certificates
```

### Application Updates
```bash
# Update application
cd /home/speshway/SPESHWAY
git pull origin main
cd frontend
npm run build
sudo cp -r dist/* /var/www/speshway-frontend/
```

### System Maintenance
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Restart services if needed
sudo systemctl restart nginx

# Check security
sudo fail2ban-client status
```

## 📞 Emergency Procedures

### Service Down
1. Check Nginx status: `sudo systemctl status nginx`
2. Check error logs: `sudo tail -f /var/log/nginx/error.log`
3. Restart Nginx: `sudo systemctl restart nginx`
4. Check VM status in Azure Portal
5. Verify DNS resolution

### High CPU/Memory Usage
1. Check processes: `htop`
2. Check disk space: `df -h`
3. Review access logs for traffic spikes
4. Scale VM size if needed (Azure Portal)

### SSL Certificate Expiry
1. Check certificate status: `sudo certbot certificates`
2. Renew manually: `sudo certbot renew`
3. Restart Nginx: `sudo systemctl restart nginx`
4. Verify certificate: `openssl s_client -connect domain.com:443`

## 📋 Contact Information

**Technical Contacts:**
- System Administrator: ________________
- Frontend Developer: ________________
- Azure Administrator: ________________

**Service Providers:**
- Domain Registrar: ________________
- Azure Support: ________________
- SSL Certificate Provider: Let's Encrypt (Free)

## ✅ Deployment Sign-off

**Deployment Details:**
- Deployment Date: ________________
- Deployed By: ________________
- Frontend Version: ________________
- Domain: ________________
- Azure VM: ________________
- Public IP: ________________

**Verification:**
- [ ] Technical Lead Approval: ________________
- [ ] System Administrator Approval: ________________
- [ ] Project Manager Approval: ________________

**Notes:**
_________________________________________________
_________________________________________________
_________________________________________________

---

## 🔗 Quick Links

- **Azure Portal**: [portal.azure.com](https://portal.azure.com)
- **VM SSH**: `ssh -i key.pem azureuser@<VM_IP>`
- **Application URL**: `https://your-domain.com`
- **Nginx Config**: `/etc/nginx/sites-available/speshway-frontend`
- **Web Root**: `/var/www/speshway-frontend`
- **Application Source**: `/home/speshway/SPESHWAY`

---

*Keep this checklist for future deployments and reference!*