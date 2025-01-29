# AI Web Operator

An open-source version of operator. Uses Browserbase and Vercel AI SDK + vision via claude


## Setup Requirements

1. API Keys needed:
   - Browserbase API key 
   - Browserbase Project Id
   - Anthropic API key
   - Upstash Redis credentials (optional, for rate limiting)

Note: it requires a paid Browserbase plan. (Keep alive sessions are not supported on the FREE plan).

## Getting Started

First, run the development server:

```bash
pnpm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser 

## Environment Variables

Create a `.env.local` file with:

```env
BROWSERBASE_API_KEY=your_key_here
BROWSERBASE_PROJECT_ID=your-key-here
ANTHROPIC_API_KEY=your_key_here
UPSTASH_REDIS_REST_URL=optional_redis_url
UPSTASH_REDIS_REST_TOKEN=optional_redis_token
```


## Learn More

- [Browserbase Documentation](https://Browserbase.com/docs)
- [Vercel AI SDK](https://sdk.vercel.ai/docs)
- [Anthropic Claude API](https://docs.anthropic.com/claude/docs)
