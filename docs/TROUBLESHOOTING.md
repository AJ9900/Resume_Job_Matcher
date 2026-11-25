# Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `Workflow is not active and cannot be executed` at the last node | Sub-workflow is unpublished | Publish "Save Job Matches to Word" |
| Download Resume 404 `File not found` | Bad/unshared Drive link | Use a real link your connected account can read |
| Empty / sparse job results | Narrow query or search freshness | Raise `count`, change `freshness`, give a broader location |
| Model not found | `claude-sonnet-5` unavailable on your account | Select an available Anthropic model |
| Word cannot open file | Hand-built OOXML | Open in Google Docs, or report the error |
| Sub-workflow not found after import | IDs differ per instance | Re-select it in the Execute Workflow node |
