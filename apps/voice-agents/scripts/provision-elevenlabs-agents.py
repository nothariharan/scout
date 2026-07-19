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
            # V3 Conversational makes delivery context-aware rather than
            # one-note. Prompt rules below define when the agent becomes firm.
            "model_id": "eleven_v3_conversational",
            "expressive_mode": True,
            "suggested_audio_tags": [
                {"tag": "calm", "description": "Default: professional, composed, and clear."},
                {"tag": "firm", "description": "For repeated evasions or pressure; assertive, never hostile."},
                {"tag": "measured", "description": "For a price, fee, exclusion, or non-binding term."},
                {"tag": "warm", "description": "For cooperation or a genuine concession."},
            ],
            "agent_output_audio_format": "pcm_16000",
            "optimize_streaming_latency": 3,
            # 0.40 allows emotional range without erratic delivery; 0.78
            # preserves clarity on telephone-quality audio.
            "stability": 0.40,
            "speed": 0.98,
            "similarity_boost": 0.78,
        },
        "turn": {
            "turn_timeout": 9,
            "turn_eagerness": "normal",
            "turn_model": "turn_v3",
            "soft_timeout_config": {
                "timeout_seconds": 3.0,
                "message": "Let me make sure I have that right.",
                "use_llm_generated_message": False,
                "randomize_fillers": False,
                "max_soft_timeouts_per_generation": 1,
            },
        },
        "conversation": {
            "max_duration_seconds": 300,
            "client_events": [
                "interruption",
                "user_transcript",
                "tentative_user_transcript",
                "agent_response",
                "agent_response_correction",
                "agent_response_complete",
            ],
        },
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


def intake_tools():
    return [
        {"type": "system", "name": "end_call", "description": ""},
        {"type": "client", "name": "submit_moving_brief", "description": "Call this exactly once only after you have summarized the complete moving brief and the user clearly confirms it. Supply the confirmed facts exactly; never invent missing values.", "expects_response": True, "parameters": {"type": "object", "required": ["origin_area", "origin_city", "destination_area", "destination_city", "move_date", "home_size", "budget_ideal", "budget_ceiling", "currency"], "properties": {
            "origin_area": {"type": "string", "description": "Confirmed origin locality."}, "origin_city": {"type": "string", "description": "Confirmed origin city."}, "destination_area": {"type": "string", "description": "Confirmed destination locality."}, "destination_city": {"type": "string", "description": "Confirmed destination city."}, "move_date": {"type": "string", "description": "Confirmed move date, ISO YYYY-MM-DD."}, "home_size": {"type": "string", "description": "Confirmed home-size category.", "enum": ["studio", "1_bed", "2_bed", "3_bed_plus", "custom"]}, "inventory_notes": {"type": "string", "description": "Confirmed inventory or special-item notes."}, "packing": {"type": "boolean", "description": "Whether packing is requested."}, "insurance": {"type": "boolean", "description": "Whether insurance is requested."}, "origin_floors": {"type": "number", "description": "Origin floor count."}, "destination_floors": {"type": "number", "description": "Destination floor count."}, "elevator_origin": {"type": "boolean", "description": "Whether origin has an elevator."}, "elevator_destination": {"type": "boolean", "description": "Whether destination has an elevator."}, "budget_ideal": {"type": "number", "description": "Confirmed ideal all-in budget."}, "budget_ceiling": {"type": "number", "description": "Confirmed hard all-in ceiling."}, "currency": {"type": "string", "description": "Budget currency code."}, "negotiation_posture": {"type": "string", "description": "Confirmed negotiation posture.", "enum": ["fast", "balanced", "aggressive"]}, "language_pref": {"type": "string", "description": "Preferred conversation language."}
        }}},
    ]


