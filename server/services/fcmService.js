import admin from 'firebase-admin';
import path from 'path';
import fs from 'fs';

let isInitialized = false;

const initFCM = () => {
  if (isInitialized) return;

  try {
    // Try to find service account file
    // You should put your service-account.json in the server root or config folder
    const serviceAccountPath = path.resolve('service-account.json');
    
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
       admin.initializeApp({
        credential: admin.credential.applicationDefault(),
      });
      isInitialized = true;
      console.log('FCM Initialized with Application Default Credentials');
    } else if (fs.existsSync(serviceAccountPath)) {
      const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      isInitialized = true;
      console.log('FCM Initialized with service-account.json');
    } else {
      console.warn('FCM Warning: No service-account.json found and GOOGLE_APPLICATION_CREDENTIALS not set. FCM will not work.');
    }
  } catch (error) {
    console.error('FCM Initialization Error:', error);
  }
};

// Initialize on load
initFCM();

const sendNotification = async (registrationToken, title, body, data = {}) => {
  if (!isInitialized || !registrationToken) return;

  const message = {
    notification: {
      title,
      body,
    },
    android: {
      priority: 'high',
      notification: {
        channelId: data.channel_id || 'general_channel_v3',
        priority: 'high',
        visibility: 'public',
        defaultSound: true,
      },
    },
    data: data,
    token: registrationToken,
  };

  try {
    const response = await admin.messaging().send(message);
    console.log('Successfully sent message:', response);
    return response;
  } catch (error) {
    console.error('Error sending message:', error);
    // If token is invalid, we might want to remove it from DB, but we'll leave that for now
    return null;
  }
};

const sendMulticastNotification = async (registrationTokens, title, body, data = {}) => {
  if (!isInitialized || !registrationTokens || registrationTokens.length === 0) return;

  const message = {
    notification: {
      title,
      body,
    },
    android: {
      priority: 'high',
      notification: {
        channelId: data.channel_id || 'general_channel_v3',
        priority: 'high',
        visibility: 'public',
        defaultSound: true,
      },
    },
    data: data,
    tokens: registrationTokens,
  };

  try {
    const response = await admin.messaging().sendEachForMulticast(message);
    console.log(response.successCount + ' messages were sent successfully');
    return response;
  } catch (error) {
    console.error('Error sending multicast message:', error);
    return null;
  }
};

export { sendNotification, sendMulticastNotification };
