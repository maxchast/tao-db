import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { coerceAnonKey, coerceSupabaseUrl } from '@/lib/supabase'

function normalizeAnthropicKey(raw: string | undefined): string | null {
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

function getAnthropic() {
  const apiKey = normalizeAnthropicKey(process.env.ANTHROPIC_API_KEY)
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not set — add it in Railway → Variables (service, not build-only)')
  }
  return new Anthropic({
    apiKey,
    defaultHeaders: { 'anthropic-version': '2023-06-01' },
  })
}

/**
 * Temporary: set AGENT_DEBUG=1 in Railway, GET this URL, then remove AGENT_DEBUG.
 * Tells you if the key exists at runtime (length) without printing the secret.
 */
export async function GET() {
  if (process.env.AGENT_DEBUG !== '1') {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }
  const key = normalizeAnthropicKey(process.env.ANTHROPIC_API_KEY)
  return Response.json({
    anthropic_key_present: Boolean(key),
    anthropic_key_length: key?.length ?? 0,
    looks_like_anthropic_key: key?.startsWith('sk-ant-') ?? false,
    hint:
      !key
        ? 'ANTHROPIC_API_KEY missing at runtime — wrong service or redeploy needed'
        : key.length < 90
          ? 'Key looks too short — compare length to console.anthropic.com copy'
          : !key.startsWith('sk-ant-')
            ? 'Key should start with sk-ant-'
            : 'Key shape OK; if chat still 401, key is revoked/wrong workspace — create a new key in Anthropic console',
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

const MEMORY_TOOLS: Anthropic.Tool[] = [
  {
    name: 'save_memory',
    description: 'Save an important fact, decision, or research finding to shared team memory. Use this when you learn something that would be valuable for the whole team to know in future conversations.',
    input_schema: {
      type: 'object' as const,
      properties: {
        key: { type: 'string', description: 'Short descriptive key for this memory (e.g. "sn8_hardware_reqs", "team_decision_staking_strategy")' },
        content: { type: 'string', description: 'The information to remember' },
        category: { type: 'string', enum: ['subnet_research', 'team_decision', 'market_insight', 'technical_note', 'strategy'], description: 'Category of this memory' },
      },
      required: ['key', 'content', 'category'],
    },
  },
  {
    name: 'search_memory',
    description: 'Search shared team memory for previously saved information. Use this to recall past research, decisions, or findings.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'Search query to find relevant memories' },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_research_entries',
    description: 'Get the team\'s subnet research entries from the dashboard. Use this to see what subnets the team is tracking and their current status.',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
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

export async function POST(request: Request) {
  try {
    const { message, agentId } = await request.json()

    if (agentId !== 'research') {
      return Response.json({ error: 'Agent not implemented yet' }, { status: 400 })
    }

    const anthropic = getAnthropic()
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

    // Build memory context
    const memoryContext = memories && memories.length > 0
      ? `\n\n## Shared Team Memory\nThe following are previously saved research notes and decisions:\n${memories.map(m => `- **[${m.category}] ${m.key}**: ${m.content}`).join('\n')}`
      : ''

    // Build message history for Claude
    const messages: Anthropic.MessageParam[] = (history ?? []).map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    }))

    // Call Claude with tool use loop
    let response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: RESEARCH_SYSTEM_PROMPT + memoryContext,
      tools: MEMORY_TOOLS,
      messages,
    })

    // Handle tool use loop
    while (response.stop_reason === 'tool_use') {
      const toolBlocks = response.content.filter(
        (b): b is Anthropic.ContentBlock & { type: 'tool_use' } => b.type === 'tool_use'
      )

      const toolResults: Anthropic.ToolResultBlockParam[] = []
      for (const tool of toolBlocks) {
        const result = await handleToolCall(tool.name, tool.input as Record<string, string>, supabase)
        toolResults.push({
          type: 'tool_result',
          tool_use_id: tool.id,
          content: result,
        })
      }

      messages.push({ role: 'assistant', content: response.content })
      messages.push({ role: 'user', content: toolResults })

      response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        system: RESEARCH_SYSTEM_PROMPT + memoryContext,
        tools: MEMORY_TOOLS,
        messages,
      })
    }

    // Extract text response
    const textContent = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map(b => b.text)
      .join('')

    // Save assistant message
    await supabase.from('agent_messages').insert([{
      agent_id: agentId,
      role: 'assistant',
      content: textContent,
    }])

    return Response.json({ response: textContent })
  } catch (err) {
    console.error('Agent chat error:', err)
    const message = err instanceof Error ? err.message : String(err)
    const authFail =
      message.includes('401') ||
      message.includes('authentication_error') ||
      message.includes('invalid x-api-key') ||
      message.includes('x-api-key')
    if (authFail) {
      return Response.json(
        {
          error:
            'Anthropic rejected the API key (401). In Railway → Variables, set ANTHROPIC_API_KEY to a current key from console.anthropic.com — no quotes, no spaces. Redeploy after saving. If this key was ever shared publicly, create a new key there.',
        },
        { status: 502 }
      )
    }
    return Response.json({ error: message }, { status: 500 })
  }
}
