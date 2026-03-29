# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 1.0.x   | ✅ Yes    |

## Reporting a Vulnerability

If you discover a security vulnerability in SubtitleForge, please report it responsibly:

1. **Do NOT** open a public GitHub Issue for security vulnerabilities
2. **Email** the maintainer directly or use [GitHub's private vulnerability reporting](../../security/advisories/new)
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

We will acknowledge receipt within **48 hours** and aim to provide a fix within **7 days** for critical issues.

## Security Considerations

### API Key Protection

- The OpenAI API key is stored server-side in a `.env` file
- The `.env` file is excluded from version control via `.gitignore`
- API keys are **never** sent to the client or exposed in any API response
- The `.env.example` file contains only placeholder values

### File Uploads

- File type validation is enforced server-side (`.m4a`, `.mp4`, `.webm` only)
- File size limits are configurable via `MAX_FILE_SIZE_MB` (default: 500MB)
- Uploaded files are stored in `uploads/` which is excluded from git
- Filenames are randomized on upload to prevent path traversal

### Dependencies

- All dependencies are from well-known, maintained npm packages
- We recommend running `npm audit` periodically to check for known vulnerabilities
- Update dependencies regularly with `npm update`

## Best Practices for Deployment

- Always use HTTPS in production (use a reverse proxy like Nginx or Caddy)
- Set restrictive CORS headers if deploying as an API
- Consider rate limiting on the upload endpoint
- Use environment variables (not hardcoded values) for all secrets
- Run the application as a non-root user in production environments
