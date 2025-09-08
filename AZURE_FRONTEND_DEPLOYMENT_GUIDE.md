# 🚀 Azure Linux Frontend Deployment Guide - SPESHWAY HR Portal

This guide covers deploying the React frontend of your SPESHWAY HR Portal to an Azure Linux Virtual Machine for live production.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Azure VM Setup](#azure-vm-setup)
3. [Linux Server Configuration](#linux-server-configuration)
4. [Node.js Installation](#nodejs-installation)
5. [Frontend Application Deployment](#frontend-application-deployment)
6. [Nginx Web Server Setup](#nginx-web-server-setup)
7. [Domain and SSL Configuration](#domain-and-ssl-configuration)
8. [Azure Networking Configuration](#azure-networking-configuration)
9. [Security Configuration](#security-configuration)
10. [Monitoring and Maintenance](#monitoring-and-maintenance)
11. [Troubleshooting](#troubleshooting)

## 🔧 Prerequisites

### Required Accounts & Access
- **Azure Account** with active subscription
- **GitHub Account** with repository access
- **Domain registrar access** (for custom domain)
- **SSH client** (PuTTY, Terminal, etc.)

### Local Requirements
- Git configured
- SSH key pair generated
- Basic Linux command knowledge

## ☁️ Azure VM Setup

### Step 1: Create Azure Virtual Machine

1. **Login to Azure Portal**
   - Go to [portal.azure.com](https://portal.azure.com)
   - Sign in with your Azure account

2. **Create Virtual Machine**
   ```
   Azure Portal → Virtual Machines → Create → Azure Virtual Machine
   ```

3. **Basic Configuration**
   ```
   Subscription: [Your Subscription]
   Resource Group: Create new → "speshway-frontend-rg"
   Virtual Machine Name: "speshway-frontend-vm"
   Region: [Choose closest to your users]
   Availability Options: No infrastructure redundancy required
   Security Type: Standard
   Image: Ubuntu Server 22.04 LTS - x64 Gen2
   VM Architecture: x64
   Size: Standard_B1s (1 vcpu, 1 GiB memory) - for basic frontend
          Standard_B2s (2 vcpu, 4 GiB memory) - recommended
   ```

4. **Administrator Account**
   ```
   Authentication Type: SSH public key
   Username: azureuser
   SSH Public Key Source: Generate new key pair
   Key Pair Name: speshway-frontend-key
   ```

5. **Inbound Port Rules**
   ```
   Public Inbound Ports: Allow selected ports
   Select Inbound Ports: SSH (22), HTTP (80), HTTPS (443)
   ```

6. **Disks Configuration**
   ```
   OS Disk Type: Standard SSD (locally redundant storage)
   Encryption Type: Default
   ```

7. **Networking Configuration**
   ```
   Virtual Network: Create new → "speshway-frontend-vnet"
   Subnet: default (10.0.0.0/24)
   Public IP: Create new → "speshway-frontend-ip"
   NIC Network Security Group: Basic
   Public Inbound Ports: SSH, HTTP, HTTPS
   ```

8. **Review and Create**
   - Review all settings
   - Click "Create"
   - Download the private key when prompted

### Step 2: Configure SSH Access

```bash
# Set correct permissions for private key (Linux/Mac)
chmod 600 ~/Downloads/speshway-frontend-key.pem

# Connect to VM
ssh -i ~/Downloads/speshway-frontend-key.pem azureuser@<VM_PUBLIC_IP>

# For Windows users with PuTTY:
# 1. Convert .pem to .ppk using PuTTYgen
# 2. Use the .ppk file in PuTTY for authentication
```

## 🐧 Linux Server Configuration

### Step 1: Initial System Setup

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install essential packages
sudo apt install -y curl wget git unzip software-properties-common \
    apt-transport-https ca-certificates gnupg lsb-release build-essential

# Set timezone (optional)
sudo timedatectl set-timezone UTC

# Check system info
uname -a
lsb_release -a
```

### Step 2: Configure Firewall

```bash
# Enable UFW firewall
sudo ufw enable

# Allow SSH, HTTP, and HTTPS
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Check firewall status
sudo ufw status verbose
```

### Step 3: Create Application User

```bash
# Create dedicated user for the application
sudo adduser speshway
sudo usermod -aG sudo speshway

# Setup SSH access for new user
sudo mkdir -p /home/speshway/.ssh
sudo cp ~/.ssh/authorized_keys /home/speshway/.ssh/
sudo chown -R speshway:speshway /home/speshway/.ssh
sudo chmod 700 /home/speshway/.ssh
sudo chmod 600 /home/speshway/.ssh/authorized_keys

# Switch to application user
sudo su - speshway
```

## 🟢 Node.js Installation

### Install Node.js v22 (for building frontend)

```bash
# Download and import NodeSource signing key
curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | sudo gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg

# Create deb repository
echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_22.x nodistro main" | sudo tee /etc/apt/sources.list.d/nodesource.list

# Update package list and install Node.js
sudo apt update
sudo apt install -y nodejs

# Verify installation
node --version  # Should show v22.x.x
npm --version

# Install global packages
sudo npm install -g pm2
```

## 📦 Frontend Application Deployment

### Step 1: Clone Repository

```bash
# Navigate to home directory
cd /home/speshway

# Clone repository
git clone https://github.com/yourusername/SPESHWAY.git
cd SPESHWAY

# Verify repository structure
ls -la
```

### Step 2: Configure Environment Variables

```bash
# Navigate to frontend directory
cd frontend

# Create environment file
cp .env.example .env
nano .env
```

**Configure frontend environment:**

```env
# Backend API URL - Update with your backend server URL
VITE_API_URL=https://your-backend-domain.com/api

# Or if backend is on same server but different port:
# VITE_API_URL=https://your-domain.com/api

# For development/testing with IP:
# VITE_API_URL=http://YOUR_BACKEND_IP:10000/api
```

### Step 3: Install Dependencies and Build

```bash
# Install frontend dependencies
npm install

# Build the application for production
npm run build

# Verify build output
ls -la dist/

# Check build size
du -sh dist/
```

### Step 4: Setup Application Directory

```bash
# Create web root directory
sudo mkdir -p /var/www/speshway-frontend

# Copy built files to web root
sudo cp -r dist/* /var/www/speshway-frontend/

# Set proper ownership and permissions
sudo chown -R www-data:www-data /var/www/speshway-frontend
sudo chmod -R 755 /var/www/speshway-frontend

# Verify files are in place
ls -la /var/www/speshway-frontend/
```

## 🌐 Nginx Web Server Setup

### Step 1: Install Nginx

```bash
# Install Nginx
sudo apt install -y nginx

# Start and enable Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Check Nginx status
sudo systemctl status nginx

# Test default page
curl http://localhost
```

### Step 2: Configure Nginx for React App

```bash
# Remove default configuration
sudo rm /etc/nginx/sites-enabled/default

# Create new site configuration
sudo nano /etc/nginx/sites-available/speshway-frontend
```

**Add the following Nginx configuration:**

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    
    # Document root
    root /var/www/speshway-frontend;
    index index.html index.htm;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline' 'unsafe-eval'" always;
    
    # Handle React Router (SPA routing)
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }
    
    # Handle API requests (proxy to backend if on same server)
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
    }
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/x-javascript
        application/xml+rss
        application/javascript
        application/json
        application/xml
        image/svg+xml;
    
    # Security configurations
    server_tokens off;
    client_max_body_size 50M;
    
    # Prevent access to hidden files
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
}
```

### Step 3: Enable Site Configuration

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/speshway-frontend /etc/nginx/sites-enabled/

# Test Nginx configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx

# Check if site is accessible
curl -I http://localhost
```

## 🔒 Domain and SSL Configuration

### Step 1: Configure Domain DNS

1. **Get VM Public IP**
   ```bash
   # Get public IP from Azure
   curl -H Metadata:true "http://169.254.169.254/metadata/instance/network/interface/0/ipv4/ipAddress/0/publicIpAddress?api-version=2017-08-01&format=text"
   
   # Or check in Azure Portal
   # VM → Overview → Public IP address
   ```

2. **Configure DNS Records**
   ```
   Type: A Record
   Name: @ (for root domain) or www
   Value: [Your VM Public IP]
   TTL: 300 (5 minutes)
   
   Type: CNAME Record
   Name: www
   Value: your-domain.com
   TTL: 300
   ```

### Step 2: Install SSL Certificate

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Follow the prompts:
# 1. Enter email address
# 2. Agree to terms of service
# 3. Choose whether to share email with EFF
# 4. Select redirect option (recommended: 2 - Redirect)

# Verify SSL certificate
sudo certbot certificates

# Test auto-renewal
sudo certbot renew --dry-run
```

### Step 3: Setup Auto-renewal

```bash
# Create renewal cron job
sudo crontab -e

# Add the following line:
# 0 12 * * * /usr/bin/certbot renew --quiet

# Or use systemd timer (Ubuntu 22.04)
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
sudo systemctl status certbot.timer
```

## 🌐 Azure Networking Configuration

### Step 1: Configure Network Security Group

1. **Azure Portal Configuration**
   ```
   VM → Networking → Network Security Group
   → Add inbound port rule
   ```

2. **Add HTTP Rule**
   ```
   Source: Any
   Source port ranges: *
   Destination: Any
   Destination port ranges: 80
   Protocol: TCP
   Action: Allow
   Priority: 1000
   Name: Allow-HTTP
   ```

3. **Add HTTPS Rule**
   ```
   Source: Any
   Source port ranges: *
   Destination: Any
   Destination port ranges: 443
   Protocol: TCP
   Action: Allow
   Priority: 1001
   Name: Allow-HTTPS
   ```

### Step 2: Configure Static IP (Optional)

```bash
# In Azure Portal:
# VM → Networking → Network Interface → IP configurations
# → ipconfig1 → Assignment: Static
```

### Step 3: Setup Azure Load Balancer (For High Availability)

```bash
# For production with multiple VMs:
# Azure Portal → Load Balancers → Create
# Configure frontend IP, backend pool, health probes, and load balancing rules
```

## 🛡️ Security Configuration

### Step 1: Harden SSH Access

```bash
# Edit SSH configuration
sudo nano /etc/ssh/sshd_config

# Recommended settings:
# Port 2222  # Change default port
# PermitRootLogin no
# PasswordAuthentication no
# PubkeyAuthentication yes
# MaxAuthTries 3
# ClientAliveInterval 300
# ClientAliveCountMax 2

# Restart SSH service
sudo systemctl restart sshd

# Update firewall for new SSH port
sudo ufw allow 2222/tcp
sudo ufw delete allow ssh
```

### Step 2: Install and Configure Fail2Ban

```bash
# Install Fail2Ban
sudo apt install -y fail2ban

# Create local configuration
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local

# Edit configuration
sudo nano /etc/fail2ban/jail.local

# Key settings to modify:
# [DEFAULT]
# bantime = 3600
# findtime = 600
# maxretry = 3
# 
# [sshd]
# enabled = true
# port = 2222
# 
# [nginx-http-auth]
# enabled = true

# Start and enable Fail2Ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# Check status
sudo fail2ban-client status
```

### Step 3: Setup Automated Updates

```bash
# Install unattended upgrades
sudo apt install -y unattended-upgrades

# Configure automatic updates
sudo dpkg-reconfigure -plow unattended-upgrades

# Edit configuration
sudo nano /etc/apt/apt.conf.d/50unattended-upgrades

# Enable automatic reboot if required
# Unattended-Upgrade::Automatic-Reboot "true";
# Unattended-Upgrade::Automatic-Reboot-Time "02:00";
```

## 📊 Monitoring and Maintenance

### Step 1: Setup Log Monitoring

```bash
# Create log monitoring script
nano /home/speshway/monitor-logs.sh
```

**Add monitoring script:**

```bash
#!/bin/bash

# Log file locations
NGINX_ACCESS_LOG="/var/log/nginx/access.log"
NGINX_ERROR_LOG="/var/log/nginx/error.log"
SYSTEM_LOG="/var/log/syslog"

# Check for errors in the last hour
echo "=== Nginx Error Log (Last Hour) ==="
sudo tail -n 100 $NGINX_ERROR_LOG | grep "$(date -d '1 hour ago' '+%Y/%m/%d %H')\|$(date '+%Y/%m/%d %H')"

echo "\n=== System Resource Usage ==="
echo "Memory Usage:"
free -h
echo "\nDisk Usage:"
df -h
echo "\nCPU Usage:"
top -bn1 | grep "Cpu(s)"

echo "\n=== Nginx Status ==="
sudo systemctl status nginx --no-pager

echo "\n=== Recent Access Log ==="
sudo tail -n 10 $NGINX_ACCESS_LOG
```

```bash
# Make script executable
chmod +x /home/speshway/monitor-logs.sh

# Run monitoring script
./monitor-logs.sh
```

### Step 2: Setup Backup Strategy

```bash
# Create backup script
nano /home/speshway/backup-frontend.sh
```

**Add backup script:**

```bash
#!/bin/bash

# Backup configuration
BACKUP_DIR="/home/speshway/backups"
DATE=$(date +"%Y%m%d_%H%M%S")
RETENTION_DAYS=7

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup web files
echo "Backing up web files..."
sudo tar -czf $BACKUP_DIR/web_files_$DATE.tar.gz /var/www/speshway-frontend

# Backup Nginx configuration
echo "Backing up Nginx configuration..."
sudo tar -czf $BACKUP_DIR/nginx_config_$DATE.tar.gz /etc/nginx/sites-available /etc/nginx/nginx.conf

# Backup SSL certificates
echo "Backing up SSL certificates..."
sudo tar -czf $BACKUP_DIR/ssl_certs_$DATE.tar.gz /etc/letsencrypt

# Backup application source
echo "Backing up application source..."
tar -czf $BACKUP_DIR/app_source_$DATE.tar.gz /home/speshway/SPESHWAY

# Remove old backups
echo "Cleaning up old backups..."
find $BACKUP_DIR -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete

echo "Backup completed: $DATE"
ls -lh $BACKUP_DIR
```

```bash
# Make script executable
chmod +x /home/speshway/backup-frontend.sh

# Setup daily backup cron job
crontab -e

# Add the following line:
# 0 3 * * * /home/speshway/backup-frontend.sh >> /home/speshway/backup.log 2>&1
```

### Step 3: Performance Monitoring

```bash
# Install monitoring tools
sudo apt install -y htop iotop nethogs

# Create performance monitoring script
nano /home/speshway/performance-check.sh
```

**Add performance script:**

```bash
#!/bin/bash

echo "=== System Performance Report ==="
echo "Date: $(date)"
echo ""

echo "=== CPU Usage ==="
top -bn1 | head -n 5
echo ""

echo "=== Memory Usage ==="
free -h
echo ""

echo "=== Disk Usage ==="
df -h
echo ""

echo "=== Network Connections ==="
ss -tuln
echo ""

echo "=== Nginx Status ==="
sudo systemctl status nginx --no-pager -l
echo ""

echo "=== Recent Nginx Access (Last 10 requests) ==="
sudo tail -n 10 /var/log/nginx/access.log
echo ""

echo "=== Load Average ==="
uptime
```

```bash
# Make script executable
chmod +x /home/speshway/performance-check.sh

# Run performance check
./performance-check.sh
```

## 🔧 Troubleshooting

### Common Issues and Solutions

#### 1. Frontend Not Loading

```bash
# Check Nginx status
sudo systemctl status nginx

# Check Nginx configuration
sudo nginx -t

# Check file permissions
ls -la /var/www/speshway-frontend/

# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log

# Restart Nginx
sudo systemctl restart nginx
```

#### 2. API Calls Failing

```bash
# Check if backend is running (if on same server)
curl http://localhost:10000/health

# Check environment variables
cat /home/speshway/SPESHWAY/frontend/.env

# Rebuild frontend with correct API URL
cd /home/speshway/SPESHWAY/frontend
npm run build
sudo cp -r dist/* /var/www/speshway-frontend/
```

#### 3. SSL Certificate Issues

```bash
# Check certificate status
sudo certbot certificates

# Test SSL configuration
echo | openssl s_client -servername your-domain.com -connect your-domain.com:443

# Renew certificate manually
sudo certbot renew

# Check Nginx SSL configuration
sudo nginx -t
```

#### 4. Performance Issues

```bash
# Check system resources
htop
df -h
free -h

# Check Nginx access logs for traffic patterns
sudo tail -f /var/log/nginx/access.log

# Enable Nginx caching (add to server block)
# location ~* \.(css|js|png|jpg|jpeg|gif|ico|svg)$ {
#     expires 1y;
#     add_header Cache-Control "public, immutable";
# }
```

#### 5. Azure VM Issues

```bash
# Check VM metrics in Azure Portal
# VM → Monitoring → Metrics

# Check Azure Network Security Group rules
# VM → Networking → Inbound port rules

# Restart VM from Azure Portal if needed
# VM → Overview → Restart
```

### Useful Commands

```bash
# System monitoring
htop                          # Interactive process viewer
df -h                         # Disk usage
free -h                       # Memory usage
ss -tuln                      # Network connections
journalctl -f                 # System logs

# Nginx management
sudo systemctl status nginx   # Check Nginx status
sudo nginx -t                 # Test configuration
sudo systemctl reload nginx  # Reload configuration
sudo tail -f /var/log/nginx/access.log  # Monitor access logs

# SSL certificate management
sudo certbot certificates     # List certificates
sudo certbot renew           # Renew certificates
sudo certbot delete          # Delete certificate

# File permissions
sudo chown -R www-data:www-data /var/www/speshway-frontend
sudo chmod -R 755 /var/www/speshway-frontend

# Application updates
cd /home/speshway/SPESHWAY
git pull origin main
cd frontend
npm run build
sudo cp -r dist/* /var/www/speshway-frontend/
```

## 🎉 Deployment Complete!

Your SPESHWAY HR Portal frontend is now deployed on Azure Linux VM with:

✅ **Azure VM** with Ubuntu 22.04 LTS
✅ **Node.js v22** for building the application
✅ **React frontend** built and optimized for production
✅ **Nginx web server** with optimized configuration
✅ **SSL certificate** with auto-renewal
✅ **Security hardening** with firewall and Fail2Ban
✅ **Monitoring and backup** strategies
✅ **Azure networking** properly configured

### Next Steps

1. **Test all frontend features** thoroughly
2. **Configure backend API** connection
3. **Setup monitoring alerts** in Azure
4. **Configure Azure Backup** for VM
5. **Setup staging environment** for testing updates
6. **Configure CDN** for better performance (Azure CDN)
7. **Setup Application Insights** for monitoring

### Production Checklist

- [ ] Domain DNS configured correctly
- [ ] SSL certificate installed and working
- [ ] All frontend features tested
- [ ] API connectivity verified
- [ ] Performance optimized
- [ ] Security measures in place
- [ ] Backup strategy implemented
- [ ] Monitoring configured
- [ ] Documentation updated

---

**Support Resources:**
- Azure Documentation: [docs.microsoft.com](https://docs.microsoft.com/azure/)
- Nginx Documentation: [nginx.org/en/docs/](http://nginx.org/en/docs/)
- Let's Encrypt: [letsencrypt.org](https://letsencrypt.org/)
- Ubuntu Server Guide: [ubuntu.com/server/docs](https://ubuntu.com/server/docs)

**Remember to:**
- Keep your VM and packages updated
- Monitor resource usage and costs
- Regularly backup your data
- Review security logs periodically
- Update SSL certificates before expiry