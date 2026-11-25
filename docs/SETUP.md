# Setup

## Requirements
- An n8n instance (cloud or self-hosted) with the Anthropic (LangChain) and Brave Search nodes available.
- Google account with Drive access.

## Credentials
| Node | Credential type | Notes |
|---|---|---|
| Download Resume, Upload to Google Drive | Google Drive OAuth2 API | Create via n8n credential UI; follow n8n's Google OAuth guide |
| Build Job Search Query, Pick Best Job Matches | Anthropic API | API key from console.anthropic.com |
| Search Job Listings | Brave Search API | Key from brave.com/search/api |

On n8n Cloud, AI/Brave nodes can use managed "Gateway credits" instead of your own keys.

## Import order
1. `workflows/save-job-matches-to-word.json` (sub-workflow). Attach Google Drive credential, then publish it.
2. `workflows/resume-job-matcher.json`. Attach credentials, re-select the sub-workflow in the last node.

## Configurable values
- Form path: `resume-job-matcher` (Resume Form > Options).
- Search: `count` 20, `freshness` past month (`pm`), `country` IN (Search Job Listings).
- Models and max tokens: both Anthropic nodes.
- Upload folder: Drive root (Upload to Google Drive > Folder).
