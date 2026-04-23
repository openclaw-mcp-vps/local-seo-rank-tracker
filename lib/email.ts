import { Resend } from "resend";

type WeeklyReportEmail = {
  to: string;
  summary: string;
};

function getResendClient() {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    return null;
  }

  return new Resend(key);
}

export async function sendWeeklyReportEmail({ to, summary }: WeeklyReportEmail) {
  const resend = getResendClient();

  if (!resend) {
    return {
      sent: false,
      reason: "RESEND_API_KEY is not configured",
    };
  }

  const from = process.env.RESEND_FROM ?? "Local SEO Rank Tracker <reports@updates.local-seo-rank-tracker.com>";

  await resend.emails.send({
    from,
    to,
    subject: "Your Weekly Local SEO Ranking Report",
    text: `Here is your weekly local ranking summary:\n\n${summary}\n\nLog in to your dashboard for full competitor details.`,
    html: `
      <div style="font-family: Helvetica, Arial, sans-serif; line-height: 1.5; color: #0f172a;">
        <h2 style="margin-bottom: 8px;">Your Weekly Local SEO Ranking Report</h2>
        <p style="margin-top: 0;">Here is this week's snapshot of your tracked local keywords.</p>
        <pre style="background: #f8fafc; padding: 12px; border-radius: 8px; white-space: pre-wrap;">${summary}</pre>
        <p>Log in to your dashboard for full competitor details and trend charts.</p>
      </div>
    `,
  });

  return {
    sent: true,
  };
}
