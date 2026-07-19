# Scout Product Design System

This is the canonical visual, UX, and product-language specification for Scout. Read it before changing `apps/web`.

## Product Truth

Scout is an AI outbound action agent. A user describes an outcome once; Scout finds or accepts authorized targets, calls them, asks the required questions, follows up, negotiates within explicit limits, and returns what each target accepted, declined, or conditioned with transcript evidence.

Real estate, stays, vendors, local services, moving, and client outreach are examples. Do not present Scout as a real-estate-only product.

The primary user model is:

1. **Outcome**: what should happen, what must be asked, and what Scout may negotiate.
2. **Targets**: who Scout should find or which authorized contacts it should call.
3. **Conversations**: disclosed AI calls, follow-ups, live status, and transcript evidence.
4. **Results**: accepted, declined, and conditional terms with next actions and sources.

Use these names consistently in navigation, headings, empty states, and status messages.

## Experience Principles

### Immediate comprehension

Within the first viewport, a visitor must understand that Scout calls and negotiates on their behalf. Prefer concrete language over abstract slogans.

- Good: `Tell Scout what you need. It calls and negotiates for you.`
- Good: `Scout handles every call. You choose the deal.`
- Avoid: `Bring the whole market to one conversation.`
- Avoid calling the universal intake a `property brief` or the results a `rental report`.

### Voice-first, not chat-first

Scout is a voice agent. Product walkthroughs may use live speech captions and timestamps to make muted demos understandable, but must not resemble a messaging app. Use transcript rows, speaker rails, waveforms, explicit `LIVE VOICE TRANSCRIPT` labels, and call controls.

### User control

Always show the outcome, hard limits, and negotiation authority before calls. Scout may confirm provisional terms but cannot pay, sign, or make a binding commitment without approval.

### Evidence over claims

Results should show factual outcomes, transcripts, recordings, sources, and next steps. Never invent offers, savings, call completion, availability, or target phone numbers.

## Visual Direction

Scout uses a light, human, premium product language influenced by Apple material hierarchy and strong editorial SaaS storytelling. It is not a clone of another site.

### Required qualities

- Light theme by default.
- Warm-white and cool-gray surfaces with restrained blue accents.
- Opaque or materially frosted navigation. Content must never visibly read through the nav.
- Large editorial headings, clear product copy, generous whitespace, and intentional asymmetry.
- Rounded surfaces with consistent radii and soft, layered elevation.
- One meaningful visual per section rather than decorative clutter.
- Human illustrations and real product UI should communicate work being delegated.

### Avoid

- Transparent nav bars.
- Full-width black progress strips or dark hero sections.
- Purple-on-white default AI gradients.
- Generic dashboard grids in marketing sections.
- Floating pills without meaning.
- Chat bubbles for voice interactions.
- Tiny low-quality illustrations surrounded by empty space.
- Multiple competing typefaces, excessive all-caps, or copy smaller than 10px for meaningful content.

## Tokens

Use CSS custom properties or Tailwind theme aliases rather than scattering new values.

### Color

| Role | Value | Usage |
| --- | --- | --- |
| Ink | `#1d1d1f` | Primary text and controls |
| Secondary | `#6e6e73` | Supporting copy |
| Tertiary | `#8e8e93` | Metadata only |
| Canvas | `#f5f5f7` | Page background |
| Surface | `#fbfbfd` / `#ffffff` | Cards and navigation |
| Line | `rgba(60,60,67,.12)` | Quiet separators |
| Action | `#0071e3` | Primary action and active state |
| Action light | `#2997ff` | Button highlight |
| Success | `#16875f` | Verified outcomes only |
| Warning | `#ff9f0a` | Conditional attention |
| Danger | `#ff3b30` | Errors and blocked actions |

Gradients should create atmosphere or material depth, not become the brand. Blue, ice, lavender, coral, and warm yellow may appear in voice-orb or illustration accents.

### Type

- Product UI and display: `Avenir Next`, `SF Pro Display`, or the existing Apple-compatible stack.
- Body: `SF Pro Text` / `Helvetica Neue` compatible stack.
- Do not introduce Inter, Roboto, Arial, or a new webfont without a design review.
- Display headings use tight tracking (`-0.04em` to `-0.06em`) and balanced wrapping.
- Body text uses comfortable line height (`1.5` to `1.7`) and stays under roughly 68 characters per line.

### Radius and elevation

- Page section: `28px` to `44px`.
- Product panel: `20px` to `28px`.
- Control/card: `12px` to `18px`.
- Pill: `999px` only for actions, switches, tags, or status.
- Use quiet borders plus one soft shadow. Avoid stacking heavy shadows.

## Layout

