import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend | null;
  private readonly from: string;
  private readonly enabled: boolean;

  constructor(private readonly config: ConfigService) {
    const key = this.config.get<string>('RESEND_API_KEY', '').trim();
    this.from = this.config.get<string>('MAIL_FROM', 'Mishpachti <noreply@example.com>');
    if (key && key !== 'fill_me_in') {
      this.resend = new Resend(key);
      this.enabled = true;
    } else {
      this.resend = null;
      this.enabled = false;
      this.logger.warn(
        'RESEND_API_KEY not configured — emails will be logged to console instead of sent.',
      );
    }
  }

  async sendInvitationEmail(input: {
    to: string;
    inviterName: string;
    joinUrl: string;
  }): Promise<void> {
    const subject = `${input.inviterName} מזמין/ה אותך להצטרף ל-משפחתי`;
    const html = renderInvitationHtml(input.inviterName, input.joinUrl);
    const text = `${input.inviterName} הזמין/ה אותך להצטרף לפורטל המשפחתי "משפחתי".\n\nכדי להצטרף, לחץ על הלינק:\n${input.joinUrl}\n\nהלינק תקף ל-7 ימים וניתן לשימוש חד-פעמי.`;

    if (!this.enabled || !this.resend) {
      this.logger.log(
        `[EMAIL FALLBACK] Would send invitation to ${input.to} -> ${input.joinUrl}`,
      );
      return;
    }

    try {
      const res = await this.resend.emails.send({
        from: this.from,
        to: input.to,
        subject,
        html,
        text,
      });

      // Resend SDK may resolve with { data, error } instead of throwing.
      const anyRes = res as unknown as { data?: { id?: string }; error?: unknown };
      if (anyRes?.error) {
        const msg =
          anyRes.error instanceof Error ? anyRes.error.message : JSON.stringify(anyRes.error);
        this.logger.error(`Resend returned error for ${input.to}: ${msg}`);
        return;
      }

      const id = anyRes?.data?.id ? ` id=${anyRes.data.id}` : '';
      this.logger.log(`Invitation email accepted by Resend for ${input.to}${id}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown';
      this.logger.error(`Failed to send invitation to ${input.to}: ${msg}`);
      // Do not throw - we still want the invitation to exist; user can resend
    }
  }
}

function renderInvitationHtml(inviter: string, joinUrl: string): string {
  return `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="UTF-8" /><title>הצטרף למשפחתי</title></head>
<body style="font-family:Arial,sans-serif;background:#f7fafc;padding:40px;direction:rtl;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;padding:32px;box-shadow:0 6px 24px rgba(15,41,66,.08);">
    <h1 style="color:#0f2942;margin:0 0 12px;">משפחתי 💚</h1>
    <p style="font-size:18px;color:#2d3748;line-height:1.6;">
      <strong>${escapeHtml(inviter)}</strong> מזמין/ה אותך להצטרף לפורטל המשפחתי הפרטי שלכם —
      "משפחתי".
    </p>
    <p style="color:#4a5568;line-height:1.6;">
      צ'אט מהיר, גלריית רגעים משותפת, לוח שנה משפחתי, ושיחות וידאו — הכל במקום אחד.
    </p>
    <div style="margin:24px 0;text-align:center;">
      <a href="${joinUrl}" style="display:inline-block;background:#3DBDB6;color:#fff;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:600;font-size:16px;">
        הצטרף עכשיו
      </a>
    </div>
    <p style="color:#718096;font-size:13px;line-height:1.5;">
      או העתק את הכתובת:<br />
      <span style="word-break:break-all;color:#4a5568;">${joinUrl}</span>
    </p>
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />
    <p style="color:#a0aec0;font-size:12px;">
      הקישור תקף ל-7 ימים וניתן לשימוש חד-פעמי בלבד. אם זה לא היה מיועד לך, פשוט התעלם מההודעה.
    </p>
  </div>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
