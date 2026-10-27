import webpush from 'web-push';

let isVapidInitialized = false;

const initVapid = () => {
  if (isVapidInitialized) return;
  const subject = process.env.VAPID_SUBJECT || 'mailto:test@example.com';
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;

  if (publicKey && privateKey) {
    try {
      webpush.setVapidDetails(subject, publicKey, privateKey);
      isVapidInitialized = true;
    } catch (err) {
      console.error('Failed to initialize web-push VAPID details:', err);
    }
  } else {
    console.warn('VAPID public/private keys are not set. Push notifications will be disabled.');
  }
};

export const sendPushNotification = async (
  subscription: any,
  payload: string
) => {
  initVapid();
  if (!isVapidInitialized) {
    console.warn('Skipping push notification: VAPID keys not initialized.');
    return;
  }
  try {
    await webpush.sendNotification(subscription, payload);
  } catch (error) {
    console.error('Push error:', error);
  }
};

export default webpush;
