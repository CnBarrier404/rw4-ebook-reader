# AGENTS.md

rw4-ebook-reader is an ebook reader project targeting Redmi Watch 4 using Xiaomi Vela JS quick applications.

The Vela JS application lists imported TXT filenames on its black home page using `internal://mass/`. The application name is `电子书` and its package is `com.cnbarrier.ebook`. Tapping a book opens a bounded-memory UTF-8 / BOM-marked UTF-16 reader with per-book progress; there is no bundled novel. See `docs/reader.md` for format, memory bounds, and verification. The mapping to the BIN installer's physical directory still needs Watch 4 verification. Watch 4 crown input remains unverified; do not invent a rotary event or claim simulator scrolling proves hardware support.

## Commands

| Action                                                         | Command                                               |
| :------------------------------------------------------------- | :---------------------------------------------------- |
| Install                                                        | `npm ci`                                              |
| Build                                                          | `npm run build`                                       |
| Release (requires `sign/release/` certificate and private key) | `npx --no-install aiot release`                       |
| Inspect built-in BIN shell                                     | `npm run inspect-bin`                                 |
| Pack TXT to installable BIN                                    | `npm run pack-book -- --input <path> --output <path>` |

Update this table when the application toolchain and validation commands are established. Do not assume commands from another Vela project apply to this repository.

## Repository Structure

| Directory | Responsibility                                                                                                                                                           |
| :-------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/`   | Development research and supporting documentation; `research.md` records device capabilities, installation and book import mechanisms, sources, and unresolved questions |
| `src/`    | Vela application entry, manifest, pages, and bundled resources                                                                                                           |
| `tools/`  | Host-side utilities, including the TXT to watchface BIN packer                                                                                                           |

Use `npm run build` to validate changes to the application skeleton. Build output is written to `build/` and `dist/` and is ignored by Git. Signing material under `sign/` must remain untracked. A successful build does not establish Redmi Watch 4 runtime compatibility.

# Documents

The reader uses vertical swipes for instant page turns: ten fixed text rows with full-height reading and overlay controls, no scrolling list, smooth animation, scroll positioning, or `$nextTick`. The user's Watch 4 runtime lacks `$nextTick`. Keep the page-sized I/O and fixed cache/history limits in `docs/reader.md`; do not reintroduce the continuous-scroll window design. The reference BIN was inspected for interaction only and is not a project dependency.

See `docs/`.