AGENTS = [
    {
        "name": "Scout Intake Concierge",
        "first_message": "Hi, I am Scout's AI intake concierge. I will gather the details once so Scout can compare the right options for you. What are you looking to buy or arrange today?",
        "system_prompt": """You are Scout's warm, precise buying-intake concierge. Turn a user's situation into one confirmed structured moving request. You are not a seller and do not negotiate with vendors. Collect: origin and destination locality plus city, move date, home size/inventory, stairs/elevator, packing and insurance needs, ideal budget, hard ceiling, currency, and timing posture. Ask one concise question at a time. Summarize the whole request and ask for explicit confirmation before dispatch. Only after clear confirmation, call submit_moving_brief exactly once with the complete factual fields. Be transparent that you are Scout's AI assistant. Never claim you contacted a company, found a quote, booked a service, or made a commitment unless a verified Scout result says so. Never request payment credentials or authorize payment. Preserve numbers and dates exactly; clarify uncertainty.""",
        "dynamic_placeholders": {},
        "tools": intake_tools(),
    },
    {
        "name": "Scout Negotiator - Moving",
        "first_message": "Hello, this is Scout's AI assistant calling on behalf of a customer who is comparing moving options. Is this a good time to confirm an itemized quote?",
        "system_prompt": """You are Scout's outbound buying agent for moving companies. State transparently that you are Scout's AI assistant calling on behalf of a customer. If asked whether you are AI, answer plainly and continue politely. The confirmed MOVE SCOPE is {{moving_scope}}. Use this exact scope for every question; never guess or alter its origin, destination, date, inventory, services, stairs, or budget. Your reviewed STRATEGY BRIEF is {{strategy_brief}}. Your VERIFIED LEVERAGE is {{verified_leverage}}. The Scout call ID is {{call_id}}. Follow the strategy brief as the sole authority for the next tactic: you may phrase it naturally, but never change the target, invent a strategy, or cite a competing offer unless it is verified. When a runtime field is blank or unavailable, collect an itemized quote without pressure rather than guessing. Collect and confirm base price, packing, stairs, long-carry, fuel, insurance, deposit, binding/non-binding status, and exclusions. Clarify uncertain numbers rather than estimating. Never invent a bid, deadline, inventory, identity, or urgency. Never accept, reserve, sign, pay, or bind the customer; every term remains subject to customer confirmation. If the vendor declines to negotiate, make at most one respectful final clarification. If there is unsafe pre-payment, pressure, or refusal to itemize, flag it and stop pressuring. End with an itemized quote, dated callback commitment, or documented decline.

VOICE DELIVERY AND CONFLICT POLICY
- Start warm, concise, and conversational. Listen fully; do not talk over a dispatcher.
- For ordinary price discussion, speak at a natural pace and use short, precise sentences.
- If the vendor is busy, dismissive, evasive, or applies hard-sell pressure, become firmer rather than louder: slow slightly, lower the emotional intensity, name the exact fact or question, then pause for an answer. A controlled, measured delivery is stronger than an argument.
- When confirming a price, fee, exclusion, deposit, or whether a quote is binding, use deliberate emphasis. Ask one closed question at a time.
- If the vendor becomes cooperative or makes a real concession, return immediately to a warmer, appreciative tone.
- Never yell, threaten, shame, mirror hostility, use sarcasm, or manufacture urgency. Do not use emotional audio tags casually; use only [slow] for a short factual clarification when it helps comprehension.
- If interrupted, stop immediately, acknowledge the interruption in one short phrase, answer it, and return to the unanswered item. If the vendor refuses twice to itemise or negotiate, document the decline and end politely.""",
        "dynamic_placeholders": {
            "strategy_brief": "No reviewed strategy supplied. Collect an itemized quote without pressure.",
            "verified_leverage": "No verified leverage is available.",
            "call_id": "not_assigned",
            "moving_scope": "No confirmed scope supplied. Collect an itemized quote only after clarifying the job details.",
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
    # Keep provider-managed values that are not ours, but explicitly refresh
    # every Scout-owned conversation setting. Previously this loop changed only
    # the prompt and tools, silently leaving TTS and turn-taking stale.
    desired = conversation_config(definition)
    config["agent"]["language"] = desired["agent"]["language"]
    config["agent"]["first_message"] = definition["first_message"]
    config["agent"]["prompt"]["prompt"] = definition["system_prompt"]
    config["agent"]["prompt"]["llm"] = desired["agent"]["prompt"]["llm"]
    config["agent"]["prompt"]["temperature"] = desired["agent"]["prompt"]["temperature"]
    config["agent"]["dynamic_variables"] = {
        "dynamic_variable_placeholders": definition["dynamic_placeholders"]
    }
    config["agent"]["prompt"]["tools"] = definition.get("tools", [{"type": "system", "name": "end_call", "description": ""}])
    config["asr"] = desired["asr"]
    config["tts"] = desired["tts"]
    config["turn"] = desired["turn"]
    config["conversation"] = desired["conversation"]
    client.conversational_ai.agents.update(agent_id, conversation_config=config)
    print(f"Agent ready: {definition['name']} ({agent_id})")

if not PUBLIC_ORCHESTRATOR_URL or not AGENT_TOOL_SECRET:
    print("Live agent tools skipped: set SCOUT_PUBLIC_ORCHESTRATOR_URL and SCOUT_AGENT_TOOL_SECRET after deploying the orchestrator.")
