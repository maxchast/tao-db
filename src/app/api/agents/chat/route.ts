import { createClient } from '@supabase/supabase-js'
import { coerceAnonKey, coerceSupabaseUrl } from '@/lib/supabase'

const OPENAI_CHAT_URL = 'https://api.openai.com/v1/chat/completions'

function normalizeOpenAiKey(raw: string | undefined): string | null {
  if (!raw) return null
  let k = raw
    .replace(/^\uFEFF/, '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, '')
    .trim()
  if ((k.startsWith('"') && k.endsWith('"')) || (k.startsWith("'") && k.endsWith("'"))) {
    k = k.slice(1, -1).replace(/\s+/g, '').trim()
  }
  return k || null
}

function getOpenAiApiKey(): string {
  const apiKey = normalizeOpenAiKey(process.env.OPENAI_API_KEY)
  if (!apiKey) {
    throw new Error(
      'OPENAI_API_KEY is not set — add it in Railway → Variables (service). Get a key from platform.openai.com/api-keys.'
    )
  }
  return apiKey
}

type OpenAIToolCall = {
  id: string
  type: 'function'
  function: { name: string; arguments: string }
}

type ChatCompletionMessage =
  | { role: 'system'; content: string }
  | { role: 'user'; content: string }
  | { role: 'assistant'; content: string | null; tool_calls?: OpenAIToolCall[] }
  | { role: 'tool'; tool_call_id: string; content: string }

type ChatCompletionResponse = {
  choices: Array<{
    message: {
      role: string
      content: string | null
      tool_calls?: OpenAIToolCall[]
    }
    finish_reason: string | null
  }>
}

async function openAiChatComplete(
  apiKey: string,
  body: Record<string, unknown>
): Promise<ChatCompletionResponse> {
  const res = await fetch(OPENAI_CHAT_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  const raw = await res.text()
  if (!res.ok) {
    throw new Error(`${res.status} ${raw}`)
  }
  return JSON.parse(raw) as ChatCompletionResponse
}

/** Set AGENT_DEBUG=1 in Railway, GET this URL, then remove AGENT_DEBUG. */
export async function GET() {
  if (process.env.AGENT_DEBUG !== '1') {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }
  const key = normalizeOpenAiKey(process.env.OPENAI_API_KEY)
  return Response.json({
    openai_key_present: Boolean(key),
    openai_key_length: key?.length ?? 0,
    looks_like_openai_key: key?.startsWith('sk-') ?? false,
    default_model: process.env.OPENAI_MODEL?.trim() || 'gpt-4o',
    hint: !key
      ? 'OPENAI_API_KEY missing at runtime — set variable and redeploy'
      : !key.startsWith('sk-')
        ? 'OpenAI secret keys usually start with sk-'
        : 'Key shape OK; 401 means wrong/revoked key in platform.openai.com',
  })
}

function getSupabase() {
  const service = process.env.SUPABASE_SERVICE_KEY?.trim()
  const key = service && service.length >= 20 ? service : coerceAnonKey(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  return createClient(coerceSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL), key)
}

const RESEARCH_SYSTEM_PROMPT = `You are the TAO Research Agent — an expert AI assistant specialized in the Bittensor (TAO) ecosystem. You help miners, validators, and researchers navigate the Bittensor network.

## Your Core Knowledge

**Bittensor Overview:**
- Bittensor is a decentralized AI network where miners produce machine intelligence and validators evaluate that intelligence
- TAO (τ) is the native token used for staking, rewards, and governance
- The network runs on a blockchain (Subtensor) built on Substrate
- The root network (SN0) governs emission distribution across subnets

**Subnets:**
- Subnets are specialized sub-networks, each focused on a specific AI task (text generation, image generation, data scraping, storage, etc.)
- Each subnet has a unique netuid (network UID)
- Subnets compete for TAO emissions based on the root network's evaluation
- Key subnet metrics: registration cost, emissions rate, number of miners/validators, incentive mechanism
- Subnet owners define the incentive mechanism (how miners are scored)
- Notable subnets include: SN1 (Text Prompting), SN2 (Machine Translation), SN3 (Data Scraping), SN8 (Taoshi/Trading), SN9 (Pretrained Models), SN19 (Vision), SN21 (Storage), SN22 (Datura/Inference)

**Mining & Validation:**
- Miners run models or services on subnets and receive TAO rewards based on their performance
- Validators stake TAO and evaluate miners, receiving dividends from emissions
- Consensus mechanism uses Yuma Consensus — validators set weights on miners
- Validator permits are limited per subnet (typically 64 or 128)
- Miner slots are limited per subnet (typically 256)
- Registration requires burning TAO (recycle register) or using POW (pow register)

**Staking & Economics:**
- TAO has a total supply of 21 million (like Bitcoin)
- Block time is ~12 seconds
- Halving occurs every ~4 years (10.5M blocks)
- Current emission rate decreases over time
- Validators can set a "take" rate (commission on delegated stake)
- Delegated staking allows passive TAO holders to earn yield
- Root validators distribute emissions to subnets based on weights

**Research Considerations:**
- When evaluating a subnet: look at emissions share, registration cost, hardware requirements, competitive landscape, team reputation
- Higher emissions ≠ better opportunity if competition is fierce
- GPU requirements vary wildly between subnets (some CPU-only, others need A100s)
- Subnet deregistration happens if emissions drop too low
- New subnets launch regularly — early entry can be advantageous

**Tools & Resources:**
- taostats.io — network statistics, subnet info, validator/miner performance
- bittensor.com — official documentation
- Subtensor GitHub — blockchain source code
- btcli — command-line interface for interacting with the network
- Python bittensor package — programmatic access to the network

## Your Behavior

1. Always be specific and data-aware. Reference actual subnet numbers and mechanics.
2. When discussing mining opportunities, consider: emissions, hardware requirements, competition, and risk.
3. Be honest about uncertainty — the network changes rapidly.
4. Help users make informed decisions, don't give financial advice.
5. Use the shared memory to remember important facts, decisions, and research findings for the team.
6. When you learn something new from the conversation that would be useful for the whole team, save it to memory.
7. Reference previous research and chat context when relevant.
8. Format responses with markdown for readability.`

const OPENAI_TOOLS: Array<{
  type: 'function'
  function: {
    name: string
    description: string
    parameters: Record<string, unknown>
  }
}> = [
  {
    type: 'function',
    function: {
      name: 'save_memory',
      description:
        'Save an important fact, decision, or research finding to shared team memory. Use when you learn something valuable for the whole team in future conversations.',
      parameters: {
        type: 'object',
        properties: {
          key: {
            type: 'string',
            description: 'Short key (e.g. sn8_hardware_reqs, team_decision_staking_strategy)',
          },
          content: { type: 'string', description: 'The information to remember' },
          category: {
            type: 'string',
            enum: ['subnet_research', 'team_decision', 'market_insight', 'technical_note', 'strategy'],
            description: 'Category of this memory',
          },
        },
        required: ['key', 'content', 'category'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_memory',
      description:
        'Search shared team memory for previously saved information. Use to recall past research, decisions, or findings.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_research_entries',
      description:
        "Get the team's subnet research entries from the dashboard — subnets tracked and their status.",
      parameters: { type: 'object', properties: {} },
    },
  },
]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleToolCall(toolName: string, toolInput: Record<string, string>, supabase: any) {
  if (toolName === 'save_memory') {
    const { key, content, category } = toolInput
    const { error } = await supabase
      .from('agent_memory')
      .upsert({ key, content, category, agent_id: 'research' }, { onConflict: 'key' })
    if (error) return JSON.stringify({ error: error.message })
    return JSON.stringify({ success: true, message: `Saved memory: ${key}` })
  }

  if (toolName === 'search_memory') {
    const { query } = toolInput
    const { data } = await supabase
      .from('agent_memory')
      .select('*')
      .or(`content.ilike.%${query}%,key.ilike.%${query}%,category.ilike.%${query}%`)
      .order('updated_at', { ascending: false })
      .limit(10)
    return JSON.stringify(data ?? [])
  }

  if (toolName === 'get_research_entries') {
    const { data } = await supabase
      .from('research_entries')
      .select('*')
      .order('created_at', { ascending: false })
    return JSON.stringify(data ?? [])
  }

  return JSON.stringify({ error: 'Unknown tool' })
}

function parseToolArgs(json: string): Record<string, string> {
  try {
    const o = JSON.parse(json || '{}') as Record<string, unknown>
    const out: Record<string, string> = {}
    for (const [k, v] of Object.entries(o)) {
      out[k] = v == null ? '' : String(v)
    }
    return out
  } catch {
    return {}
  }
}

export async function POST(request: Request) {
  try {
    const { message, agentId } = await request.json()

    if (agentId !== 'research') {
      return Response.json({ error: 'Agent not implemented yet' }, { status: 400 })
    }

    const apiKey = getOpenAiApiKey()
    const supabase = getSupabase()

    await supabase.from('agent_messages').insert([{
      agent_id: agentId,
      role: 'user',
      content: message,
    }])

    const { data: history } = await supabase
      .from('agent_messages')
      .select('*')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: true })
      .limit(50)

    const { data: memories } = await supabase
      .from('agent_memory')
      .select('*')
      .eq('agent_id', agentId)
      .order('updated_at', { ascending: false })
      .limit(30)

    const memoryContext =
      memories && memories.length > 0
        ? `\n\n## Shared Team Memory\nThe following are previously saved research notes and decisions:\n${memories.map(m => `- **[${m.category}] ${m.key}**: ${m.content}`).join('\n')}`
        : ''

    const messages: ChatCompletionMessage[] = [
      { role: 'system', content: RESEARCH_SYSTEM_PROMPT + memoryContext },
      ...(history ?? []).map(
        (msg: { role: string; content: string }) =>
          ({
            role: msg.role as 'user' | 'assistant',
            content: msg.content,
          }) as ChatCompletionMessage
      ),
    ]

    const model = process.env.OPENAI_MODEL?.trim() || 'gpt-4o'
    const maxToolRounds = 12
    let rounds = 0
    let textContent = ''

    while (rounds < maxToolRounds) {
      rounds += 1
      const data = await openAiChatComplete(apiKey, {
        model,
        messages,
        tools: OPENAI_TOOLS,
        tool_choice: 'auto',
        max_tokens: 2048,
      })

      const choice = data.choices[0]
      if (!choice) {
        throw new Error('OpenAI returned no choices')
      }

      const { message: assistantMsg, finish_reason: finish } = choice

      if (finish === 'tool_calls' && assistantMsg.tool_calls?.length) {
        messages.push({
          role: 'assistant',
          content: assistantMsg.content,
          tool_calls: assistantMsg.tool_calls,
        })
        for (const tc of assistantMsg.tool_calls) {
          const args = parseToolArgs(tc.function.arguments)
          const result = await handleToolCall(tc.function.name, args, supabase)
          messages.push({
            role: 'tool',
            tool_call_id: tc.id,
            content: result,
          })
        }
        continue
      }

      textContent = assistantMsg.content?.trim() ?? ''
      break
    }

    if (rounds >= maxToolRounds && !textContent) {
      textContent = '_Tool loop limit reached. Try a simpler question._'
    }

    await supabase.from('agent_messages').insert([{
      agent_id: agentId,
      role: 'assistant',
      content: textContent || '(No response)',
    }])

    return Response.json({ response: textContent || '(No response)' })
  } catch (err) {
    console.error('Agent chat error:', err)
    const message = err instanceof Error ? err.message : String(err)
    const authFail =
      message.includes('401') ||
      message.includes('invalid_api_key') ||
      message.includes('Incorrect API key')
    if (authFail) {
      return Response.json(
        {
          error:
            'OpenAI rejected the API key (401). In Railway → Variables set OPENAI_API_KEY to your secret key from platform.openai.com/api-keys — no quotes. Redeploy after saving.',
        },
        { status: 502 }
      )
    }
    return Response.json({ error: message }, { status: 500 })
  }
}
