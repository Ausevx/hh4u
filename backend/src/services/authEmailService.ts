import nodemailer from 'nodemailer';

export function requireEmailConfiguration(): void {
  const hasSmtp = Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
  const hasResend = Boolean(process.env.RESEND_API_KEY && process.env.AUTH_EMAIL_FROM);
  if (!hasSmtp && !hasResend) {
    throw new Error('Email delivery is not configured');
  }
}

export async function sendOtpEmail(email: string, otp: string): Promise<void> {
  requireEmailConfiguration();

  let smtpError: any = null;

  // 1. Try Direct Gmail / SMTP via Nodemailer
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS.replace(/\s+/g, ''), // strip spaces if copied from Google App Password
        },
      });

      await transporter.sendMail({
        from: `"Healing Hands4U" <${process.env.SMTP_USER}>`,
        to: email,
        subject: 'Your Healing Hands4U sign-in code',
        text: `Your sign-in code is ${otp}. It expires in 10 minutes. Do not share this code. If you did not request it, ignore this email.`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
            <h2 style="color: #2e7d32; text-align: center;">Healing Hands 4U</h2>
            <p>Hello,</p>
            <p>Your one-time sign-in verification code is:</p>
            <div style="background-color: #f1f8e9; padding: 16px; border-radius: 6px; text-align: center; font-size: 28px; font-weight: bold; letter-spacing: 4px; color: #1b5e20;">
              ${otp}
            </div>
            <p style="margin-top: 20px; color: #666; font-size: 13px;">This code will expire in 10 minutes. Do not share this code with anyone.</p>
          </div>
        `,
      });
      return;
    } catch (err: any) {
      smtpError = err;
      console.error('Nodemailer SMTP delivery error:', err?.message || err);
      // Fall through to Resend if available
    }
  }

  // 2. Fallback to Resend API if configured
  if (process.env.RESEND_API_KEY && process.env.AUTH_EMAIL_FROM) {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.AUTH_EMAIL_FROM,
        to: [email],
        subject: 'Your Healing Hands4U sign-in code',
        text: `Your sign-in code is ${otp}. It expires in 10 minutes. Do not share this code. If you did not request it, ignore this email.`,
      }),
      signal: AbortSignal.timeout(12000),
    });
    if (response.ok) return;
  }

  if (smtpError) {
    throw new Error(
      `Email delivery failed: ${smtpError?.message || 'SMTP error'}. Note: Gmail requires a 16-character Google App Password (not your account password).`
    );
  }

  throw new Error('Email provider rejected delivery');
}
