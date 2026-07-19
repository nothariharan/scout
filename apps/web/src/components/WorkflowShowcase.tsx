import { ArrowUpRight, BadgeCheck, FileCheck2, PhoneCall, Search } from "lucide-react";

export function WorkflowShowcase() {
  return (
    <section className="human-workflow" id="use-cases">
      <div className="human-workflow-copy">
        <p>SCOUT WORKS IN THE BACKGROUND</p>
        <h2>Scout handles every call.<br /><em>You choose the deal.</em></h2>
        <span>
          Give Scout the outcome, targets, and limits. It reaches every relevant person, handles
          follow-ups, negotiates, and returns who agreed, who declined, and the exact terms on the table.
        </span>
        <div className="human-use-cases">
          <a href="/delegate">Property &amp; stays</a>
          <a href="/delegate">Services &amp; vendors</a>
          <a href="/calls">Client deals</a>
        </div>
        <a className="human-workflow-cta" href="/delegate">
          Give Scout an outcome <ArrowUpRight size={16} aria-hidden="true" />
        </a>
      </div>

      <div className="human-scene">
        <img
          className="human-scene-art"
          src="/media/scout-outbound-agent-v2.webp"
          alt="A person relaxing with a laptop while Scout's voice agent works in the background"
          width="1200"
          height="800"
          loading="lazy"
          decoding="async"
        />
        <div className="float-card float-search">
          <Search size={17} aria-hidden="true" />
          <div><span>TARGET SEARCH</span><strong>14 strong options found</strong></div>
        </div>
        <div className="float-card float-call">
          <PhoneCall size={17} aria-hidden="true" />
          <div><span>CALLING NOW</span><strong>Comfort Stay · 00:47</strong></div>
          <i />
        </div>
        <div className="float-card float-saving">
          <BadgeCheck size={17} aria-hidden="true" />
          <div><span>VERIFIED SAVING</span><strong>₹1,500 below first quote</strong></div>
        </div>
        <div className="float-card float-report">
          <FileCheck2 size={17} aria-hidden="true" />
          <div><span>RESULTS READY</span><strong>8 transcripts attached</strong></div>
        </div>
      </div>
    </section>
  );
}
