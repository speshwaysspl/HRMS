# 🍃 MongoDB Atlas Setup for Render Deployment

This guide will help you set up MongoDB Atlas for your HR Portal deployment on Render.

## 📋 Prerequisites

- MongoDB Atlas account (free tier available)
- Basic understanding of database concepts

## 🚀 Step-by-Step Setup

### 1. Create MongoDB Atlas Account

1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Click "Try Free" or "Sign Up"
3. Create your account with email/password or Google/GitHub
4. Verify your email address

### 2. Create a New Project

1. After logging in, click "New Project"
2. Name your project (e.g., "HR Portal")
3. Click "Next" and then "Create Project"

### 3. Create a Database Cluster

1. Click "Build a Database"
2. Choose **M0 Sandbox (FREE)**
3. Select your preferred cloud provider and region
4. Name your cluster (e.g., "hr-portal-cluster")
5. Click "Create Cluster"

### 4. Configure Database Access

1. Go to "Database Access" in the left sidebar
2. Click "Add New Database User"
3. Choose "Password" authentication
4. Create a username and strong password
5. Set privileges to "Read and write to any database"
6. Click "Add User"

**⚠️ Important**: Save these credentials securely!

### 5. Configure Network Access

1. Go to "Network Access" in the left sidebar
2. Click "Add IP Address"
3. Choose "Allow Access from Anywhere" (0.0.0.0/0)
   - This is required for Render deployment
   - Atlas has built-in security measures
4. Click "Confirm"

### 6. Get Connection String

1. Go to "Database" in the left sidebar
2. Click "Connect" on your cluster
3. Choose "Connect your application"
4. Select "Node.js" and version "4.1 or later"
5. Copy the connection string

**Example connection string:**
```
mongodb+srv://username:<password>@hr-portal-cluster.abc123.mongodb.net/?retryWrites=true&w=majority
```

### 7. Prepare for Render

1. Replace `<password>` with your actual database user password
2. Add your database name after `.net/`:
   ```
   mongodb+srv://username:password@hr-portal-cluster.abc123.mongodb.net/hr_portal?retryWrites=true&w=majority
   ```

## 🔧 Environment Variable Configuration

Use this connection string as your `MONGODB_URL` environment variable in Render:

```bash
MONGODB_URL=mongodb+srv://username:password@cluster.mongodb.net/hr_portal?retryWrites=true&w=majority
```

## 🛡️ Security Best Practices

### 1. Strong Credentials
- Use a strong, unique password for your database user
- Consider using MongoDB's password generator

### 2. Database Name
- Use a specific database name (e.g., `hr_portal`)
- Don't use the default `test` database

### 3. User Permissions
- Create separate users for different environments if needed
- Use least privilege principle

### 4. Connection Security
- Always use the `mongodb+srv://` protocol (TLS encrypted)
- Keep connection strings secure and never commit to code

## 📊 Monitoring and Maintenance

### 1. Atlas Dashboard
- Monitor database performance
- Check connection logs
- Review security alerts

### 2. Backup Strategy
- Atlas provides automatic backups on free tier
- Consider upgrading for more backup options

### 3. Scaling
- Start with M0 (free tier)
- Upgrade to M2/M5 as your application grows

## 🔍 Troubleshooting

### Common Issues

#### Connection Timeout
- Check network access settings
- Verify IP whitelist includes 0.0.0.0/0
- Ensure connection string is correct

#### Authentication Failed
- Verify username and password
- Check database user permissions
- Ensure special characters in password are URL-encoded

#### Database Not Found
- MongoDB creates databases automatically on first write
- Ensure your application attempts to write data
- Check database name in connection string

### URL Encoding Special Characters

If your password contains special characters, encode them:
- `@` → `%40`
- `:` → `%3A`
- `/` → `%2F`
- `?` → `%3F`
- `#` → `%23`
- `[` → `%5B`
- `]` → `%5D`
- `%` → `%25`

## 📞 Support Resources

- [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com/)
- [MongoDB University](https://university.mongodb.com/) (Free courses)
- [MongoDB Community Forums](https://community.mongodb.com/)
- [Atlas Support](https://support.mongodb.com/)

## ✅ Checklist

- [ ] MongoDB Atlas account created
- [ ] Project created
- [ ] M0 cluster deployed
- [ ] Database user created with strong password
- [ ] Network access configured (0.0.0.0/0)
- [ ] Connection string obtained
- [ ] Password replaced in connection string
- [ ] Database name added to connection string
- [ ] Connection string tested locally (optional)
- [ ] Ready to use in Render environment variables

---

**Next Step**: Use your MongoDB connection string in Render's environment variables as `MONGODB_URL`.