import {
  ArrowRight,
  ArrowUpRight,
  Building2,
  FileCheck2,
  Home,
  MapPin,
  Mic,
  Phone,
  ShieldCheck,
  Truck,
  X,
} from "lucide-react";

const ORBIT = [
  { Icon: Home, label: "Rentals", x: "2%", y: "76%", r: "-13deg", delay: "-.4s" },
  { Icon: MapPin, label: "Local search", x: "14%", y: "88%", r: "9deg", delay: "-1.2s" },
  { Icon: Truck, label: "Movers", x: "29%", y: "92%", r: "-7deg", delay: "-2s" },
  { Icon: Phone, label: "Calls", x: "44%", y: "88%", r: "12deg", delay: "-.8s" },
  { Icon: Building2, label: "Providers", x: "59%", y: "74%", r: "-9deg", delay: "-1.7s" },
  { Icon: FileCheck2, label: "Evidence", x: "76%", y: "64%", r: "10deg", delay: "-2.5s" },
  { Icon: ShieldCheck, label: "Verified", x: "91%", y: "74%", r: "-8deg", delay: "-1.1s" },
];

const HERO_WAVE = Array.from({ length: 58 }, (_, index) => {
  const center = 1 - Math.abs(index - 28.5) / 29;
  return Math.round(7 + center * 30 + ((index * 17) % 19));
});

function SplitPhone() {
  return (
    <div className="hero-device" aria-label="Scout active call interface">
      <div className="device-speaker" />
      <div className="device-status"><span>9:41</span><span>5G&nbsp;&nbsp;100%</span></div>
      <div className="device-contact">
        <span className="contact-orb">S</span><strong>Scout</strong><small>Outbound deal agent</small>
      </div>
      <div className="device-conversation">
        <div className="phone-message message-user">Find a 1-bed near Koramangala under Rs 16k.</div>
        <div className="phone-message message-scout">I found 14 options. Calling the top matches now.</div>
        <div className="phone-message message-result"><span>Comfort Stay</span>Rs 15,000 <b>to Rs 13,500</b></div>
      </div>
      <div className="device-divider" />
      <div className="device-voice">
        <div className="voice-controls"><button aria-label="End call"><X size={17} /></button><span>00:47</span><button aria-label="Mute"><Mic size={17} /></button></div>
        <div className="voice-bars" aria-hidden>
          {[18, 32, 48, 30, 62, 40, 54, 24, 45, 29, 18].map((height, index) => <i key={index} style={{ height, animationDelay: `${index * 70}ms` }} />)}
        </div>
        <p>Negotiating with verified leverage</p>
      </div>
      <div className="device-home" />
    </div>
  );
}

export function ScoutHero() {
  return (
    <section className="scout-main-hero">
      <div className="scout-wispr-grid">
        <div className="scout-main-copy">
          <p>AI THAT CALLS AND NEGOTIATES FOR YOU</p>
          <h1>Tell Scout what you need. <br /><em>It calls and negotiates for you.</em></h1>
          <span>Looking for a PG, property, vendor, service, or trying to close a client deal? Scout finds the right people, calls each one, asks your questions, negotiates within your limits, and reports exactly what they agreed to.</span>
          <ul className="hero-job-list" aria-label="Tasks you can delegate to Scout">
            <li>Find and negotiate PGs, stays, and property</li>
            <li>Call and compare vendors or services</li>
            <li>Follow up with prospects and confirm deal terms</li>
          </ul>
          <div className="scout-main-actions">
            <a href="/delegate" className="main-hero-primary">Tell Scout what you need <ArrowUpRight size={17} /></a>
            <a href="#product" className="main-hero-secondary">Watch Scout work <ArrowRight size={16} /></a>
          </div>
          <div className="hero-trust-line"><span>AI disclosed on every call</span><span>You approve the final terms</span></div>
        </div>

        <div className="orb-floating-stage" aria-label="Scout voice agent making a negotiation call">
          <div className="voice-orb" aria-hidden>
            <span className="orb-plasma orb-plasma-one" />
            <span className="orb-plasma orb-plasma-two" />
            <span className="orb-grain" />
            <span className="orb-shine" />
          </div>
          <div className="orb-wave" aria-hidden>{HERO_WAVE.slice(6, 52).map((height, index) => <i key={index} style={{ height, animationDelay: `${(index % 9) * -80}ms` }} />)}</div>
          <p className="orb-plain-caption">Example result · negotiated from ₹15,000 to ₹13,500</p>
        </div>
      </div>
      <div className="hero-capability-rail"><span>01 · Finds targets</span><span>02 · Calls each one</span><span>03 · Negotiates</span><span>04 · Returns agreed terms</span></div>
    </section>
  );
}

export function PhoneShowcase() {
  return (
    <section className="wispr-hero" id="phone-showcase">
      <div className="hero-mode-row" aria-label="Supported Scout workflows"><span>REAL ESTATE</span><span>MOVING</span><span>LOCAL SERVICES</span></div>
      <div className="wispr-hero-grid">
        <div className="wispr-hero-copy">
          <p className="wispr-eyebrow">SCOUT ON THE CALL</p>
          <h2>Every conversation.<br /><em>One clear decision.</em></h2>
          <p>Follow the search, calls, negotiation, and evidence from one focused interface. The conversation stays above; live voice controls stay exactly where your thumb expects.</p>
          <div className="wispr-actions"><a href="/calls" className="wispr-primary">Watch live calls <ArrowUpRight size={17} /></a><a href="/report" className="wispr-secondary">Open a report</a></div>
        </div>
        <SplitPhone />
      </div>
      <div className="orbit-belt" aria-hidden>
        {ORBIT.map(({ Icon, label, x, y, r, delay }) => <span key={label} className="orbit-tile" style={{ "--x": x, "--y": y, "--r": r, "--delay": delay } as React.CSSProperties}><Icon size={25} /></span>)}
      </div>
    </section>
  );
}
