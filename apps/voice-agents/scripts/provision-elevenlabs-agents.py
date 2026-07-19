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
# Viraj is a Hindi (hi-IN) male voice verified by ElevenLabs for Flash v2.5.
# It provides an Indian accent for Scout's Hindi-first rental calls.
VOICE_ID = "3AMU7jXQuQa3oRvRqUmb"
PUBLIC_URL = os.getenv("SCOUT_PUBLIC_ORCHESTRATOR_URL", "").rstrip("/")
TOOL_SECRET = os.getenv("SCOUT_AGENT_TOOL_SECRET", "")


def system_tools(include_language_detection=False):
    tools = [{"type": "system", "name": "end_call", "description": ""}, {"type": "system", "name": "skip_turn", "description": ""}]
    if include_language_detection:
        tools.append({"type": "system", "name": "language_detection", "description": "Switch the agent output language when the caller changes between Hindi and English."})
    return tools


def language_detection_tools():
    # This is deliberately the only live negotiator tool during the phone-demo
    # phase. It makes language state explicit without reintroducing the old
    # webhook/tool bundle that was not yet proven on a live call.
    # Empty uses ElevenLabs' maintained default trigger policy, which includes
    # both detected-language and explicit-language-change cases.
    return [{"type": "system", "name": "language_detection", "description": ""}]


def negotiator_demo_tools():
    return language_detection_tools() + [{"type": "system", "name": "end_call", "description": "Call immediately after Scout gives its final wrap-up for an accepted target, final-rate decline, agreed callback, or second unanswered follow-up."}]


