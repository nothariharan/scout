# Scout — Project Overview

## What it is

Scout is an autonomous buying agent built for the ElevenLabs Hack-Nation challenge **The Negotiator**. It turns one confirmed service brief into discovery, parallel honest voice negotiations, itemized comparable quotes, and a ranked recommendation — without inventing leverage or committing the customer’s money.

First shipping vertical: **moving companies**.  
Live demo path also wired: **India hostel / PG / rental negotiation** with Hindi-first voice.

## The problem

Buying local services is still a phone sport.

- Buyers call vendors one by one
- Quotes are inconsistent and rarely itemized the same way
- Negotiation leverage is lost because competing offers are not shared across calls
- Pressure tactics and non-binding quotes are hard to catch in real time
- People accept the first “good enough” number because shopping is exhausting

## The product promise

Give Scout the job once. It:

1. Confirms a complete brief (`RequirementSpec`)
2. Finds candidate providers
3. Calls them with a voice agent that can disclose it is AI
4. Collects itemized costs into a shared schema
5. Negotiates later calls using only **verified** competing quotes
6. Flags risk
7. Returns a ranked shortlist with transcript evidence

Humans stay in control. Scout never pays, signs, reserves, or binds.

## Why this wins The Negotiator

Judges reward agents that:

- extract comparable terms
- change price or terms with **truthful** leverage
- show evidence
- stay transparent

Scout is built around that evidence loop. The voice model is not allowed to invent competitor prices. A deterministic strategy engine decides the next negotiation move; the LLM speaks it.

## Who it is for

- People planning a move who want all-in comparable quotes
- Busy buyers who want negotiation transparency, not a black-box booking bot
- Students / newcomers hunting hostels and PGs in a new city
- Later: renovation and other home-service verticals with the same call → compare → haggle loop

## Demo story (judge-facing)

1. Confirm a moving (or hostel) brief once  
2. Discover candidates  
3. Run multiple calls with distinct seller styles  
4. Capture itemized quotes  
5. On a later call, cite a real competing quote and move the price/terms  
6. Show the ranked recommendation with evidence in the UI  

Repeatable without live phone credits via the **simulated market**.

## Team framing

Built as a four-person hackathon system around judging evidence, not a conventional frontend/backend split:

- Voice agent + conversation design
- Simulated market + evals
- Orchestration + decisioning
- UX + document intake

## One-liner

Scout is the buyer that calls for you — honestly, in parallel, with receipts.
