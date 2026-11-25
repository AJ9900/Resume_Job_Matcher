# Resume Job Matcher

An [n8n](https://n8n.io) automation that reads your resume (PDF in Google Drive), searches the web for current job openings that fit it, and saves a job matches report as a **Word (.docx) file in your Google Drive**.

## How it works

```
Form (Drive link + optional location)
  -> Download Resume (Google Drive)
  -> Read Resume Text (PDF extract)
  -> Build Job Search Query (Anthropic)
  -> Search Job Listings (Brave Search, 20 results, past month, country IN)
  -> Pick Best Job Matches (Anthropic -> Markdown report)
  -> Save Matches as Word in Drive (sub-workflow)
        Build docx parts (Code) -> Package as docx (Compression/zip) -> Upload to Google Drive
```

Two workflows live in `workflows/`:

| File | Name | Purpose |
|---|---|---|
| `resume-job-matcher.json` | Resume Job Matcher | Main flow, started by an n8n Form |
| `save-job-matches-to-word.json` | Save Job Matches to Word | Sub-workflow: converts Markdown to .docx and uploads to Drive |

`sdk-source/` holds the TypeScript sources (`@n8n/workflow-sdk`) the JSON files were generated from.

## Quick start

1. In n8n, **Import from File** `workflows/save-job-matches-to-word.json` first, then `workflows/resume-job-matcher.json`.
2. In the main workflow, open **Save Matches as Word in Drive** and re-select the imported sub-workflow (its ID will differ on your instance).
3. Connect credentials (see [docs/SETUP.md](docs/SETUP.md)): Google Drive OAuth2, Anthropic, Brave Search.
4. **Publish the sub-workflow** (a sub-workflow must be active to be called).
5. Open **Resume Form**, run it, paste a Drive PDF link (your account must be able to read it) and optionally a location.
6. Find `Job_Matches_<yyyy-MM-dd_HHmm>.docx` in the root of your Google Drive.

To expose the form publicly, publish the main workflow; the form path is `resume-job-matcher`.

## Documentation

- [docs/SETUP.md](docs/SETUP.md) - credentials, import, configuration
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) - node-by-node description
- [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) - known errors and fixes
- [docs/TESTING.md](docs/TESTING.md) - what was tested and what was not

## Known limitations

- The .docx is generated from hand-built OOXML, so formatting is basic (headings, bullets, tables, bold).
- Job quality depends on web search results; the model is told not to invent listings, but the report is not manually checked.
- The model ID `claude-sonnet-5` was kept from the original file; change it if your Anthropic account does not offer it.
- Credential and sub-workflow IDs are from the original instance; re-select them after import.
