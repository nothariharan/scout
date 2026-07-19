const STEPS = [
  { n: "01", title: "Confirm one requirement", fact: "Voice or document. Reused verbatim on every call." },
  { n: "02", title: "Discover & geofence", fact: "Filtered by radius and commute time before any call goes out." },
  { n: "03", title: "Decide the next move", fact: "Strategy is calculated from market truth, history, and verified leverage." },
  { n: "04", title: "Call & negotiate", fact: "The voice agent verbalizes the strategy; it does not invent one." },
  { n: "05", title: "Recommend & learn", fact: "Every outcome improves vendor and market intelligence." },
];

export default function Home() {
  return (
    <div className="space-y-10">
      <section className="max-w-2xl space-y-5">
        <h1 className="text-4xl leading-[1.1] sm:text-5xl">
          The buying agent that makes sure humans never overpay.
        </h1>
        <p className="text-base leading-relaxed text-charcoal/80">
          Scout researches a market, talks to businesses, negotiates on your behalf, and learns from every outcome. Moving companies are the first vertical; the negotiation engine is built to travel.
        </p>
        <div className="flex flex-wrap gap-3 pt-1">
          <a href="/intake" className="btn">
            START INTAKE →
          </a>
          <a href="/report/req_demo_koramangala_pg" className="btn-ghost">
            SEE A REPORT
          </a>
        </div>
      </section>

      <div className="wire" />

      <section>
        <ol>
          {STEPS.map((s, i) => (
            <li key={s.n}>
              <div className="flex items-baseline gap-6 py-5">
                <span className="call-idx w-14 shrink-0">{s.n}</span>
                <div>
                  <h3 className="text-xl">{s.title}</h3>
                  <p className="mt-1 text-sm text-charcoal/70">{s.fact}</p>
                </div>
              </div>
              {i < STEPS.length - 1 && <div className="wire" />}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
