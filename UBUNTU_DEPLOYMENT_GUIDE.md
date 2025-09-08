# 🚀 Ubuntu Server Deployment Guide - SPESHWAY HR Portal

This comprehensive guide will walk you through deploying your MERN Stack HR Portal to an Ubuntu server for live production.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Server Setup](#server-setup)
3. [Node.js v22 Installation](#nodejs-v22-installation)
4. [MongoDB Installation & Configuration](#mongodb-installation--configuration)
5. [Application Deployment](#application-deployment)
6. [Environment Configuration](#environment-configuration)
7. [Process Management with PM2](#process-management-with-pm2)
8. [Nginx Reverse Proxy Setup](#nginx-reverse-proxy-setup)
9. [SSL Certificate Setup](#ssl-certificate-setup)
10. [Security Hardening](#security-hardening)
11. [Monitoring & Maintenance](#monitoring--maintenance)
12. [Troubleshooting](#troubleshooting)

## 🔧 Prerequisites

### Required Access
- Ubuntu server (20.04 LTS or 22.04 LTS recommended)
- Root or sudo access to the server
- Domain name pointing to your server (optional but recommended)
- GitHub repository with your application code

### Local Requirements
- SSH client
- Git configured with access to your repository

## 🖥️ Server Setup

### Step 1: Initial Server Configuration

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install essential packages
sudo apt install -y curl wget git unzip software-properties-common apt-transport-https ca-certificates gnupg lsb-release

# Create a new user for the application (optional but recommended)
sudo adduser speshway
sudo usermod -aG sudo speshway

# Switch to the new user
su - speshway
```

### Step 2: Configure Firewall

```bash
# Enable UFW firewall
sudo ufw enable

# Allow SSH, HTTP, and HTTPS
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443

# Allow Node.js application port (if needed for direct access)
sudo ufw allow 10000

# Check firewall status
sudo ufw status
```

## 🟢 Node.js v22 Installation

### Method 1: Using NodeSource Repository (Recommended)

```bash
# Download and import the NodeSource signing key
curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | sudo gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg

# Create deb repository
echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_22.x nodistro main" | sudo tee /etc/apt/sources.list.d/nodesource.list

# Update package list and install Node.js
sudo apt update
sudo apt install -y nodejs

# Verify installation
node --version  # Should show v22.x.x
npm --version
```

### Method 2: Using Node Version Manager (Alternative)

```bash
# Install NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Reload bash profile
source ~/.bashrc

# Install Node.js v22
nvm install 22
nvm use 22
nvm alias default 22

# Verify installation
node --version
npm --version
```

## 🍃 MongoDB Installation & Configuration

### Step 1: Install MongoDB Community Edition

```bash
# Import MongoDB public GPG key
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor

# Create MongoDB list file
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Update package list and install MongoDB
sudo apt update
sudo apt install -y mongodb-org

# Start and enable MongoDB service
sudo systemctl start mongod
sudo systemctl enable mongod

# Verify MongoDB is running
sudo systemctl status mongod
```

### Step 2: Configure MongoDB Security

```bash
# Connect to MongoDB shell
mongosh

# Switch to admin database and create admin user
use admin
db.createUser({
  user: "admin",
  pwd: "your-strong-admin-password",
  roles: ["userAdminAnyDatabase", "dbAdminAnyDatabase", "readWriteAnyDatabase"]
})

# Create application database and user
use hr_portal
db.createUser({
  user: "hr_user",
  pwd: "your-strong-hr-password",
  roles: ["readWrite"]
})

# Exit MongoDB shell
exit
```

### Step 3: Enable MongoDB Authentication

```bash
# Edit MongoDB configuration
sudo nano /etc/mongod.conf

# Add or modify the security section:
# security:
#   authorization: enabled

# Restart MongoDB
sudo systemctl restart mongod
```

## 📦 Application Deployment

### Step 1: Clone Repository

```bash
# Navigate to application directory
cd /home/speshway

# Clone your repository
git clone https://github.com/yourusername/SPESHWAY.git
cd SPESHWAY

# Install dependencies
npm run install:all
```

### Step 2: Build Frontend

```bash
# Build the frontend application
npm run client:build

# Verify build was successful
ls -la frontend/dist/
```

## ⚙️ Environment Configuration

### Step 1: Backend Environment Variables

```bash
# Create backend environment file
cp server/.env.example server/.env
nano server/.env
```

**Configure the following variables:**

```env
# Server Configuration
PORT=10000
NODE_ENV=production

# Database Configuration
MONGODB_URL=mongodb://hr_user:your-strong-hr-password@localhost:27017/hr_portal

# JWT Configuration
JWT_SECRET=your-super-secure-jwt-secret-key-minimum-32-characters-long

# Frontend URL
CLIENT_URL=https://yourdomain.com

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-gmail-app-password
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-gmail-app-password
```

### Step 2: Frontend Environment Variables

```bash
# Create frontend environment file
cp frontend/.env.example frontend/.env
nano frontend/.env
```

**Configure the following:**

```env
# Backend API URL
VITE_API_URL=https://yourdomain.com/api
```

### Step 3: Rebuild Frontend with Environment Variables

```bash
# Rebuild frontend with new environment variables
npm run client:build
```

## 🔄 Process Management with PM2

### Step 1: Install PM2

```bash
# Install PM2 globally
npm install -g pm2

# Verify installation
pm2 --version
```

### Step 2: Create PM2 Configuration

```bash
# Create PM2 ecosystem file
nano ecosystem.config.js
```

**Add the following configuration:**

```javascript
module.exports = {
  apps: [{
    name: 'speshway-hr-portal',
    script: 'server.js',
    cwd: '/home/speshway/SPESHWAY',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 10000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
```

### Step 3: Start Application with PM2

```bash
# Create logs directory
mkdir -p logs

# Start application
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the instructions provided by the command above

# Check application status
pm2 status
pm2 logs
```

## 🌐 Nginx Reverse Proxy Setup

### Step 1: Install Nginx

```bash
# Install Nginx
sudo apt install -y nginx

# Start and enable Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Check Nginx status
sudo systemctl status nginx
```

### Step 2: Configure Nginx

```bash
# Create Nginx configuration for your application
sudo nano /etc/nginx/sites-available/speshway-hr-portal
```

**Add the following configuration:**

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Serve static files (frontend)
    location / {
        root /home/speshway/SPESHWAY/frontend/dist;
        try_files $uri $uri/ /index.html;
        
        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header Referrer-Policy "no-referrer-when-downgrade" always;
        add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    }

    # Proxy API requests to Node.js backend
    location /api {
        proxy_pass http://localhost:10000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Handle uploads
    location /uploads {
        proxy_pass http://localhost:10000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Handle assets
    location /assets {
        proxy_pass http://localhost:10000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript;

    # Client max body size for file uploads
    client_max_body_size 50M;
}
```

### Step 3: Enable Nginx Configuration

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/speshway-hr-portal /etc/nginx/sites-enabled/

# Remove default Nginx site
sudo rm /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

## 🔒 SSL Certificate Setup

### Step 1: Install Certbot

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx
```

### Step 2: Obtain SSL Certificate

```bash
# Get SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Follow the prompts to configure SSL
```

### Step 3: Setup Auto-renewal

```bash
# Test auto-renewal
sudo certbot renew --dry-run

# Setup cron job for auto-renewal
sudo crontab -e

# Add the following line:
# 0 12 * * * /usr/bin/certbot renew --quiet
```

## 🛡️ Security Hardening

### Step 1: Configure SSH Security

```bash
# Edit SSH configuration
sudo nano /etc/ssh/sshd_config

# Recommended settings:
# PermitRootLogin no
# PasswordAuthentication no
# PubkeyAuthentication yes
# Port 2222  # Change default SSH port

# Restart SSH service
sudo systemctl restart sshd
```

### Step 2: Install and Configure Fail2Ban

```bash
# Install Fail2Ban
sudo apt install -y fail2ban

# Create local configuration
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local

# Edit configuration
sudo nano /etc/fail2ban/jail.local

# Enable and start Fail2Ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### Step 3: Setup Log Rotation

```bash
# Create logrotate configuration for application logs
sudo nano /etc/logrotate.d/speshway-hr-portal
```

**Add the following:**

```
/home/speshway/SPESHWAY/logs/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 speshway speshway
    postrotate
        pm2 reloadLogs
    endscript
}
```

## 📊 Monitoring & Maintenance

### Step 1: Setup PM2 Monitoring

```bash
# Install PM2 monitoring
pm2 install pm2-logrotate

# Configure log rotation
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
pm2 set pm2-logrotate:compress true
```

### Step 2: System Monitoring Commands

```bash
# Check application status
pm2 status
pm2 logs --lines 50

# Check system resources
htop
df -h
free -h

# Check Nginx status
sudo systemctl status nginx
sudo nginx -t

# Check MongoDB status
sudo systemctl status mongod
mongosh --eval "db.adminCommand('ismaster')"

# Check SSL certificate
sudo certbot certificates
```

### Step 3: Backup Strategy

```bash
# Create backup script
nano /home/speshway/backup.sh
```

**Add the following:**

```bash
#!/bin/bash

# Backup directory
BACKUP_DIR="/home/speshway/backups"
DATE=$(date +"%Y%m%d_%H%M%S")

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup MongoDB
mongodump --host localhost --port 27017 --db hr_portal --out $BACKUP_DIR/mongodb_$DATE

# Backup application files
tar -czf $BACKUP_DIR/app_$DATE.tar.gz /home/speshway/SPESHWAY

# Backup Nginx configuration
cp -r /etc/nginx/sites-available $BACKUP_DIR/nginx_$DATE

# Remove backups older than 7 days
find $BACKUP_DIR -type f -mtime +7 -delete

echo "Backup completed: $DATE"
```

```bash
# Make script executable
chmod +x /home/speshway/backup.sh

# Setup daily backup cron job
crontab -e

# Add the following line:
# 0 2 * * * /home/speshway/backup.sh >> /home/speshway/backup.log 2>&1
```

## 🔧 Troubleshooting

### Common Issues and Solutions

#### Application Won't Start

```bash
# Check PM2 logs
pm2 logs

# Check if port is in use
sudo netstat -tlnp | grep :10000

# Restart application
pm2 restart speshway-hr-portal
```

#### Database Connection Issues

```bash
# Check MongoDB status
sudo systemctl status mongod

# Check MongoDB logs
sudo tail -f /var/log/mongodb/mongod.log

# Test database connection
mongosh "mongodb://hr_user:password@localhost:27017/hr_portal"
```

#### Nginx Issues

```bash
# Check Nginx configuration
sudo nginx -t

# Check Nginx logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log

# Restart Nginx
sudo systemctl restart nginx
```

#### SSL Certificate Issues

```bash
# Check certificate status
sudo certbot certificates

# Renew certificate manually
sudo certbot renew

# Check certificate expiry
echo | openssl s_client -servername yourdomain.com -connect yourdomain.com:443 2>/dev/null | openssl x509 -noout -dates
```

### Performance Optimization

```bash
# Enable Node.js production optimizations
export NODE_ENV=production

# Optimize PM2 for production
pm2 start ecosystem.config.js --env production

# Enable Nginx caching (add to server block)
# location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
#     expires 1y;
#     add_header Cache-Control "public, immutable";
# }
```

## 🎉 Deployment Complete!

Your SPESHWAY HR Portal is now deployed and running in production on Ubuntu server with:

✅ Node.js v22 runtime
✅ MongoDB database with authentication
✅ PM2 process management
✅ Nginx reverse proxy
✅ SSL certificate
✅ Security hardening
✅ Monitoring and backup strategy

### Next Steps

1. **Test all application features**
2. **Setup monitoring alerts**
3. **Configure regular backups**
4. **Document your specific configuration**
5. **Setup staging environment for testing updates**

### Support

For issues or questions:
- Check the troubleshooting section
- Review application logs: `pm2 logs`
- Check system logs: `sudo journalctl -u nginx -f`
- Monitor system resources: `htop`

---

**Remember to:**
- Keep your system updated: `sudo apt update && sudo apt upgrade`
- Monitor disk space and performance
- Regularly backup your data
- Keep your SSL certificates renewed
- Update your application dependencies periodically