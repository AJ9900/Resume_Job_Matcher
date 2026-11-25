# Architecture

## Resume Job Matcher (main)
1. **Resume Form** (Form Trigger) - fields `resumeLink` (required), `location` (optional).
2. **Download Resume** (Google Drive, download by URL).
3. **Read Resume Text** (Extract From File, PDF, pages joined) -> `text`.
4. **Build Job Search Query** (Anthropic, max 100 tokens) - one short query: title, skills, location, "jobs hiring". Output in `merged_response`.
5. **Search Job Listings** (Brave web search; quotes stripped from query).
6. **Pick Best Job Matches** (Anthropic, max 4000 tokens) - writes a Markdown report: Candidate Summary, Top Matches table (up to 10), Why These Fit, Next Steps. Only uses URLs from search results.
7. **Save Matches as Word in Drive** (Execute Workflow) - passes `fileName` (`Job_Matches_<timestamp>`) and `content`.

## Save Job Matches to Word (sub-workflow)
1. **When Called by Workflow** - inputs `fileName`, `content`.
2. **Build Word Document Parts** (Code) - converts Markdown (headings, bullets, numbered lists, tables, bold, links) into OOXML parts as binary properties.
3. **Package as docx** (Compression, zip) - zips the parts into a .docx.
4. **Upload to Google Drive** - root folder; error output goes to Return Error.
5. **Return Saved Result** (`fileName`, `fileUrl`, `status: saved`) or **Return Error**.
