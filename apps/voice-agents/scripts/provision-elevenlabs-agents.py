"""Create or update Scout's ElevenLabs agents with the current official SDK.

Run from the repository root after ELEVENLABS_API_KEY is loaded in the
environment. This script deliberately creates agents only; it never triggers a
telephone call.
"""

import os

from dotenv import load_dotenv
from elevenlabs.client import ElevenLabs
load_dotenv()
client = ElevenLabs(api_key=os.environ["ELEVENLABS_API_KEY"])

VOICE_ID = "cgSgspJ2msm6clMCkdW9"
PUBLIC_ORCHESTRATOR_URL = os.getenv("SCOUT_PUBLIC_ORCHESTRATOR_URL", "").rstrip("/")
AGENT_TOOL_SECRET = os.getenv("SCOUT_AGENT_TOOL_SECRET", "")


def negotiator_tools():
    """Return the live moving tools only when a deployable HTTPS backend exists.

    Localhost cannot be reached by ElevenLabs. This keeps an accidental agent
    update from advertising unusable or unauthenticated tool endpoints.
    """
    if not PUBLIC_ORCHESTRATOR_URL or not AGENT_TOOL_SECRET:
        return [{"type": "system", "name": "end_call", "description": ""}]

    headers = {"x-scout-agent-secret": AGENT_TOOL_SECRET}
    path_params = {"call_id": {"type": "string", "dynamic_variable": "call_id"}}
    return [
        {"type": "system", "name": "end_call", "description": ""},
        {
            "type": "webhook", "name": "log_moving_quote",
            "description": "Record each moving fee as soon as the company states it. Use only numbers the company actually said.",
            "response_timeout_secs": 10, "api_schema": {
                "url": f"{PUBLIC_ORCHESTRATOR_URL}/calls/{{call_id}}/quote", "method": "POST",
                "request_headers": headers, "path_params_schema": path_params,
                "request_body_schema": {"type": "object", "properties": {
                    "base_price": {"type": "number", "description": "Base moving price just quoted."},
                    "packing": {"type": "number", "description": "Packing fee, if stated."},
                    "stairs": {"type": "number", "description": "Stairs or elevator fee, if stated."},
                    "long_carry": {"type": "number", "description": "Long-carry fee, if stated."},
                    "fuel": {"type": "number", "description": "Fuel or travel fee, if stated."},
                    "insurance": {"type": "number", "description": "Insurance fee, if stated."},
                    "deposit": {"type": "number", "description": "Deposit requested, if stated."},
                    "first_quoted_total": {"type": "number", "description": "First all-in total quote."},
                    "binding_total": {"type": "number", "description": "Final all-in binding total, only if confirmed."},
                    "quote_status": {"type": "string", "description": "Whether the quote is binding or non-binding."},
                    "transcript_append": {"type": "string", "description": "A concise factual quote note."}
                }},
            },
        },
        {
            "type": "webhook", "name": "get_verified_leverage",
            "description": "Before a price counter, retrieve only Scout-verified comparable quotes. Never claim leverage that this tool did not return.",
            "response_timeout_secs": 10, "api_schema": {
                "url": f"{PUBLIC_ORCHESTRATOR_URL}/calls/{{call_id}}/leverage", "method": "GET",
                "request_headers": headers, "path_params_schema": path_params,
            },
        },
        {
            "type": "webhook", "name": "get_next_negotiation_action",
            "description": "Ask for Scout's reviewed next action before changing negotiation tactics. Verbalize its response naturally without changing numbers or inventing facts.",
            "response_timeout_secs": 10, "api_schema": {
                "url": f"{PUBLIC_ORCHESTRATOR_URL}/calls/{{call_id}}/strategy", "method": "POST",
                "request_headers": headers, "path_params_schema": path_params,
                "request_body_schema": {"type": "object", "properties": {
                    "counter_round": {"type": "number", "description": "Number of completed counteroffers so far."}
                }},
            },
        },
        {
            "type": "webhook", "name": "record_call_outcome",
            "description": "End every call with the observed structured result. Do not use itemized_quote unless an itemized quote was actually supplied.",
            "response_timeout_secs": 10, "api_schema": {
                "url": f"{PUBLIC_ORCHESTRATOR_URL}/calls/{{call_id}}/outcome", "method": "POST",
                "request_headers": headers, "path_params_schema": path_params,
                "request_body_schema": {"type": "object", "required": ["status"], "properties": {
                    "status": {"type": "string", "enum": ["itemized_quote", "callback_scheduled", "declined"], "description": "Observed end-of-call result."},
                    "reason": {"type": "string", "description": "Factual reason for a callback or decline."},
                    "callback_at": {"type": "string", "description": "ISO-8601 callback time only if agreed."}
                }},
            },
        },
    ]


