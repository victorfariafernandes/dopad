<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Security

Never read, print, or include the contents of any file that may contain secrets or environment-specific values. This includes:

- `**/*.tfvars` — Terraform variable files
- `**/.env`, `**/.env.*` — environment files
- Any file named `secrets.*`, `credentials.*`, or similar

If a task requires knowing a value from one of these files, ask the user to provide the specific value directly instead of reading the file.
