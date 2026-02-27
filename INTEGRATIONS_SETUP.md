# Integrations Setup Guide

## Google Calendar + Google Meet

### Environment Variables

```env
GOOGLE_CLIENT_ID=                    # Google OAuth 2.0 Client ID
GOOGLE_CLIENT_SECRET=                # Google OAuth 2.0 Client Secret
```

### Setup Steps

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create or select a project
3. Enable the **Google Calendar API** (APIs & Services > Library > search "Google Calendar API")
4. Create an **OAuth 2.0 Client ID** (type: Web application)
5. Add authorized redirect URI: `{YOUR_APP_URL}/api/integrations/google/callback`
   - Local dev: `http://localhost:8080/api/integrations/google/callback`
   - Production: `https://yourdomain.com/api/integrations/google/callback`
6. Copy the Client ID and Client Secret into your `.env`
7. In the admin panel, go to **Settings > Integrations** and click **Connect** to complete the OAuth flow
8. The refresh token is stored in the database automatically

---

## Zoom (Server-to-Server OAuth)

### Environment Variables

```env
ZOOM_ACCOUNT_ID=                     # Zoom Account ID
ZOOM_CLIENT_ID=                      # Zoom S2S Client ID
ZOOM_CLIENT_SECRET=                  # Zoom S2S Client Secret
```

### Setup Steps

1. Go to [Zoom Marketplace](https://marketplace.zoom.us/develop/create)
2. Create a **Server-to-Server OAuth** app
3. Add the required scope: `meeting:write:admin`
4. Copy Account ID, Client ID, and Client Secret into your `.env`

**Alternative:** You can skip the `.env` and enter credentials directly in the admin panel at **Settings > Integrations > Zoom**. Environment variables take precedence if both are set.

---

## Meeting Provider Selection

After configuring credentials, go to **Settings > Integrations > Meeting Provider** and select one:

| Provider       | Description                                      |
|----------------|--------------------------------------------------|
| **None**       | No meeting links — for in-person or manual setup |
| **Google Meet**| Auto-creates Google Meet links (requires Google Calendar connected) |
| **Zoom**       | Auto-creates Zoom meetings via S2S OAuth         |

When someone books an appointment, the meeting link is auto-generated and saved to the appointment's `meeting_url` field.

---

## How It Works

- **Booking created** → meeting link generated + Google Calendar event created (if connected)
- **Booking rescheduled** → external meeting and calendar event updated
- **Booking cancelled** → external meeting and calendar event deleted
- Integration errors are **non-blocking** — if a meeting service fails, the booking still succeeds
