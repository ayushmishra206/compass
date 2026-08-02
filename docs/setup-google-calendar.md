# Connecting Google Calendar

Compass reads your calendar with your own Google OAuth client, so calendar data
travels between Google and your browser only. Nothing passes through a Compass
server — there isn't one.

This is a one-time setup, roughly ten minutes.

---

## 1. Get the extension ID

Load the extension unpacked first, because the redirect URI depends on its ID.

```bash
pnpm build
```

Then in Chrome: **chrome://extensions** → enable **Developer mode** → **Load
unpacked** → select `apps/extension/.output/chrome-mv3`.

Copy the extension ID shown on the card. Your redirect URI is:

```
https://<EXTENSION_ID>.chromiumapp.org/
```

The trailing slash matters.

> The ID changes if you remove and re-add the extension. If sign-in later fails
> with `redirect_uri_mismatch`, come back and check this first.

---

## 2. Create a Google Cloud project

1. Go to [console.cloud.google.com](https://console.cloud.google.com/).
2. Create a new project — name it anything (`compass-personal` works).
3. **APIs & Services → Library** → search **Google Calendar API** → **Enable**.

---

## 3. Configure the consent screen

**APIs & Services → OAuth consent screen**

- User type: **External**
- App name: `Compass`
- User support email and developer contact: your own address
- **Scopes:** add `.../auth/calendar.readonly` and `.../auth/userinfo.email`
- **Test users:** add your own Google account

Leave the app in **Testing**. Do not click "Publish app".

> Testing mode allows up to 100 test users and needs no verification or CASA
> review. Publishing would trigger Google's review process, which matters only
> if you distribute the extension to strangers.

---

## 4. Create the OAuth client

**APIs & Services → Credentials → Create credentials → OAuth client ID**

- Application type: **Web application**
- Name: `Compass extension`
- **Authorized redirect URIs:** add the `https://<EXTENSION_ID>.chromiumapp.org/`
  URI from step 1

Copy the **client ID**. It ends in `.apps.googleusercontent.com`.

> "Web application" is correct here, not "Chrome extension". The Chrome
> extension type is for `chrome.identity.getAuthToken`, which only issues tokens
> for the signed-in Chrome profile and gives no refresh token. Compass uses the
> PKCE flow so the same code path works on Firefox.

You do **not** need the client secret. Compass never sends one — an extension
cannot keep a secret, which is exactly why PKCE exists.

---

## 5. Connect

Open a new tab, then **Profile → Calendar**. Paste the client ID and click
**Connect Google Calendar**. Approve the consent screen.

You will see an "unverified app" warning — expected for an app in Testing.
Choose **Advanced → Go to Compass (unsafe)**. It is your own OAuth client
requesting read-only access to your own calendar.

Today's events should appear in the Today drawer, and tomorrow's morning brief
will be grounded in your real schedule.

---

## Troubleshooting

| Symptom                                 | Cause and fix                                                                                                                                    |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `redirect_uri_mismatch`                 | The extension ID changed, or the trailing slash is missing. Re-copy the ID and update the client.                                                |
| "Google did not return a refresh token" | A prior grant is still live. Remove Compass at [myaccount.google.com/permissions](https://myaccount.google.com/permissions), then connect again. |
| `access_denied`                         | Your account is not in the test-user list, or you dismissed the consent screen.                                                                  |
| Connected, but no events                | The window is 1 day back to 14 days forward. An empty result really can mean an empty calendar.                                                  |
| Events vanished after working           | Access was revoked at Google. Compass clears the grant when it sees this; reconnect.                                                             |

---

## What Compass can and cannot do with this

**Can:** read event times, titles, locations, attendee lists, and conference
links from your primary calendar.

**Cannot:** create, edit, or delete events. The grant is `calendar.readonly`.
Writing would require a different scope that is not requested anywhere in the
codebase.

Event data is stored in the extension's local SQLite database. Your refresh
token is encrypted at rest if you have enabled passphrase encryption in
**Profile → Encryption**; access tokens live in session storage and are dropped
when the browser closes.

Disconnect at any time from **Profile → Calendar**, and revoke independently at
[myaccount.google.com/permissions](https://myaccount.google.com/permissions).
