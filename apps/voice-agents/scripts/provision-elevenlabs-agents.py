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
                "tools": [{"type": "system", "name": "end_call", "description": ""}],
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
    client.conversational_ai.agents.update(agent_id, conversation_config=config)
    print(f"Agent ready: {definition['name']} ({agent_id})")
