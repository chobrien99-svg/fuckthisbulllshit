# fuckthisbullshit.org

A parody open letter. Static site plus two tiny serverless functions that
collect signatures, hosted on Vercel.

## What's where

| Path | What it is |
| --- | --- |
| `public/index.html` | The page. All the words live here. |
| `public/styles.css` | Colours, fonts, spacing (copied from the design mockup). |
| `public/config.js` | **Edit this** to fill in your X handle, platform, contact email, etc. |
| `public/app.js` | Makes the form and the live count work. |
| `api/sign.js` | Receives a signature (`POST /api/sign`). |
| `api/signatures.js` | Returns the count and latest names (`GET /api/signatures`). |
| `lib/store.js` | Talks to the database. |
| `design-reference/` | The original design mockup. Not deployed. |

## Deploying to Vercel

1. On vercel.com, **Add New → Project**, pick this GitHub repo, and click
   **Deploy**. No settings to change: `vercel.json` already tells Vercel
   what to do.
2. In the project, open **Storage → Create Database → Upstash for Redis**
   (free tier is fine) and **connect it to the project**. That adds the
   `KV_REST_API_URL` and `KV_REST_API_TOKEN` environment variables for you.
3. **Redeploy** (Deployments → ⋯ → Redeploy) so the functions pick up the
   new variables.
4. Optional: **Settings → Domains** to add `fuckthisbullshit.org`.

Until step 2 is done the page still works; the counter shows "—" and the
form says signing opens shortly.

## Editing

- **Placeholders** (`[YOUR X HANDLE]`, `[YOUR CONTACT EMAIL]`…): fill them
  in `public/config.js`.
- **Add a fact** to "The record": copy one `<div class="fact">…</div>` block
  in `public/index.html` and change the date, sentence and link.
- **Signatures under the letter are anonymous**: only the role is shown,
  and names are never sent to visitors' browsers. To hide the list
  entirely, set `showSignerList: false` in `public/config.js`.

## Signatures and privacy

- One signature per email address (emails are matched case-insensitively).
- At most 10 signatures per hour from one IP address, plus a hidden spam
  trap field.
- Names containing links are rejected.
- The full list (name, email, role, time) is in the Redis hash
  `ftb:signatures`; you can browse it in the Upstash console. To delete
  someone, remove their entry there and from the `ftb:emails` set and
  `ftb:recent` list.
