# Authentication setup

Android now exchanges email OTPs and Google ID tokens for the same backend session. Firebase is no longer used for application sign-in. Account access is available from the assistant's profile button. Guest access remains available; offline guest access has no authenticated account identity.

## Required server configuration

Add these to your backend environment (Railway Variables for the deployed API). Do not put secrets in Android resources or commit them.

- `JWT_SECRET`: a randomly generated secret of at least 32 characters. Example generator: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`. Keep it stable across deployments. Changing it invalidates existing sessions, including admin sessions.
- `RESEND_API_KEY`: an API key allowed to send mail from your verified Resend domain.
- `AUTH_EMAIL_FROM`: e.g. `Healing Hands4U <signin@your-domain.com>`. Verify that domain in Resend first. Resend's testing sender cannot deliver to arbitrary users.
- `GOOGLE_CLIENT_ID`: the **Web application** OAuth client ID from your Google Cloud project.
- `TRUST_PROXY_HOPS`: the actual number of trusted reverse proxies before Express. Configure this to your hosting topology; do not blindly trust arbitrary forwarded IP headers. Otherwise all users behind a proxy share an IP rate limit.

Keep the existing database and AI settings. Node 20+ is required for the email HTTP client. The server intentionally refuses to issue tokens without a strong secret and refuses to report successful email delivery without provider acceptance. Provider acceptance does not guarantee inbox delivery; check the provider dashboard for bounces.

## Google and Android configuration

1. Configure the OAuth consent screen in the same Google Cloud project. Add test users if the app is in testing.
2. Create Android OAuth clients for package `com.healinghands4u` and each signing certificate SHA-1 (debug, release, and Play App Signing as applicable). Obtain fingerprints with `gradlew.bat signingReport`.
3. Create a Web application OAuth client. Its ID must equal the backend `GOOGLE_CLIENT_ID`.
4. Set `GOOGLE_WEB_CLIENT_ID=your-web-client-id.apps.googleusercontent.com` in your user Gradle properties (`%USERPROFILE%\.gradle\gradle.properties`), environment, or pass `-PGOOGLE_WEB_CLIENT_ID=...` when building. This ID is public; no Google client secret belongs in Android.
5. Rebuild/install the Android app and deploy the updated backend together. The APK uses `https://hh4u-production.up.railway.app/`.

Google's official setup: https://developer.android.com/identity/sign-in/credential-manager-siwg-implementation
Backend token verification: https://developers.google.com/identity/sign-in/android/backend-auth
Email API: https://resend.com/docs/api-reference/emails/send-email

## Behaviour and checks

- Request a code, check the inbox, enter it, and confirm the account email in Profile. Incorrect, expired, reused codes and a sixth attempt must fail. Resends wait 60 seconds, expire after 10 minutes, and invalidate the previous code. There is a five-request hourly email limit and a 60-request per-IP limit every 15 minutes.
- Cancel the Google picker: remain on sign-in. Complete the picker: only Google's verified token identity is accepted. There is no mock-token production bypass.
- Restart the app: the account remains available. The 30-day session is encrypted using an Android Keystore key and stored outside Android backups. Expired or rejected tokens clear the local session. Signing in again renews the session; there is no silent refresh token.
- Sign out online: the backend revokes that particular token and Android clears local credentials. Offline sign-out clears this device and reports that server revocation could not complete; the remote token remains valid until expiration.
- Guest access: online guest sessions use the backend; network failure permits local guest access without a token. Existing assistant access remains available without signing in.
- The new `emailchallenges` collection replaces legacy plaintext OTP storage; outstanding old OTPs cannot be used after deployment. The old collection can be removed separately by the operator once obsolete.

Live email and real Google account sign-in must be checked on a device after configuring these services. Automated tests mock external Google/email responses; they cannot prove inbox delivery or Google Console configuration.
