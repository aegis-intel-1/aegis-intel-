# Aegis Intel

Independent investigation workspace rebuilt from the previous pilot's recorded design and capability inventory. The original workspace could not be recovered. This is a reconstruction, not a byte-identical recovery of the previous commit.

## Local setup

Requires Node 24 or later.

```sh
npm install
npm run browser:install
cp .env.example .env
npm run dev
```

Open http://localhost:5173. The default training workspace has one clearly labeled fictional case. Actual imports, queries, and collections use real inputs. Production requires AEGIS_DEMO=false, an HTTPS APP_URL, OWNER_EMAIL and a unique OWNER_PASSWORD of at least 14 characters, and private persistent storage.

## Included

Case records, identifiers, notes, original-file imports, SHA-256 verification, case-scoped append-only custody chains, PDF reports and ZIP bundles with an offline verifier; public-site discovery, sitemap leads, explicit approval manifests and public Chromium PNG/MHTML/HTML capture; research tools, exact cross-case identifier observations, public-page monitors, and optional unreviewed AI drafts.

Price proposal: $149/month or $1,599/year. Payments are disabled pending commercial entitlements and lifecycle validation. No paid product launch is represented by this code release.

Shadow and Nexus remain separate and unchanged. No original project credentials or investigation data were copied.

## Reconstruction verification

The source is being saved directly through the GitHub connection because the execution environment is unavailable. Automated verification results will be recorded after CI runs. Earlier test results from the previous pilot do not validate this reconstruction.

## Verification and scope

Run `npm run check` and `npm run test:e2e` after installing Chromium. GitHub Actions runs the production frontend build, nine backend tests, four browser scenarios and a dependency audit.

- [Full three-source capability map](docs/CAPABILITIES.md)
- [PC setup, Docker deployment and Chrome companion](docs/DEPLOYMENT.md)
- [Commercial launch work](docs/LAUNCH.md)
- [Reconstruction validation record](docs/VALIDATION.md)

The companion supports explicit active-page PNG/MHTML capture, visible link/date inventory and optional bounded comment expansion. It does not promise complete Facebook histories or all comments. Public screenshots are limited to 50,000 pixels. System time and local custody hashes are not trusted timestamping or external signatures.
