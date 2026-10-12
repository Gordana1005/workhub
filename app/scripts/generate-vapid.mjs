// Prints a fresh VAPID key pair for Web Push.
// Usage:  node scripts/generate-vapid.mjs
// Then set the values as environment variables (e.g. in Vercel). Never commit them.
import webpush from 'web-push';

const { publicKey, privateKey } = webpush.generateVAPIDKeys();

console.log('Add these to your environment (Vercel project settings / .env.local):\n');
console.log(`VAPID_PUBLIC_KEY=${publicKey}`);
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${privateKey}`);
console.log('VAPID_SUBJECT=mailto:you@example.com');
console.log('\nAlso set CRON_SECRET to a long random string (Vercel sends it to cron routes).');
