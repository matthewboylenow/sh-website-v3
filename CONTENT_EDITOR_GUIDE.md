# Saint Helen 3.0 — Content Editor Guide

A practical playbook for parish staff using the admin to keep the
website current. No code knowledge required. If the admin disagrees
with this guide, the admin wins — flag the gap and we'll update.

---

## 1 · Signing in

1. Visit **`/admin`** (e.g. `https://sainthelen.org/admin`).
2. Choose **Email** or **SMS** at the sign-in screen.
   - **Email** sends a magic link to your inbox — tap the link to log in.
   - **SMS** sends a 6-digit code to your phone — type it back.
3. After sign-in you land on the dashboard with content tiles.

If the magic-link email doesn't arrive, check your spam folder. If the
SMS code doesn't arrive within a minute, contact your admin to verify
your phone number is set on **`/admin/account`**.

---

## 2 · The dashboard at a glance

The left rail groups admin tools into sections.

- **Content** — events, ministries, staff, bulletins, posts, formation pages, seasonal banners.
- **Homepage** — hero settings + the homepage block layout.
- **Inquiries** — incoming "Get Involved" forms from the public site.
- **Approvals** — ministry-lead self-edits awaiting your review (admins only).
- **Settings** — site-wide branding, navigation, taxonomies, redirects, announcements, giving URLs.
- **Account** — your name, phone, preferred sign-in.

What you see depends on your role:

| Role | Can edit | Can publish | Can manage settings |
|---|---|---|---|
| **admin** | everything | yes | yes |
| **editor** | events, ministries, staff, bulletins, posts, etc. | yes | no |
| **ministry_lead** | only their own ministry's listing (when self-service is on) | submits for approval | no |

---

## 3 · Common tasks

### Add a new event

1. Go to **Content → Events → + New event**.
2. Fill in title, summary, body, start/end times, location.
3. **Photo** — drop an image or pick from the media library. Add alt text describing what's in the photo (used by screen readers + SEO).
4. **Audiences / categories** — pick from the chip lists. (Add new tags via Settings → Taxonomies.)
5. **Recurrence** — leave blank for one-off events; otherwise pick weekly / monthly / nth-weekday-of-month.
6. **Featured** — tick to surface on the homepage.
7. **Status** — Draft (private), Published (live), or Archived (hidden).
8. Click **Save**.

The event is live the moment you save with status = Published. The homepage and `/events` page refresh automatically — no cache to bust.

### Edit the homepage

Go to **Homepage** in the rail. Two halves:

- **Hero** — video URL, eyebrow, title, lede, CTA buttons, and the Mass-times peek.
- **Sections** — every block below the hero, in order. Add, reorder, or remove blocks.

Each block has its own editor — pastor welcome, featured ministries, featured events, card grids, podcast episodes, callouts, etc. Use **Preview** on a block to see how it'll render before saving.

The homepage updates the moment you click **Save layout**.

### Upload a bulletin

1. **Content → Bulletins → + New bulletin**.
2. Pick the **Week of** date (Sunday).
3. Drop the PDF.
4. Save. Done — bulletin shows up on `/bulletin` immediately.

The unique-week-of constraint blocks duplicate uploads for the same Sunday. Edit the existing row instead.

### Customize the navigation

**Settings → Navigation.** Up to 8 top-level items, each can be a plain link or a 3-column mega-menu with link sections + a feature card.

### Add a custom redirect

**Settings → Redirects.** Useful for keeping old URLs (e.g. `/youth → /ministries/youth-ministry`). Permanent (308) for legacy URLs; temporary (307) for short-term promos.

### Add an announcement

**Settings → Announcements.** Two kinds:

- **Slide-in** — small bottom-right card. Good for nudges.
- **Modal** — full-screen overlay. For high-priority alerts.

Set a date window. Visitors see the highest-priority active announcement; once dismissed it stays hidden for `dismissDays`.

### Update the logo or favicon

**Settings → Site settings → Branding.**

- **Logo** — header pill icon. PNG or SVG with transparent background works best.
- **Favicon** — browser-tab icon. 32×32 or 64×64 PNG.
- **Apple touch icon** — iOS home-screen icon. 180×180 PNG. Optional.

After saving, give it a hard refresh (Cmd-Shift-R / Ctrl-Shift-F5) to see the new favicon.

### Edit a ministry page

**Content → Ministries → click the ministry → Edit details** for the
listing. Click **Sections** to edit the block-based content below.

To customize the "Get involved" form, scroll to **Inquiry config** in the
ministry editor — toggle which buttons appear (Join, Inquire, Volunteer)
and add custom questions (text fields, radios, checkboxes, dropdowns).

### Respond to an inquiry

**Inquiries** in the rail (admins + ministry leads see different scopes).

