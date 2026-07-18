const STEPS = [
  { n: "01", title: "Confirm one requirement", fact: "Voice or document. Reused verbatim on every call." },
  { n: "02", title: "Discover & geofence", fact: "Filtered by radius and commute time before any call goes out." },
  { n: "03", title: "Call & negotiate", fact: "Price moves only against a real, verified comparable." },
  { n: "04", title: "Ranked shortlist", fact: "Every claim links to the transcript line it came from." },
];

export default function Home() {
  return (
    <div className="space-y-10">
      <section className="max-w-2xl space-y-5">
        <h1 className="text-4xl leading-[1.1] sm:text-5xl">
          One requirement. Parallel calls. A shortlist you can audit.
        </h1>
        <p className="text-base leading-relaxed text-charcoal/80">
          Scout is a voice-AI negotiator for Indian real estate. It calls landlords and PG owners,
          negotiates with verified leverage, and ties every number to the call it came from.
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