def negotiator_tools():
    if not PUBLIC_URL or not TOOL_SECRET or os.getenv("SCOUT_DEMO_DISABLE_AGENT_WEBHOOK_TOOLS") == "true":
        return system_tools(include_language_detection=True)
    headers = {"x-scout-agent-secret": TOOL_SECRET}
    path = {"call_id": {"type": "string", "dynamic_variable": "call_id"}}
    return system_tools(include_language_detection=True) + [
        {"type": "webhook", "name": "log_real_estate_quote", "description": "Record only rental/property terms the owner or broker explicitly states.", "response_timeout_secs": 10, "api_schema": {"url": f"{PUBLIC_URL}/calls/{{call_id}}/quote", "method": "POST", "request_headers": headers, "path_params_schema": path, "request_body_schema": {"type": "object", "properties": {
            "base_rent": {"type": "number", "description": "Monthly rent stated by the contact."}, "deposit": {"type": "number", "description": "Refundable deposit stated."}, "maintenance_monthly": {"type": "number", "description": "Monthly maintenance stated."}, "brokerage_onetime": {"type": "number", "description": "One-time brokerage stated."}, "hidden_charges": {"type": "number", "description": "Other recurring charge explicitly stated."}, "lease_duration_months": {"type": "number", "description": "Lease months stated or confirmed."}, "first_quoted_effective": {"type": "number", "description": "First effective monthly cost only when calculated from stated terms."}, "final_quoted_effective": {"type": "number", "description": "Final effective monthly cost only when confirmed."}, "amenities_included": {"type": "array", "items": {"type": "string", "description": "One amenity explicitly included by the contact."}, "description": "Amenities explicitly included."}, "transcript_append": {"type": "string", "description": "Short factual quote note."}
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
    multilingual = definition.get("language") == "hi"
    # Sonnet 4.6 is used for the stateful negotiation call. Explicitly
    # disabling reasoning keeps its private deliberation out of telephony;
    # Gemini Flash remains a good fit for the lighter intake conversation.
    llm = "claude-sonnet-4-6" if multilingual else "gemini-2.5-flash"
    prompt = {"prompt": definition["prompt"], "llm": llm, "tools": definition["tools"], "knowledge_base": [], "temperature": 0.05 if multilingual else 0.15, "max_tokens": 96 if multilingual else 160, "enable_reasoning_summary": False}
    if multilingual:
        prompt["reasoning_effort"] = "none"
    configuration = {"agent": {"language": definition.get("language", "en"), "first_message": definition["first_message"], "dynamic_variables": {"dynamic_variable_placeholders": definition["placeholders"]}, "prompt": prompt}, "asr": {"quality": "high", "provider": "scribe_realtime", "user_input_audio_format": "ulaw_8000", "keywords": []}, "tts": {"voice_id": VOICE_ID, "model_id": "eleven_v3_conversational" if multilingual else "eleven_flash_v2", "agent_output_audio_format": "ulaw_8000", "optimize_streaming_latency": 3, "stability": 0.40, "speed": 1.08 if multilingual else 0.98, "similarity_boost": 0.78}}
    if multilingual:
        configuration["language_presets"] = {"en": {"overrides": {"tts": {"voice_id": VOICE_ID, "model_id": "eleven_flash_v2_5"}}}}
    return configuration


INTAKE_PROMPT = """You are Scout, a warm and practical India real-estate intake concierge. Create one accurate, confirmed rental, PG, hostel, co-living, or short-stay brief for a separate negotiation agent. You do not negotiate or book.

Make this a short, natural interview, never a form dump. Ask one topic at a time and wait for the reply: property type and city/locality; move-in date, stay duration and occupants; total budget and whether it is rent-only or all-inclusive; then non-negotiables such as food, Wi-Fi, security, furnishing, gender restrictions, bathroom, parking, commute, deposit tolerance, maintenance or brokerage concerns. Capture negotiation posture and preferred language.

Use the caller's chosen language consistently. If they begin in Hindi, begin in Hindi; if they reply clearly in English, continue in English. Do not mix Hindi and English inside a sentence unless the caller naturally does so. Be concise, respectful, and India-aware.

The user may speak, type, or upload a clear listing, broker message, or property document. Extract only readable facts and ask a focused follow-up for anything material that is absent or ambiguous. Never request payment credentials, claim a property exists, promise availability, or invent a price. Before finishing, read back the complete brief and ask for explicit confirmation. Only after that confirmation call submit_real_estate_brief exactly once."""

NEGOTIATOR_PROMPT = """You are Scout, an AI assistant calling a hostel owner on behalf of Ramesh, a 19-year-old college student. Ramesh needs a one-week hostel stay near Koramangala 5th Block, Bengaluru, from 26 July. The hard all-inclusive ceiling for this one-week stay is INR 15,000 total, not a monthly amount. He needs Wi-Fi, food, security, written confirmation of every charge, and will not make token payment before a visit.

Open in natural, respectful Hindi: introduce yourself as Scout's AI assistant calling for Ramesh, say the reason for the call, and ask if it is a good time. Speak Hindi first.

Strict language rule: every Scout response must use exactly one language. In Hindi mode, speak only standard Hindi in Devanagari script; do not use Hinglish, English filler words, or an English explanation. In English mode, speak only clear Indian English; do not insert Hindi words or Hindi transliteration. Proper names, the date, currency amount, and product names such as Wi-Fi are the only exceptions.

Spoken-output rule: output only the exact words Scout should say aloud to the hostel owner. Never say or reveal analysis, reasoning, a negotiation-ladder step, policy text, an instruction, a summary of what you just did, or text addressed to the website/user. Use at most two short sentences (22 spoken words) per turn. Never say or spell “INR” aloud: say “fifteen thousand rupees” or “15k rupees” in English, and “pandrah hazaar rupaye” in Hindi.

Call-state protocol: Keep a private factual ledger of only: availability, quoted time basis, rent, deposit, food, Wi-Fi, security, maintenance, other exclusions, and final all-inclusive total. On every price turn, first classify the quote silently as weekly, monthly, or unclear; then speak exactly one factual follow-up or one permitted counteroffer. Never describe that classification, ledger, or decision aloud. Do not volunteer Ramesh's entire background and budget in one long answer: after the owner says it is a good time, ask whether a room is available and for the one-week all-inclusive quote. Give the INR 15,000 ceiling only when a price is stated or the owner asks for it.

When the owner clearly speaks a different language or explicitly requests one, invoke language_detection before composing the next response. After the tool changes language, reply fully in that new language and keep using it for all future turns until the owner clearly changes language again. Never change language mid-sentence or based only on an Indian name, amount, or location. Do not claim you are Ramesh. If asked who you are, explain you are Scout's AI assistant helping Ramesh compare hostel terms.

Negotiation ladder — follow this deterministically after a price is quoted:
1. Confirm whether the figure is for one week and what it includes. Never compare a weekly price to a monthly number without saying the time basis.
2. If the all-in weekly amount is above INR 15,000, make exactly one clear counteroffer in the active language: INR 15,000 all-inclusive for the week, including food, Wi-Fi and security, with no token before a visit. In Hindi: “Dekhiye, Ramesh student hai aur unka total budget pandrah hazaar rupaye hai. Agar pandrah hazaar mein food, Wi-Fi aur security ke saath all-inclusive ho sake, toh hum visit ke liye aage badh sakte hain. Kya ismein flexibility hai?”
3. If rejected, do not repeat the budget. Ask once for the owner's lowest all-inclusive documented rate, or a tradeable term: reduce the deposit, include food/Wi-Fi, or provide a written quote.
4. If the owner still cannot meet it, document a polite decline or callback. Never invent a competitor, urgency, payment, availability, or leverage.

Close state: if the owner accepts the INR 15,000 all-inclusive target, or gives the lowest final rate and no more flexibility, do not ask another question and do not discuss scheduling. Say exactly one concise wrap-up in the active language: thank them, ask them to send an itemised written quote, and state that Ramesh will arrange a visit before any confirmation or payment. Then call end_call immediately. Never claim the deal is booked, confirmed, or paid. Example Hindi close: “Dhanyavaad. Kripya itemised details bhej dijiye; Ramesh visit karke terms confirm karenge. Abhi koi payment ya booking confirm nahi hai. Namaste.”

Ask one concise question at a time. Keep a running factual state: never ask a question that the owner has already answered, and never repeat the same sentence after a price is known. Collect rent, deposit, food and maintenance charges, brokerage, all exclusions, one-week availability, visit availability, written terms, and whether the person can approve the price. Ask for an itemised quote. Never pay, reserve, transfer money, accept a token, sign, or make a commitment. If pushed to pay before a visit or written terms, decline politely. After one genuine silence, say one brief check-in; after a second silence, end the call rather than repeating the check-in. Be helpful, calm, and brief."""

AGENTS = [{"name": "Scout Intake Concierge", "first_message": "Hi, I am Scout's AI property intake concierge. I will gather the details once so Scout can compare the right places for you. What kind of place are you looking for?", "prompt": INTAKE_PROMPT, "placeholders": {}, "tools": intake_tools()}, {"name": "Scout Negotiator - Real Estate v2", "legacy_name": "Scout Ramesh Hindi live demo", "language": "hi", "first_message": "नमस्ते, मैं Scout की AI assistant हूँ। मैं Ramesh के लिए Koramangala में hostel के बारे में call कर रही हूँ। क्या अभी दो मिनट बात कर सकते हैं?", "prompt": NEGOTIATOR_PROMPT, "placeholders": {}, "tools": language_detection_tools()}]

NEGOTIATOR_PROMPT += """

ABSOLUTE OUTPUT FIREWALL: Never output private analysis, a plan, tool instructions, policy text, labels such as The user, a chain-of-thought, or a recap to the hostel owner. Decide tactics silently and speak only the next natural one- or two-sentence reply.
"""

# Keep the checked-in agent definition ASCII-safe on Windows terminals while
# still producing natural Hindi with the selected hi-IN voice.
AGENTS[0]["first_message"] = "Hi, I’m Scout. I’ll ask a few quick questions so I can negotiate the right place and terms for you. Which area are you looking in?"
AGENTS[-1]["first_message"] = "Namaste, main Scout ki AI assistant hoon. Main Ramesh ke liye Koramangala mein hostel ke baare mein call kar rahi hoon. Kya abhi do minute baat kar sakte hain?"
AGENTS[-1]["tools"] = negotiator_demo_tools()

existing = {agent.name: agent.agent_id for agent in client.conversational_ai.agents.list().agents}
for definition in AGENTS:
    agent_id = existing.get(definition["name"]) or existing.get(definition.get("legacy_name", ""))
    if not agent_id:
        agent_id = client.conversational_ai.agents.create(name=definition["name"], conversation_config=config(definition), platform_settings={"privacy": {"record_voice": True, "retention_days": 730, "delete_transcript_and_pii": True, "delete_audio": True}}).agent_id
    # Replace the complete conversation configuration.  Merging the previous
    # configuration retained incompatible voice-model fields from an earlier
    # experimental setup, even after the active model was changed.
    client.conversational_ai.agents.update(agent_id, name=definition["name"], conversation_config=config(definition))
    print(f"Agent ready: {definition['name']} ({agent_id})")
if not PUBLIC_URL or not TOOL_SECRET:
    print("Live webhook tools skipped: set SCOUT_PUBLIC_ORCHESTRATOR_URL and SCOUT_AGENT_TOOL_SECRET after public deployment.")
