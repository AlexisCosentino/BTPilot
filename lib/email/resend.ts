import "server-only";

const RESEND_API_URL = "https://api.resend.com/emails";
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";

export type SendInviteEmailParams = {
  toEmail: string;
  inviterName: string;
  companyName: string;
  inviteLink: string;
};

export async function sendInviteEmail(params: SendInviteEmailParams): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error("Missing RESEND_API_KEY");
  }

  const { toEmail, inviterName, companyName, inviteLink } = params;

  const body = {
    from: RESEND_FROM_EMAIL,
    to: [toEmail],
    subject: `Invitation a rejoindre l'equipe ${companyName}`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.6;">
        <p>Bonjour,</p>
        <p><strong>${inviterName}</strong> vous invite a rejoindre l'equipe <strong>${companyName}</strong>.</p>
        <p style="margin: 24px 0;">
          <a
            href="${inviteLink}"
            style="
              display: inline-block;
              padding: 12px 18px;
              background-color: #0F2A44;
              color: #ffffff;
              text-decoration: none;
              border-radius: 6px;
              font-weight: 600;
            "
          >
            Rejoindre l'equipe
          </a>
        </p>
        <p>Ce lien d'invitation expirera automatiquement apres un delai de 7 jours.</p>
        <p>Si vous n'attendiez pas cet email, vous pouvez l'ignorer.</p>
        <p style="margin-top: 24px;">Merci,</p>
        <p style="margin-top: 0;">L'equipe BTPilot</p>
      </div>
    `
  };

  const response = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    let errorDetail: string | undefined;

    try {
      const json = (await response.json()) as { error?: { message?: string } };
      errorDetail = json.error?.message;
    } catch {
      // ignore parse errors and fall back to status text
    }

    throw new Error(
      `Resend invite email failed: ${response.status} ${response.statusText}${
        errorDetail ? ` - ${errorDetail}` : ""
      }`
    );
  }
}