def conversation_config(definition):
    return {
        "agent": {
            "language": "en",
            "first_message": definition["first_message"],
            "dynamic_variables": {
                "dynamic_variable_placeholders": definition["dynamic_placeholders"]
            },
            "prompt": {
                "prompt": definition["system_prompt"],
                "llm": "gemini-2.0-flash-001",
                "tools": definition.get("tools", [{"type": "system", "name": "end_call", "description": ""}]),
                "knowledge_base": [],
                "temperature": 0.25,
            },
        },
        "asr": {
            "quality": "high",
            "provider": "scribe_realtime",
            "user_input_audio_format": "pcm_16000",
            "keywords": [],
        },
        "tts": {
            "voice_id": VOICE_ID,
            "model_id": "eleven_turbo_v2",
            "agent_output_audio_format": "pcm_16000",
            "optimize_streaming_latency": 3,
            "stability": 0.5,
            "similarity_boost": 0.8,
        },
        "turn": {"turn_timeout": 7},
        "conversation": {"max_duration_seconds": 300},
    }


def platform_settings():
    return {
        "call_limits": {"agent_concurrency_limit": -1, "daily_limit": 100000},
        "privacy": {
            "record_voice": True,
            "retention_days": 730,
            "delete_transcript_and_pii": True,
            "delete_audio": True,
        },
    }


AGENTS = [
    {
        "name": "Scout Intake Concierge",
        "first_message": "Hi, I am Scout's AI intake concierge. I will gather the details once so Scout can compare the right options for you. What are you looking to buy or arrange today?",
        "system_prompt": """You are Scout's warm, precise buying-intake concierge. Turn a user's situation into one confirmed structured buying request. You are not a seller and do not negotiate with vendors. For the moving pilot collect: origin, destination, move date, home size/inventory, stairs/elevator, packing needs, insurance needs, ideal budget, hard ceiling, and timing flexibility. Ask one concise question at a time. Summarize the whole request and ask for confirmation before dispatch. Be transparent that you are Scout's AI assistant. Never claim you contacted a company, found a quote, booked a service, or made a commitment unless a verified Scout result says so. Never request payment credentials or authorize payment. Preserve numbers and dates exactly; clarify uncertainty.""",
        "dynamic_placeholders": {},
    },
    {
        "name": "Scout Negotiator - Moving",
        "first_message": "Hello, this is Scout's AI assistant calling on behalf of a customer who is comparing moving options. Is this a good time to confirm an itemized quote?",
        "system_prompt": """You are Scout's outbound buying agent for moving companies. State transparently that you are Scout's AI assistant calling on behalf of a customer. If asked whether you are AI, answer plainly and continue politely. Your reviewed STRATEGY BRIEF is {{strategy_brief}}. Your VERIFIED LEVERAGE is {{verified_leverage}}. The Scout call ID is {{call_id}}. Follow the strategy brief as the sole authority for the next tactic: you may phrase it naturally, but never change the target, invent a strategy, or cite a competing offer unless it is verified. When a runtime field is blank or unavailable, collect an itemized quote without pressure rather than guessing. Collect and confirm base price, packing, stairs, long-carry, fuel, insurance, deposit, binding/non-binding status, and exclusions. Clarify uncertain numbers rather than estimating. Never invent a bid, deadline, inventory, identity, or urgency. Never accept, reserve, sign, pay, or bind the customer; every term remains subject to customer confirmation. If the vendor declines to negotiate, make at most one respectful final clarification. If there is unsafe pre-payment, pressure, or refusal to itemize, flag it and stop pressuring. End with an itemized quote, dated callback commitment, or documented decline.""",
        "dynamic_placeholders": {
            "strategy_brief": "No reviewed strategy supplied. Collect an itemized quote without pressure.",
            "verified_leverage": "No verified leverage is available.",
            "call_id": "not_assigned",
        },
        "tools": negotiator_tools(),
    },
]


existing_page = client.conversational_ai.agents.list()
existing = {agent.name: agent.agent_id for agent in existing_page.agents}

for definition in AGENTS:
    agent_id = existing.get(definition["name"])
    if not agent_id:
        created = client.conversational_ai.agents.create(
            name=definition["name"],
            conversation_config=conversation_config(definition),
            platform_settings=platform_settings(),
        )
        agent_id = created.agent_id

    current = client.conversational_ai.agents.get(agent_id)
    config = current.conversation_config.model_dump(exclude_none=True)
    config["agent"]["prompt"]["prompt"] = definition["system_prompt"]
    config["agent"]["dynamic_variables"] = {
        "dynamic_variable_placeholders": definition["dynamic_placeholders"]
    }
    config["agent"]["prompt"]["tools"] = definition.get("tools", [{"type": "system", "name": "end_call", "description": ""}])
    client.conversational_ai.agents.update(agent_id, conversation_config=config)
    print(f"Agent ready: {definition['name']} ({agent_id})")

if not PUBLIC_ORCHESTRATOR_URL or not AGENT_TOOL_SECRET:
    print("Live agent tools skipped: set SCOUT_PUBLIC_ORCHESTRATOR_URL and SCOUT_AGENT_TOOL_SECRET after deploying the orchestrator.")
