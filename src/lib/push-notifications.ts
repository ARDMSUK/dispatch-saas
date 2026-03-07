import fetch from 'node-fetch';

interface PushMessage {
    to: string | string[];
    title: string;
    body: string;
    data?: any;
    sound?: 'default' | null;
    priority?: 'default' | 'normal' | 'high';
}

/**
 * Sends a push notification to one or more Expo Push Tokens.
 */
export async function sendPushNotification(message: PushMessage) {
    try {
        const response = await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Accept-encoding': 'gzip, deflate',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                sound: 'default',
                ...message,
            }),
        });

        const receipt = await response.json();
        if (receipt.errors) {
            console.error('Expo Push Notification Validation Errors:', receipt.errors);
            return { success: false, error: receipt.errors[0]?.message };
        }

        return { success: true, receipt };
    } catch (error) {
        console.error('Failed to send push notification:', error);
        return { success: false, error: 'Network error sending push notification' };
    }
}
