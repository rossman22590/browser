# AI Web Operator

An open-source version of operator. Uses Browserbase and Vercel AI SDK + vision via claude


## Setup Requirements

1. API Keys needed:
   - Browserbase API key
   - Anthropic API key
   - Upstash Redis credentials (optional, for rate limiting)

## Getting Started

First, run the development server:

```bash
pnpm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser 

## Environment Variables

Create a `.env.local` file with:

```env
Browserbase_API_KEY=your_key_here
ANTHROPIC_API_KEY=your_key_here
UPSTASH_REDIS_REST_URL=optional_redis_url
UPSTASH_REDIS_REST_TOKEN=optional_redis_token
```


## Learn More

- [Browserbase Documentation](https://Browserbase.com/docs)
- [Vercel AI SDK](https://sdk.vercel.ai/docs)
- [Anthropic Claude API](https://docs.anthropic.com/claude/docs)
