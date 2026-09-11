# AGENTS.md

rw4-ebook-reader is an ebook reader project targeting Redmi Watch 4 using Xiaomi Vela JS quick applications.

The project has a minimal Vela JS application with a blank black entry page. The application name is `电子书` and its package is `com.cnbarrier.ebook`. There is no bookshelf, reader, or bundled novel. Watch 4 crown input remains unverified; do not invent a rotary event or claim simulator scrolling proves hardware support.

## Commands

| Action                      | Command                                               |
| :-------------------------- | :---------------------------------------------------- |
| Install                     | `npm ci`                                              |
| Build                       | `npm run build`                                       |
| Inspect built-in BIN shell  | `npm run inspect-bin`                                 |
| Pack TXT to installable BIN | `npm run pack-book -- --input <path> --output <path>` |
| Test                       | Not configured                                        |

Update this table when the application toolchain and validation commands are established. Do not assume commands from another Vela project apply to this repository.

## Repository Structure

| Directory | Responsibility                                                                                                                                                           |
| :-------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/`   | Development research and supporting documentation; `research.md` records device capabilities, installation and book import mechanisms, sources, and unresolved questions |
| `src/`    | Vela application entry, manifest, pages, and bundled resources                                                                                                           |
| `tools/`  | Host-side utilities, including the TXT to watchface BIN packer                                                                                                           |

Use `npm run build` to validate changes to the application skeleton. Build output is written to `build/` and `dist/` and is ignored by Git. Signing material under `sign/` must remain untracked. A successful build does not establish Redmi Watch 4 runtime compatibility.

# Documents

See `docs/`.
