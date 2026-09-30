# Mesh

Mesh is an AI chatbot. You choose the models, and they work on the same task in one conversation.

**One task, multiple minds.**

This repository is the initial frontend foundation. Provider calls, account sign-in, encrypted API-key storage, and file processing are not wired up yet. The interface is ready for those services to connect later.

## What you can do

- Start a conversation and send the same message to more than one model
- Switch between Balanced, Independent, and Collaborative
- Attach files (held in the browser only — contents are not read)
- Review history, save a conversation, and change settings
- Mark a provider unavailable and see that failure instead of a silent swap
- Connect a “My API” provider as a local placeholder (the key itself is discarded)

Replies in this build are **local previews**. Nothing is sent to Gemini, Groq, Claude, or any other provider.

## Run locally

```bash
npm install
npm run dev
```

The dev server listens on port `8080`.

```bash
npm run typecheck
npm run build
```

## Environment

No environment variables are required for this frontend.

Do not put provider API keys in the client, in `.env` files committed to git, or in `localStorage`. When the backend exists, credentials stay on the server.

## Limitations

- No live model calls
- No authentication backend
- No database
- No document extraction or cloud file storage
- API key screens remember a connection and the last four characters only
- Preview answers are generated in the browser so the chat can be tried end to end
