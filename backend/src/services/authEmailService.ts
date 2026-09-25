export function requireEmailConfiguration(): void {
  if (!process.env.RESEND_API_KEY || !process.env.AUTH_EMAIL_FROM) throw new Error('Email delivery is not configured');
}
export async function sendOtpEmail(email: string, otp: string): Promise<void> {
  requireEmailConfiguration();
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: process.env.AUTH_EMAIL_FROM, to: [email],
      subject: 'Your Healing Hands4U sign-in code',
      text: `Your sign-in code is ${otp}. It expires in 10 minutes. Do not share this code. If you did not request it, ignore this email.` }),
    signal: AbortSignal.timeout(12000)
  });
  if (!response.ok) throw new Error('Email provider rejected delivery');
}
