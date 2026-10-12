# Email templates (Supabase Auth)

TrackWork sends workspace invitations with Supabase Auth's admin API (`auth.admin.inviteUserByEmail`).
The e-mail itself is **not** in the code: it is the **Invite user** template in the Supabase dashboard.

## Where to paste it

1. Supabase dashboard, your project, **Authentication**, **Email Templates**, **Invite user**.
2. Paste the **Subject** and the **Message body (HTML)** of the language you want.
3. Save.

Supabase has one template per e-mail type, so pick one language or use the bilingual version at the end.

## Required configuration

- **Authentication, URL Configuration, Redirect URLs** must contain the app origin with a wildcard, for example
  `https://trackwork.me/**` (and `http://localhost:3000/**` for development). The invitation link is
  `https://trackwork.me/join?token=...`; if it is not allow-listed Supabase falls back to the Site URL and the
  invitee loses the token.
- Set `NEXT_PUBLIC_APP_URL=https://trackwork.me` in the hosting environment so links never use an internal host.
- `SUPABASE_SERVICE_ROLE_KEY` must be set on the server (the admin API needs it).
- The invite link is a one-time link and expires with Supabase's OTP expiry (Authentication, Providers, Email,
  "Email OTP expiry", 24 hours by default). The invitation row itself is valid for 7 days; an admin can press
  **Resend email** on the People page to issue a fresh e-mail.

## Variables available

| Variable | Meaning |
| --- | --- |
| `{{ .ConfirmationURL }}` | The one-click link (Supabase verifies it, then redirects to `/join?token=...`) |
| `{{ .Data.invited_to_workspace }}` | Workspace name |
| `{{ .Data.invited_by_name }}` | Username (or e-mail) of the inviter |
| `{{ .Data.invite_message }}` | Optional personal note typed by the inviter (empty string when none) |
| `{{ .Data.invite_role }}` | `admin` or `member` |
| `{{ .Email }}` | The invitee's address |
| `{{ .SiteURL }}` | The Site URL from URL Configuration |

Angle brackets are stripped from the `Data` values on the server, so an inviter cannot inject markup.

## English

**Subject**

```
{{ .Data.invited_by_name }} invited you to {{ .Data.invited_to_workspace }} on TrackWork
```

**Message body**

```html
<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:#f4f6fb;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;border:1px solid #e3e8f2;">
            <tr>
              <td style="padding:28px 32px 8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:20px;font-weight:700;color:#1d4ed8;">
                TrackWork
              </td>
            </tr>
            <tr>
              <td style="padding:8px 32px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
                <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;font-weight:650;">
                  You have been invited to {{ .Data.invited_to_workspace }}
                </h1>
                <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#334155;">
                  <strong>{{ .Data.invited_by_name }}</strong> invited you to collaborate on tasks, projects and time tracking in
                  <strong>{{ .Data.invited_to_workspace }}</strong>.
                </p>
                {{ if .Data.invite_message }}
                <p style="margin:0 0 20px;padding:12px 14px;border-left:3px solid #2563eb;background:#f1f5ff;border-radius:6px;font-size:15px;line-height:1.6;color:#0f172a;white-space:pre-line;">{{ .Data.invite_message }}</p>
                {{ end }}
              </td>
            </tr>
            <tr>
              <td align="left" style="padding:4px 32px 24px;">
                <a href="{{ .ConfirmationURL }}"
                   style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;font-weight:600;line-height:1;padding:15px 26px;border-radius:10px;">
                  Accept invitation
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13px;line-height:1.6;color:#64748b;">
                Button not working? Copy this link into your browser:<br />
                <a href="{{ .ConfirmationURL }}" style="color:#2563eb;word-break:break-all;">{{ .ConfirmationURL }}</a>
                <br /><br />
                This invitation was sent to {{ .Email }}. If you were not expecting it, you can ignore this e-mail.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
```

## Macedonian (Македонски)

**Subject**

```
{{ .Data.invited_by_name }} ве покани во {{ .Data.invited_to_workspace }} на TrackWork
```

**Message body**

```html
<!doctype html>
<html lang="mk">
  <body style="margin:0;padding:0;background:#f4f6fb;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;border:1px solid #e3e8f2;">
            <tr>
              <td style="padding:28px 32px 8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:20px;font-weight:700;color:#1d4ed8;">
                TrackWork
              </td>
            </tr>
            <tr>
              <td style="padding:8px 32px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
                <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;font-weight:650;">
                  Поканети сте во {{ .Data.invited_to_workspace }}
                </h1>
                <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#334155;">
                  <strong>{{ .Data.invited_by_name }}</strong> ве покани да соработувате на задачи, проекти и евиденција на време во
                  <strong>{{ .Data.invited_to_workspace }}</strong>.
                </p>
                {{ if .Data.invite_message }}
                <p style="margin:0 0 20px;padding:12px 14px;border-left:3px solid #2563eb;background:#f1f5ff;border-radius:6px;font-size:15px;line-height:1.6;color:#0f172a;white-space:pre-line;">{{ .Data.invite_message }}</p>
                {{ end }}
              </td>
            </tr>
            <tr>
              <td align="left" style="padding:4px 32px 24px;">
                <a href="{{ .ConfirmationURL }}"
                   style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;font-weight:600;line-height:1;padding:15px 26px;border-radius:10px;">
                  Прифати ја поканата
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13px;line-height:1.6;color:#64748b;">
                Копчето не работи? Копирајте го овој линк во прелистувачот:<br />
                <a href="{{ .ConfirmationURL }}" style="color:#2563eb;word-break:break-all;">{{ .ConfirmationURL }}</a>
                <br /><br />
                Оваа покана е испратена до {{ .Email }}. Ако не сте ја очекувале, слободно игнорирајте ја оваа е-порака.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
```

## Bilingual (one template for both languages)

Because the template cannot depend on the invitee's language, a bilingual message is often the practical choice.
Use this subject and, in the body, repeat the heading/paragraph/button block twice: the English block first, a
`<hr style="border:0;border-top:1px solid #e3e8f2;margin:24px 0;">`, then the Macedonian block. Keep a single
`{{ .ConfirmationURL }}` button per block.

```
{{ .Data.invited_by_name }} invited you to {{ .Data.invited_to_workspace }} / ве покани во {{ .Data.invited_to_workspace }}
```

## SMTP and rate limits

- Supabase's **built-in mailer is for testing only**: it only delivers to addresses of your own team members and
  is limited to a few e-mails per hour for the whole project (currently 2/hour; check the dashboard, the number
  changes). Beyond that, invitations are created but the e-mail is rejected with `over_email_send_rate_limit`;
  the People page then shows "Email sending is temporarily limited" together with a copy-link fallback.
- For production configure **custom SMTP** (Authentication, Settings, SMTP Settings) with a transactional provider
  (Resend, Postmark, SES, Brevo...), a verified sending domain (SPF, DKIM, DMARC) and a sender such as
  `TrackWork <invites@trackwork.me>`. After enabling it, raise the e-mail rate limit under Authentication,
  Rate Limits.
- The app adds its own guard rails: at most 20 invitations (created or re-sent) per workspace per hour and a
  60 second cooldown per invitation for "Resend email".
- Addresses that already have a confirmed TrackWork account cannot receive Supabase's invite e-mail (the admin API
  refuses it). For them, and whenever sending fails for any reason, the invitation is still created and the
  inviter is shown a link to copy and share. The app deliberately does not say which of the two happened, so the
  invite form cannot be used to find out who has an account. The invitee opens the link, signs in and accepts.
