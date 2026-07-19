"""Provision Scout's India-focused real-estate ElevenLabs agents.

This changes agent configuration only. It never places a telephone call.
Webhook tools are attached only when the public, authenticated orchestrator is
available; localhost cannot safely receive an ElevenLabs tool request.
"""

import os
from dotenv import load_dotenv
from elevenlabs.client import ElevenLabs

load_dotenv()
client = ElevenLabs(api_key=os.environ["ELEVENLABS_API_KEY"])
VOICE_ID = "cgSgspJ2msm6clMCkdW9"
PUBLIC_URL = os.getenv("SCOUT_PUBLIC_ORCHESTRATOR_URL", "").rstrip("/")
TOOL_SECRET = os.getenv("SCOUT_AGENT_TOOL_SECRET", "")


def system_tools():
    return [{"type": "system", "name": "end_call", "description": ""}, {"type": "system", "name": "skip_turn", "description": ""}]


def negotiator_tools():
    if not PUBLIC_URL or not TOOL_SECRET:
        return system_tools()
    headers = {"x-scout-agent-secret": TOOL_SECRET}
    path = {"call_id": {"type": "string", "dynamic_variable": "call_id"}}
    return system_tools() + [
        {"type": "webhook", "name": "log_real_estate_quote", "description": "Record only rental/property terms the owner or broker explicitly states.", "response_timeout_secs": 10, "api_schema": {"url": f"{PUBLIC_URL}/calls/{{call_id}}/quote", "method": "POST", "request_headers": headers, "path_params_schema": path, "request_body_schema": {"type": "object", "properties": {
            "base_rent": {"type": "number", "description": "Monthly rent stated by the contact."}, "deposit": {"type": "number", "description": "Refundable deposit stated."}, "maintenance_monthly": {"type": "number", "description": "Monthly maintenance stated."}, "brokerage_onetime": {"type": "number", "description": "One-time brokerage stated."}, "hidden_charges": {"type": "number", "description": "Other recurring charge explicitly stated."}, "lease_duration_months": {"type": "number", "description": "Lease months stated or confirmed."}, "first_quoted_effective": {"type": "number", "description": "First effective monthly cost only when calculated from stated terms."}, "final_quoted_effective": {"type": "number", "description": "Final effective monthly cost only when confirmed."}, "amenities_included": {"type": "array", "items": {"type": "string"}, "description": "Amenities explicitly included."}, "transcript_append": {"type": "string", "description": "Short factual quote note."}
        }}}},
        {"type": "webhook", "name": "get_verified_leverage", "description": "Retrieve only Scout-verified comparable rental evidence before countering.", "response_timeout_secs": 10, "api_schema": {"url": f"{PUBLIC_URL}/calls/{{call_id}}/leverage", "method": "GET", "request_headers": headers, "path_params_schema": path}},
        {"type": "webhook", "name": "get_next_negotiation_action", "description": "Retrieve Scout's bounded next action before changing tactics.", "response_timeout_secs": 10, "api_schema": {"url": f"{PUBLIC_URL}/calls/{{call_id}}/strategy", "method": "POST", "request_headers": headers, "path_params_schema": path, "request_body_schema": {"type": "object", "properties": {"counter_round": {"type": "number", "description": "Completed counter-offer rounds."}}}}},
        {"type": "webhook", "name": "record_call_outcome", "description": "Record the observed property-call outcome before ending.", "response_timeout_secs": 10, "api_schema": {"url": f"{PUBLIC_URL}/calls/{{call_id}}/outcome", "method": "POST", "request_headers": headers, "path_params_schema": path, "request_body_schema": {"type": "object", "required": ["status"], "properties": {"status": {"type": "string", "enum": ["itemized_quote", "callback_scheduled", "declined"], "description": "Observed outcome."}, "reason": {"type": "string", "description": "Factual callback or decline reason."}, "callback_at": {"type": "string", "description": "Callback time if offered."}}}}},
    ]


def intake_tools():
    props = {
        "deal_type": {"type": "string", "description": "Confirmed rental product.", "enum": ["rental_apartment", "pg", "hostel", "co_living", "short_stay_rental"]}, "area": {"type": "string", "description": "Confirmed target locality."}, "city": {"type": "string", "description": "Confirmed target city."}, "pincode": {"type": "string", "description": "Optional PIN code."}, "budget_ideal": {"type": "number", "description": "Target effective monthly budget."}, "budget_ceiling": {"type": "number", "description": "Hard effective monthly ceiling."}, "currency": {"type": "string", "description": "Currency code, normally INR."}, "occupancy": {"type": "number", "description": "Number of occupants."}, "furnishing": {"type": "string", "description": "Furnishing preference.", "enum": ["unfurnished", "semi", "furnished"]}, "amenities": {"type": "array", "items": {"type": "string", "description": "One requested amenity."}, "description": "Requested amenities."}, "move_in_date": {"type": "string", "description": "Move-in date in YYYY-MM-DD."}, "lease_duration_months": {"type": "number", "description": "Planned rental duration in months."}, "deal_breakers": {"type": "array", "items": {"type": "string", "description": "One non-negotiable requirement."}, "description": "Non-negotiable requirements."}, "negotiation_posture": {"type": "string", "description": "Requested negotiation posture.", "enum": ["fast", "balanced", "aggressive"]}, "language_pref": {"type": "string", "description": "Preferred call language."}
    }
    required = ["deal_type", "area", "city", "budget_ideal", "budget_ceiling", "currency", "occupancy", "furnishing", "move_in_date", "lease_duration_months"]
    return system_tools() + [{"type": "client", "name": "submit_real_estate_brief", "description": "Call exactly once after the user confirms the complete factual property brief. Never invent a missing value.", "expects_response": True, "parameters": {"type": "object", "required": required, "properties": props}}]