You also get an **email** with one-click action buttons: **Mark as
contacted**, **Mark as stuck**, **Close**. Clicking takes you to a
confirmation page; one more click applies the change.

In the dashboard, click an inquiry to see the timeline (every status
change + note + magic-link click), update the status, leave internal
notes, or reassign.

---

## 4 · Working with photos

- **Drop or click to choose** uploads from your computer. Files go to
  Vercel Blob (CDN-backed), so they load fast worldwide.
- **From library** opens the media picker — re-use a photo you already
  uploaded. Search by file name, alt text, or caption.
- **Alt text matters.** Describe what's in the photo. Screen readers
  read it aloud; Google uses it for SEO. ("Saint Helen Sunday Mass
  congregation singing" beats "image-1.jpg".)
- The **Media library** at `/admin/media` shows every uploaded file
  with previews. Delete unused files there. The system blocks deletion
  if a file is still referenced by a published page.

---

## 5 · The block editor

Used on ministry pages, formation pages, and the homepage. Each block
is a building unit — add, drag (when drag-drop ships), or remove. Each
block has an inline **Preview** toggle so you can see the result
before saving the page.

Blocks available today:

| Block | Use it for |
|---|---|
| **Heading** | A big, optionally centered, eyebrow + title + lede + rust rule. |
| **Rich text** | Paragraphs, lists, links, embedded images. |
| **Image** | Single image with optional caption + link. |
| **Image + text** | Side-by-side photo + paragraph. Good for spotlights. |
| **Image gallery** | 2- or 3-column gallery. |
| **Link list** | Bulleted list of outbound links with optional icons. |
| **Button group** | Up to 8 CTAs side-by-side. |
| **Video** | MP4 / HLS / YouTube / Vimeo. |
| **Embed** | YouTube, Vimeo, Spotify, Apple Podcasts, Google Forms, Eventbrite, SignUpGenius, Touchpoint, generic iframe. |
| **Card grid** | 1–12 cards. Choose **Uniform** layout or **Bento** (2 large + tile row). Bento tiles can show a curated icon instead of a photo. |
| **Staff card** | Pull a staff record by name. |
| **Callout banner** | Color-toned strip with title, body, CTA button. |
| **Featured ministries** | Auto-pulls live ministries (spotlight / random / manual). |
| **Featured events** | Auto-pulls upcoming events (with optional category filter). |
| **Podcast episode** | Spotify or Apple Podcasts player. |
| **Pastor welcome** | The pastor's letter block (video or photo + signature). |
| **Columns** | Two- or three-column layout that nests other blocks (one level deep). |

### Section headings

Every block has an optional **header** — Eyebrow + Heading + Lede +
Align. The header renders the same way as the Saint Helen mockup's
display heads (rust rule under the title). Use the **center** alignment
for hero-style sections; left for everything else.

### Bento tile icons

Card-grid blocks set to **Bento** layout render the first two cards as
large feature cards and the remaining cards as compact tiles. The tiles
support **icons** in place of photos — pick from the curated 200+
parish-friendly icon set. Search by what you mean ("welcome", "youth",
"baptism", "coffee", "small group") and the matching icons surface.

---

## 6 · Publishing checklist

Before clicking **Publish** on any new page or section:

- [ ] Title is concise (under 60 characters for SEO).
- [ ] Summary / lede gives a one-line "what is this and why care."
- [ ] Hero photo is bound and has alt text.
- [ ] Outbound links open in new tabs (the system handles this automatically for `https://` URLs).
- [ ] If the URL is sensitive (e.g. a Touchpoint giving page), it's set in **Settings → Giving** — don't paste raw Touchpoint URLs into block content.
- [ ] If you're an editor and the page is for a ministry-led group, ping the ministry lead before publishing.

---

## 7 · Audit trail

Every save records **last edited by + last edited at**. Look for the
"by Name" line under the **Updated** column on admin lists (events
shows it today; other content types follow). This lets you know who
last touched a row before you do.

Approvals from ministry leads go through the **Approvals** queue
instead — admins/editors review side-by-side diffs before applying.

---

## 8 · When things go wrong

- **A photo won't upload.** Check file size (< 15 MB) and type (JPG, PNG, WebP, AVIF, or PDF for bulletins).
- **The page picker doesn't open.** Hard refresh; if still broken, check the browser's permission for popups.
- **A block "disappears" on save.** Check the block's required fields (e.g. an Image block with no image bound is hidden on the public page).
- **The homepage didn't update.** Hard refresh. Cache normally clears within 60 seconds; if not, save the homepage layout again — every save invalidates the cache.

If a feature is missing or feels wrong, let the dev team know in your
usual channel. The site is purpose-built for Saint Helen — we can
shape it to how the parish actually works.
