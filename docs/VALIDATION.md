# Reconstruction validation

Verified on November 3, 2026 (America/Chicago), in [GitHub Actions run 41781422669](https://github.com/aegis-intel-1/aegis-intel-/actions/runs/41781422669). The tested source was 968edd59265b4dc01a11488ec55cae1c68720dd0; the generated dependency lock and interface screenshot are retained in this repository. Subsequent lockfile-only, CI installation-command and documentation changes receive their own CI run.

| Check | Result |
|---|---|
| Vite production build | Passed |
| Backend tests | 9 passed |
| Auth/origin/session behavior | Anonymous access rejected, cross-origin mutation rejected, secure cookie flags verified |
| Ownership and browser pairing | Cross-account case access rejected; companion token revocation effective |
| Evidence | Exact bytes/hash verification; tampered and missing originals rejected |
| Custody | Case-scoped chain consistent; SQL updates/deletions rejected |
| Approval | Unavailable/unknown sources rejected; repeat approval rejected; approval hash verified |
| PDF | Collection record generated with PDF signature |
| Browser scenarios | 4 passed: case/identifier/note/import/verification/ZIP download; preserved research result and graph; all 12 routes without exceptions; mobile width |
| Companion code | Background and popup JavaScript syntax passed |
| Dependency audit | Passed at moderate threshold; patched archive helper override retained |
| Screenshot | Captured with Playwright at 1440px desktop width and visually inspected via the GitHub image; hierarchy, spacing, labels, colors and primary controls reviewed |
| Mobile layout | 390px viewport passed overflow and navigation checks |

The previous execution environment failed, so this is recreated source, not a byte-identical recovery of v0.1. Previous tests and screenshots are not attributed to this release.

The local browser-control tool was not exposed and the execution environment was unavailable; Playwright on GitHub Actions was used for browser verification. The screenshot contains fictional training data and the controlled verification case.

Live public-site capture, actual Chrome companion capture, optional paid providers/OpenAI, Docker runtime, 20k-page scale, external timestamping and commercial billing have not been revalidated in this reconstruction. Checkout is disabled. See CAPABILITIES.md and LAUNCH.md for remaining scope.

A targeted override uses minimatch 11.0.1 for readdir-glob. That helper consumes the named Minimatch constructor and match method, which remain available; the implemented ZIP export path passes the browser download scenario. The application exports explicit files rather than accepting user-controlled filesystem glob expressions.