def config(definition):
    return {"agent": {"language": "en", "first_message": definition["first_message"], "dynamic_variables": {"dynamic_variable_placeholders": definition["placeholders"]}, "prompt": {"prompt": definition["prompt"], "llm": "gemini-2.0-flash-001", "tools": definition["tools"], "knowledge_base": [], "temperature": 0.25}}, "asr": {"quality": "high", "provider": "scribe_realtime", "user_input_audio_format": "pcm_16000", "keywords": []}, "tts": {"voice_id": VOICE_ID, "model_id": "eleven_v3_conversational", "expressive_mode": True, "suggested_audio_tags": [{"tag": "warm", "description": "Respectful default."}, {"tag": "firm", "description": "Calm factual boundary."}, {"tag": "measured", "description": "Price or legal term confirmation."}], "agent_output_audio_format": "pcm_16000", "optimize_streaming_latency": 3, "stability": 0.40, "speed": 0.98, "similarity_boost": 0.78}, "turn": {"turn_timeout": 9, "turn_eagerness": "normal", "turn_model": "turn_v3", "soft_timeout_config": {"timeout_seconds": 3.0, "message": "Let me make sure I have that right.", "use_llm_generated_message": False, "randomize_fillers": False, "max_soft_timeouts_per_generation": 1}}, "conversation": {"max_duration_seconds": 300, "client_events": ["interruption", "user_transcript", "tentative_user_transcript", "agent_response", "agent_response_complete"]}}


INTAKE_PROMPT = """You are Scout's warm, precise India real-estate intake concierge. Produce one confirmed rental/PG/hostel/co-living/short-stay brief. You do not negotiate or book. The user may speak, type, or upload a clear listing, broker message, or property document. Extract only readable facts, ask one concise missing-detail question at a time, then summarize and obtain explicit confirmation. Collect property type, locality/city/PIN, occupants, furnishing, amenities, move-in date, lease duration, ideal and hard monthly budget, deal-breakers, posture, and preferred language. Use respectful Indian business register; a brief natural Hinglish phrase is acceptable only if the user leads with it. Never request payment credentials, claim a property exists, or promise availability. Only after explicit confirmation call submit_real_estate_brief exactly once."""

NEGOTIATOR_PROMPT = """You are Scout's transparent outbound real-estate buying agent for rentals, PGs, hostels, co-living, and short stays in India. Say you are Scout's AI assistant calling for a customer. The confirmed PROPERTY SCOPE is {{property_scope}}. Do not alter it. Follow {{strategy_brief}} as the sole negotiation authority and cite only {{verified_leverage}}. Collect monthly rent, deposit, maintenance, brokerage, every recurring charge, lease duration, agreement status, visit availability, furnishing, amenities, exclusions, and whether the caller is authorized to agree for the owner. Ask for a written itemization and binding/conditional status. Never invent a property, comparable, urgency, or authority; never pay, reserve, transfer a token, sign, or bind the customer. A vendor's offered callback time may be repeated and recorded but is not a booking. If asked about AI, answer plainly. Keep a respectful Indian business register; mirror a user's language only when confident and do not force code-mixing. If pressured for deposit before a visit, no agreement, or cash-only payment, flag it, stop pressure, and document the outcome. Be firm, never rude: [firm] or [measured] may prefix one short factual sentence only. If interrupted, stop, answer briefly, and return to the unresolved term. If asked to wait while terms are checked, call skip_turn. End with an itemized quote, dated callback, or documented decline."""

AGENTS = [{"name": "Scout Intake Concierge", "first_message": "Hi, I am Scout's AI property intake concierge. I will gather the details once so Scout can compare the right places for you. What kind of place are you looking for?", "prompt": INTAKE_PROMPT, "placeholders": {}, "tools": intake_tools()}, {"name": "Scout Negotiator - Real Estate", "legacy_name": "Scout Negotiator - Moving", "first_message": "Hello, this is Scout's AI assistant calling for a customer comparing rental options. Is this a good time to confirm the property terms?", "prompt": NEGOTIATOR_PROMPT, "placeholders": {"strategy_brief": "Collect an itemized rental quote without pressure.", "verified_leverage": "No verified leverage is available.", "call_id": "not_assigned", "property_scope": "No confirmed property scope supplied. Clarify the rental requirement first."}, "tools": negotiator_tools()}]

existing = {agent.name: agent.agent_id for agent in client.conversational_ai.agents.list().agents}
for definition in AGENTS:
    agent_id = existing.get(definition["name"]) or existing.get(definition.get("legacy_name", ""))
    if not agent_id:
        agent_id = client.conversational_ai.agents.create(name=definition["name"], conversation_config=config(definition), platform_settings={"privacy": {"record_voice": True, "retention_days": 730, "delete_transcript_and_pii": True, "delete_audio": True}}).agent_id
    current = client.conversational_ai.agents.get(agent_id)
    merged = current.conversation_config.model_dump(exclude_none=True)
    merged.update(config(definition)); merged["agent"]["prompt"].pop("tool_ids", None)
    client.conversational_ai.agents.update(agent_id, name=definition["name"], conversation_config=merged)
    print(f"Agent ready: {definition['name']} ({agent_id})")
if not PUBLIC_URL or not TOOL_SECRET:
    print("Live webhook tools skipped: set SCOUT_PUBLIC_ORCHESTRATOR_URL and SCOUT_AGENT_TOOL_SECRET after public deployment.")