- Main content max width: about `1110px` to `1180px`.
- Full-bleed showcase sections may use `calc(100vw - 36px)` with centered content.
- Desktop sections generally use a `55/45` or `60/40` split.
- Mobile becomes one column with the narrative before the visual.
- Keep content within the viewport. Horizontal scrolling is allowed only inside explicitly scrollable rails.
- Sticky elements must account for the header height and cannot cover headings or controls.

## Core Patterns

### Navigation

- The site header is a sticky opaque material capsule.
- Desktop capsule width is about `1110px`, height `68px`, with a subtle border and shadow.
- Mobile uses the same opaque surface and a clear menu control.
- Primary CTA copy is `Tell Scout what you need`.
- Flow navigation uses `Outcome / Targets / Conversations / Results` in a separate light material stepper.

### Home hero

- State the product category and job directly.
- Use one voice orb or meaningful generated visual, never a phone mockup in the hero.
- Show three concrete jobs Scout can handle.
- Primary CTA delegates an outcome; secondary CTA explains or demonstrates the work.

### Voice intake

- Voice is the primary mode; written intake is the alternative.
- The orb is a large tap target with clear ready, connecting, listening, and unavailable states.
- Explain that Scout asks for missing targets, questions, limits, timing, and authority.
- Read the outcome back and require confirmation before saving.

### Product walkthrough

- A phone may appear below the hero to visualize a real call.
- Use transcript rows with speakers and timestamps, not chat bubbles.
- Label muted demos so users understand they are seeing live captions from a voice call.
- The desktop side shows the same outcome moving through discovery, qualification, calling, negotiation, and evidence.

### Human outcome scene

- Show a person relaxed or focused while Scout handles background work.
- Surround the visual with a small number of factual live cards: target search, call status, verified terms, results ready.
- Generated assets belong in `apps/web/public/media`; keep optimized WebP/AVIF variants for the site.
- Do not copy proprietary illustrations from reference sites.

### State pages

- Every flow state uses one strong heading, a brief explanation, and one clear next action.
- Summary cards repeat the confirmed outcome and constraints.
- Empty states explain the next valid action rather than presenting dead UI.
- Tables and lists preserve source, status, and evidence hierarchy.

## Motion

- Use motion to explain state changes: initial reveal, voice listening, call progress, or result completion.
- Default durations: `160ms` for controls, `300-450ms` for panels, and slow restrained floating only for illustrations.
- Respect `prefers-reduced-motion`; the product must remain understandable with animation disabled.
- Never animate every card independently or use motion solely to make a static layout feel busy.

## Accessibility

- Maintain WCAG AA contrast for text and controls.
- Interactive controls need visible keyboard focus and at least a `44px` mobile target.
- Use semantic headings, landmarks, ordered steps, labels, and live regions.
- Decorative art is hidden from assistive technology; informative art has concise alt text.
- Do not rely on color alone for status.
- Validate both `390px` mobile and `1440px` desktop widths with no document overflow.

## Copy Rules

- Say `target`, `contact`, or `company` when the workflow is universal.
- Say `conversation` in user-facing progress; `call` is acceptable when describing the actual action.
- Say `outcome`, not `brief`, unless referring to a saved technical artifact.
- Say `results`, not `report`, in primary navigation.
- Real-estate terms may appear only inside a clearly labeled real-estate example.
- Never imply that Scout has called, negotiated, saved money, or reached agreement unless the underlying state supports it.

## Implementation Sources

- App shell and metadata: `apps/web/src/app/layout.tsx`
- Global tokens and materials: `apps/web/src/app/globals.css`
- Main marketing narrative: `apps/web/src/app/page.tsx`
- Header and flow stepper: `apps/web/src/components/StageNav.tsx`
- Voice-first hero: `apps/web/src/components/ScoutHero.tsx`
- Voice walkthrough: `apps/web/src/components/LiveCallDemo.tsx`
- Human outcome scene: `apps/web/src/components/WorkflowShowcase.tsx`
- Universal intake: `apps/web/src/app/real-estate/page.tsx` exposed at `/delegate`

Do not create another global theme layer without first consolidating the existing rules. New components should use established tokens and patterns.

## Required UI Verification

Before completing a frontend change:

1. Run `pnpm --filter @scout/web build`.
2. Check `/`, `/delegate`, `/discover`, `/calls`, and `/report`.
3. Verify at `1440x1000` and `390x844`.
4. Confirm the nav surface is not transparent.
5. Confirm no document-width overflow.
6. Confirm the four flow labels are current.
7. Check browser console errors and distinguish expected unconfigured local services from UI failures.
8. Capture the changed section in a browser when visual work is substantial.

## Design Change Checklist

- Does the first viewport explain what Scout does?
- Is the next action obvious?
- Does this work for non-real-estate tasks?
- Is a voice interaction clearly a voice interaction?
- Are claims backed by visible state or evidence?
- Does mobile preserve the same task order and meaning?
- Are surfaces opaque enough to keep text readable?
- Is the visual meaningful, licensed, generated for Scout, or original?
