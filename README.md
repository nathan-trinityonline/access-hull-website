# Access:Hull website (production build)

Static site built with [Astro](https://astro.build) from the approved prototype in `../src` and `../index.html`.
The look, content and behaviour match the prototype; each page now has its own URL.

## Run it

```
npm install
npm run dev      # local preview at http://localhost:4321
npm run build    # static site in dist/
npm run check    # type and content checks (run before deploying)
```

## Where things live

| What | Where |
| --- | --- |
| Design tokens and all CSS | `src/styles/site.css` (tokens at the top of `:root`) |
| Header, footer, cookie banner | `src/components/Header.astro`, `src/components/Footer.astro` |
| Page shell, meta tags, Open Graph | `src/layouts/Base.astro` |
| Pages | `src/pages/*.astro` (`/social-tariffs/`, `/find-help/`, `/donate-a-device/`, `/partner/`, `/contact/`, `/news/`, policy pages) |
| News and guides | `src/content/news/*.md`, one Markdown file per article; the file name is the URL |
| Venues for Find help | `src/data/venues.json` |
| Contact details (footer, contact, donate, policy pages) | `src/data/contact.json` |
| Content editor (Decap CMS) | `public/admin/config.yml` (settings), `public/admin/preview.js`, `src/pages/admin/index.astro` (builds the settings into the page, since SiteGround blocks `.yml` files) |
| Ward map data and script | `public/js/ward-data.js`, `public/js/ward-map.js` |
| Page scripts | `public/js/*.js` (`site.js` runs on every page) |
| Logos and share image | `public/assets/` |

Montserrat is self-hosted through `@fontsource/montserrat`. A sitemap (`/sitemap-index.xml`) and `robots.txt` are generated at build time.

### Adding a news article

Create `src/content/news/my-article.md`:

```
---
title: "Article title"
dek: "One or two sentence summary shown on cards and in search results."
category: "Guides"            # or "Data & insight"
date: 2026-10-15
cta:
  label: "Find help near you"
  href: "/find-help/"
---
Body in Markdown. HTML blocks such as <div class="bp-stat">, <div class="bp-take"> and <p class="bp-src"> still work.
```

Add `draft: true` to hide it.

## Hosting (SiteGround)

The site is plain files plus two small PHP scripts, hosted on SiteGround. GitHub holds the code; every change to the `main` branch (including each publish from the content editor) runs `.github/workflows/deploy.yml`, which checks and builds the site and uploads `dist/` to SiteGround over SSH.

The SiteGround host, user, folder, domain and form recipients are set at the top of the workflow file (`env:`). The deploy also writes `api/config.php` (form recipients, sender address, editor sign-in) from those settings and the secrets below, so nothing needs editing on the server and no secret is ever committed.

One-off setup in GitHub → Settings → Secrets and variables → Actions:
1. **Secret `SG_SSH_KEY`**: the private key from SiteGround Site Tools → Devs → SSH Keys Manager (Actions → Private Key).
2. **Secret `SG_SSH_PASSPHRASE`**: that key's password.
3. **Secret `DECAP_GITHUB_CLIENT_SECRET`** and **variable `DECAP_GITHUB_CLIENT_ID`**: from the GitHub OAuth app (see Content editor below).
4. **Sender address**: create the mailbox named in `MAIL_FROM` in Site Tools → Email → Accounts so form emails come from your own domain.

The upload step is skipped until `SG_SSH_KEY` exists, so the build still runs and checks every change before then.

`public/.htaccess` sets HTTPS, the 404 page, caching and security headers.

### Forms

The contact, partner and donate-a-device forms post to `/api/form.php`, which emails them. Each form has its own recipients (`MAIL_TO_*` in the workflow file). Spam protection: a hidden honeypot field and a limit of 5 submissions per visitor every 10 minutes. Without JavaScript, visitors land on `/thank-you/`.

## Content editor (Decap CMS)

Editors use `/admin/` to write news articles, update contact details and manage the Find help places. Publishing saves to GitHub, and the site updates a few minutes later once the deploy has run.

To switch it on:
1. In GitHub → Settings → Developer settings → OAuth Apps, create an app with homepage `https://accesshull.co.uk` and callback URL `https://accesshull.co.uk/api/auth.php`.
2. Save its client ID as the Actions variable `DECAP_GITHUB_CLIENT_ID` and a client secret as the Actions secret `DECAP_GITHUB_CLIENT_SECRET`, then re-run the deploy.
3. Give each editor a GitHub account with write access to the repository.

`publish_mode: editorial_workflow` gives editors Draft, In review and Ready columns before anything goes live. Remove that line to publish straight away.

## Postcode search

`/find-help/` geocodes the visitor's postcode with [postcodes.io](https://postcodes.io) (free, no key) and sorts places by real distance. If postcodes.io can't be reached it falls back to the original district matching (HU7, then neighbouring districts). The homepage postcode box links to `/find-help/?pc=…`.

## Still needed from the client

Search the code for these placeholders and replace them:

- Phone and office address: hidden for now (empty in `src/data/contact.json`). Fill them in with the content editor to show them again
- Privacy notice: placeholders removed for now; add the legal name, registered address, ICO registration number and data protection contact when known. Terms of use: `[legal name of the organisation]`
- Accessibility statement: `[Add details of any independent accessibility audit]`
- Donate a device: confirm age limits, the 10+ device collection threshold and data-wipe certificates
- Real photography to replace the placeholder article artwork (`src/components/Thumb.astro`)
- An analytics tool, if wanted: add it in the `ahConsent.on('analytics', …)` hook in `public/js/site.js` so it only runs after consent
