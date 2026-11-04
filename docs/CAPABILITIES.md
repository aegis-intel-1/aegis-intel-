# Three-source capability inventory

Reconstruction based on the research recorded October 2, 2026. Sources: [Forensic OSINT Elite Assisted Capture](https://www.forensicosint.com/elite-assisted-capture), [OSINT Shadow](https://github.com/tjksecurity/osintshadow) at 163a22b3d290eb425128b2bf7795682d5c27b1bf, and the user's Insight Nexus project at 5254dadc62c252c68982b4ea5dc70782c71730f3.

This is an independent reconstruction. Previous source files could not be retrieved. Earlier validation results must not be attributed to this release. See VALIDATION.md.

| Capability from the three sources | Reconstruction status |
|---|---|
| Case management, identifiers, notes, original evidence | Implemented, owner-isolated SQLite records |
| Discovery, sitemap/robots leads, provenance | Implemented bounded same-origin HTML crawl; robots leads unselected |
| 20k discovery / 8 concurrency | Enumeration ceiling and concurrency implemented; no scale benchmark |
| JavaScript/session discovery | Companion preserves current visible DOM links and dates; server crawl uses response HTML |
| Email, phone, document, social, tracking intelligence | Implemented observations with source provenance; addresses, SWIFT/VAT/license registries remain planned |
| Immutable approval, pause/stop/resume/reconciliation | Public collection implemented; browser queue and per-item skip/retry planned |
| Full-page PNG/MHTML/HTML/metadata | Public Chromium implemented; browser companion PNG/MHTML/metadata implemented |
| 500-screen capture, lazy loading, stitched timelines | 50,000px limit in this build; segmentation/stitching planned |
| Wrong-tab/URL safeguards | Companion active-tab and URL checks; public collector refuses changed top-level URL |
| Facebook date-range historical capture / all comments | Visible-link/date inventory and optional four-pass expansion only; historical scan/date attribution and completeness validation pending |
| Posting cadence and timeline heatmaps | Planned |
| SHA-256 / custody / export verification | Original-byte hashing; separate case hash chains; PDF/ZIP/offline verifier implemented |
| Independent timestamps / signatures / object lock | Planned; system clock and local hashes are not substitutes |
| OCR, redaction, searchable PDF, Word exhibits | Planned; originals remain separate from reports |
| Keyword alerts / full-content search | Title/source/tag filtering implemented; OCR indexing and keyword monitoring planned |
| Domain/DNS/RDAP/certificate transparency | Implemented public tools and combined workflow |
| Username checks | Twelve public platforms; candidates/inconclusive only, no identity confirmation |
| Email headers, timestamps, hashes, JWT, encodings | Implemented; JWT and reported email authentication claims are unverified |
| EXIF/GPS and reverse image search | Not reconstructed yet; provider/local parser work remains |
| Phone intelligence | E.164-shape normalization; carrier/subscriber data requires provider |
| GitHub public profiles, CVEs, public Bitcoin summary | Implemented public queries |
| Breach and Shodan | Adapters require dedicated keys; not validated with paid credentials |
| PDL, registries, court/property/vehicle records | Licensed provider adapters required |
| WiGLE, radio, dark web/paste search, historical WHOIS | Planned/provider-dependent |
| Personas, associates, identity confidence and clustering | Exact cross-case identifiers and membership graph only; advanced engines planned |
| Infrastructure/identity correlations, deconfliction | Exact overlap observations; explainable analytical engines planned |
| Agents and configurable pipelines | Deliberate DNS/RDAP/CT workflow only; agent/pipeline builder planned |
| Monitors | Public response-byte hashes while the single server is running; advanced alerts pending |
| AI reports/chat | Optional explicit-consent OpenAI draft, preserved as unreviewed; interactive research chat planned |
| Organizations, roles, SSO, collaboration | Owner-isolated accounts; organization membership, granular roles and invitations planned |
| Stripe / entitlement enforcement / API | Signed webhook intake and authenticated API; checkout disabled, commercial lifecycle/metering pending |
| Field guide and training | Included; clearly fictional training seed, no synthetic research results |
| Expert declarations, legal guarantees, reimbursement | Not offered; requires actual expertise, contracts and funded support |

The source builds were read-only references. Their services, databases, secrets, private case data, and deployments were not copied or altered. Capability names describe scope; they do not establish runtime correctness or legal admissibility.
