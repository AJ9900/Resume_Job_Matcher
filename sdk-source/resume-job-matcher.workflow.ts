import { workflow, node, trigger, newCredential, expr } from '@n8n/workflow-sdk';

const form = trigger({
  type: 'n8n-nodes-base.formTrigger',
  version: 2.6,
  config: {
    name: 'Resume Form',
    parameters: {
      formTitle: 'Find Jobs for My Resume',
      formDescription: 'Paste the Google Drive link to your resume PDF. Matching jobs will be saved as a Word file in your Google Drive.',
      formFields: {
        values: [
          { fieldLabel: 'Resume Google Drive link (PDF)', fieldName: 'resumeLink', placeholder: 'https://drive.google.com/file/d/.../view', requiredField: true },
          { fieldLabel: 'Preferred job location (optional)', fieldName: 'location', placeholder: 'e.g. Bengaluru, Remote, India' },
        ],
      },
      options: {
        path: 'resume-job-matcher',
        respondWithOptions: { values: { respondWith: 'text', formSubmittedText: 'Thanks! Your job matches will be saved as a Word file in your Google Drive in about a minute.' } },
      },
    },
  },
});

const download = node({
  type: 'n8n-nodes-base.googleDrive',
  version: 3,
  config: {
    name: 'Download Resume',
    parameters: {
      resource: 'file',
      operation: 'download',
      fileId: { __rl: true, mode: 'url', value: expr('{{ $json.resumeLink }}') },
      options: {},
    },
    credentials: { googleDriveOAuth2Api: newCredential('Google Drive account') },
  },
});

const readPdf = node({
  type: 'n8n-nodes-base.extractFromFile',
  version: 1.2,
  config: { name: 'Read Resume Text', parameters: { operation: 'pdf', options: { joinPages: true } } },
});

const buildQuery = node({
  type: '@n8n/n8n-nodes-langchain.anthropic',
  version: 1,
  config: {
    name: 'Build Job Search Query',
    parameters: {
      resource: 'text',
      operation: 'message',
      modelId: { __rl: true, mode: 'list', value: 'claude-sonnet-5', cachedResultName: 'claude-sonnet-5' },
      messages: {
        values: [
          {
            content: expr(
              'Read this resume and write ONE short web search query (max 12 words) to find current job openings that fit this person best. Include the best-fit job title, 1-2 key skills, the location, and the words "jobs hiring". Preferred location: {{ $("Resume Form").item.json.location || "use the location from the resume, else India" }}.\nReply with only the query text, nothing else.\n\nRESUME:\n{{ $json.text }}',
            ),
          },
        ],
      },
      options: { includeMergedResponse: true, maxTokens: 100 },
    },
    credentials: { anthropicApi: newCredential('Anthropic account') },
  },
});

const search = node({
  type: '@brave/n8n-nodes-brave-search.braveSearch',
  version: 1.1,
  config: {
    name: 'Search Job Listings',
    parameters: {
      operation: 'web',
      query: expr('{{ $json.merged_response.trim().replace(/^"|"$/g, "") }}'),
      count: 20,
      additionalParameters: { country: 'IN', freshness: 'pm' },
    },
    credentials: { braveSearchApi: newCredential('Brave Search account') },
  },
});

const pick = node({
  type: '@n8n/n8n-nodes-langchain.anthropic',
  version: 1,
  config: {
    name: 'Pick Best Job Matches',
    executeOnce: true,
    parameters: {
      resource: 'text',
      operation: 'message',
      modelId: { __rl: true, mode: 'list', value: 'claude-sonnet-5', cachedResultName: 'claude-sonnet-5' },
      messages: {
        values: [
          {
            content: expr(
              'You are a career assistant. Compare the RESUME with the SEARCH RESULTS and write a job matches report in Markdown.\n\nRules:\n- Only use jobs/listing pages that appear in the SEARCH RESULTS. Never invent companies, jobs or links.\n- Start with "# Job Matches - {{ $now.toFormat("d LLL yyyy") }}".\n- Add "## Candidate Summary" with 3 bullet points (target role, key skills, experience).\n- Add "## Top Matches" as a Markdown table with columns: | Role | Company / Site | Location | Match % | Link |. Up to 10 rows, best first.\n- Add "## Why These Fit" with one bullet per job, using **bold** for the role.\n- Add "## Next Steps" as a numbered list of 3 tips to improve the resume for these roles.\n- If no real job listings are in the results, say so plainly under Top Matches.\nReply with only the Markdown.\n\nRESUME:\n{{ $("Read Resume Text").first().json.text }}\n\nSEARCH QUERY: {{ $("Build Job Search Query").first().json.merged_response }}\n\nSEARCH RESULTS (JSON):\n{{ JSON.stringify($("Search Job Listings").all().map(i => i.json)).slice(0, 30000) }}',
            ),
          },
        ],
      },
      options: { includeMergedResponse: true, maxTokens: 4000 },
    },
    credentials: { anthropicApi: newCredential('Anthropic account') },
  },
});

const save = node({
  type: 'n8n-nodes-base.executeWorkflow',
  version: 1.4,
  config: {
    name: 'Save Matches as Word in Drive',
    parameters: {
      source: 'database',
      workflowId: { __rl: true, mode: 'list', value: 'igBcEKewnveBvNae', cachedResultName: 'Save Job Matches to Word' },
      workflowInputs: {
        mappingMode: 'defineBelow',
        value: {
          fileName: expr('Job_Matches_{{ $now.toFormat("yyyy-MM-dd_HHmm") }}'),
          content: expr('{{ $json.merged_response }}'),
        },
        matchingColumns: [],
        schema: [
          { id: 'fileName', displayName: 'fileName', required: false, defaultMatch: false, display: true, canBeUsedToMatch: true, type: 'string' },
          { id: 'content', displayName: 'content', required: false, defaultMatch: false, display: true, canBeUsedToMatch: true, type: 'string' },
        ],
        attemptToConvertTypes: false,
      },
      options: { waitForSubWorkflow: true },
    },
  },
});

export default workflow('resume-job-matcher', 'Resume Job Matcher')
  .add(form)
  .to(download)
  .to(readPdf)
  .to(buildQuery)
  .to(search)
  .to(pick)
  .to(save);
