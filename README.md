# AI Web Operator

An open-source version of operator. Uses BrowseBase and Vercel AI SDK + vision via claude


## Setup Requirements

1. API Keys needed:
   - BrowseBase API key
   - Anthropic API key
   - Upstash Redis credentials (optional, for rate limiting)

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the agent in action.

## Environment Variables

Create a `.env.local` file with:

```env
BROWSEBASE_API_KEY=your_key_here
ANTHROPIC_API_KEY=your_key_here
UPSTASH_REDIS_REST_URL=optional_redis_url
UPSTASH_REDIS_REST_TOKEN=optional_redis_token
```


## Learn More

- [BrowseBase Documentation](https://browsebase.com/docs)
- [Vercel AI SDK](https://sdk.vercel.ai/docs)
- [Anthropic Claude API](https://docs.anthropic.com/claude/docs)
