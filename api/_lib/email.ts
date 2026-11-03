// Sends the login code with Resend's HTTP API (https://resend.com/docs/api-reference/emails/send-email).
const DEFAULT_FROM = 'J&T Tutorial <onboarding@resend.dev>';

export async function sendLoginCode(to: string, code: string, ttlMinutes: number) {
  // Local development without Resend: print the code in the dev-server terminal instead.
  if (process.env.DEV_LOG_LOGIN_CODE === '1' && !process.env.VERCEL) {
    console.log(`\n[admin login] code for ${to}: ${code}\n`);
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('Server is missing RESEND_API_KEY.');

  const spaced = code.split('').join(' ');
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.RESEND_FROM || DEFAULT_FROM,
      to: [to],
      subject: `كود الدخول للوحة التحكم: ${code}`,
      text: `كود الدخول للوحة تحكم دليل نظام الشحن: ${code}\nالكود صالح لمدة ${ttlMinutes} دقائق. لو ما طلبتش الكود ده تجاهل الرسالة.`,
      html: `<!doctype html><html dir="rtl" lang="ar"><body style="margin:0;background:#faf6f4;font-family:Tahoma,Arial,sans-serif;color:#1d1515">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:440px;background:#fff;border:1px solid #ece4e1;border-radius:20px;overflow:hidden">
<tr><td style="height:4px;background:#d4141b"></td></tr>
<tr><td style="padding:28px 28px 8px;text-align:right">
<div style="font-size:20px;font-weight:bold;margin-bottom:6px">كود الدخول للوحة التحكم</div>
<div style="font-size:14px;color:#7a6d6b">دليل نظام الشحن · J&amp;T Express</div>
</td></tr>
<tr><td align="center" style="padding:20px 28px">
<div dir="ltr" style="display:inline-block;padding:14px 22px;border-radius:14px;background:#fff0ee;color:#b3121a;font-size:32px;font-weight:bold;letter-spacing:6px;font-family:Consolas,Menlo,monospace">${spaced}</div>
</td></tr>
<tr><td style="padding:0 28px 28px;text-align:right;font-size:14px;line-height:1.8;color:#4a3f3e">
الكود صالح لمدة ${ttlMinutes} دقائق ويُستخدم مرة واحدة.<br>لو ما طلبتش الكود ده، تجاهل الرسالة.
</td></tr></table></td></tr></table></body></html>`,
    }),
  });

  if (!res.ok) throw new Error(`Resend error ${res.status}: ${await res.text()}`);
}
