# Spec: Email Branding — Custom SMTP via Resend

## Status
Pending implementation

## The Problem
By default, Supabase sends all auth emails (magic links, invites) from `noreply@mail.supabase.io`. This:
- Looks untrustworthy for a financial tool
- Goes to spam frequently
- Doesn't reinforce your brand
- Shows "Supabase" in the From name — confuses users who don't know what Supabase is

## The Fix
Configure Supabase to send email via **Resend** using your own domain (e.g., `hello@yourdomain.com`).

Resend is the simplest option: free tier (3,000 emails/month), first-class Supabase integration, great deliverability.

---

## Setup Steps

### 1. Sign up for Resend
- resend.com → free account
- Add your domain (yourdomain.com) — Resend walks you through DNS records
- DNS records go into GoDaddy (SPF, DKIM, DMARC) — Resend shows you exactly what to add
- Verification takes 15–60 minutes

### 2. Create a Resend API key
- Resend Dashboard → API Keys → Create key
- Scope: "Sending access" only
- Save the key: `re_xxxxxxxxxxxx`

### 3. Configure Supabase SMTP
Supabase Dashboard → Authentication → SMTP Settings → Enable Custom SMTP:
```
Host:       smtp.resend.com
Port:       465
Username:   resend
Password:   [your Resend API key]
Sender name:   [AppName]
Sender email:  hello@yourdomain.com
```

That's it. All Supabase auth emails (magic links, invites, password resets) now come from your domain.

---

## Email Templates to Customize

Supabase Dashboard → Authentication → Email Templates:

### Magic Link / Sign In
**Subject:** Your login link for [AppName]
**Body:**
```
Hi,

Click the link below to sign in to [AppName]. This link expires in 1 hour.

[Sign in to [AppName]]

If you didn't request this, you can safely ignore this email.

— The [AppName] team
```

### Invite (admin sends)
**Subject:** You've been invited to [AppName]
**Body:**
```
Hi,

You've been invited to try [AppName] — a retirement planning tool for Canadians.

Your account has been set up. Click below to sign in and get started:

[Open [AppName]]

This link expires in 24 hours.

— [AppName]
```

### Confirmation (if you enable email confirmation)
Keep this off for magic-link-only flow — confirmation emails add friction and are redundant when magic link IS the email.

---

## DNS Records (added to GoDaddy)

Resend will give you the exact values. You'll add approximately:

| Type | Name | Value |
|---|---|---|
| TXT | @ or yourdomain.com | SPF record (v=spf1 include:amazonses.com ~all) |
| CNAME | resend._domainkey | DKIM key (resend provides) |
| TXT | _dmarc | DMARC policy |

These ensure your emails pass spam filters. GoDaddy DNS editor is where you add these.

---

## Acceptance Criteria
- [ ] Resend account created and domain verified
- [ ] Supabase custom SMTP configured with Resend credentials
- [ ] Magic link emails arrive from `hello@yourdomain.com` (not supabase.io)
- [ ] From name shows "[AppName]" not "Supabase"
- [ ] Admin invite emails use the invite template above
- [ ] Magic link template is branded and friendly
- [ ] Emails pass spam checks (use mail-tester.com to verify score ≥ 9/10)

## Files to Create
- None (all configuration is in Supabase Dashboard + Resend Dashboard)

## Notes
- Resend free tier: 3,000 emails/month, 100/day — more than enough for launch
- If you exceed free tier: $20/month for 50,000 emails
- GoDaddy DNS changes propagate within minutes to a few hours
- Test by triggering a magic link sign-in on your staging environment after setup
