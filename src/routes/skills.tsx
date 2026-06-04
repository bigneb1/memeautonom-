import { createFileRoute } from "@tanstack/react-router";
import { Tag } from "@/components/Tag";
import type { SkillListing } from "@/lib/types";
import { WalletSkillsPanel } from "@/components/WalletSkillsPanel";
import { useState } from "react";
import { useSkillsMarket } from "@/lib/api";

export const Route = createFileRoute("/skills")({
  component: Skills,
  head: () => ({
    meta: [
      { title: "Skills Market · MemeAutonom" },
      {
        name: "description",
        content:
          "Browse bounded decision-module skills that agent wallets can execute through a runtime.",
      },
    ],
  }),
});

function Skills() {
  const { data: skills = [], isLoading } = useSkillsMarket(20);

  return (
    <div className="space-y-6">
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Tag color="cyan">SKILLS_MARKET</Tag>
          <Tag color="red">BOUNDED EXECUTION</Tag>
        </div>
        <h1 className="font-display text-4xl md:text-5xl text-foreground leading-[0.95]">
          Skills are{" "}
          <span className="font-serif-italic text-yellow font-normal">decision modules</span>.
        </h1>
        <p className="font-mono text-xs text-muted-foreground mt-3 max-w-2xl">
          Each skill should define a condition checker, an action proposal, and a policy envelope.
          The runtime executes only after simulation and wallet-level limits pass.
        </p>
      </section>

      <section>
        <div className="flex items-end justify-between gap-3 border-b border-border pb-2 mb-4">
          <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-foreground">
            {">"} WALLETS_BY_SKILLS
          </div>
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground hidden sm:block">
            top wallets · live indexer
          </div>
        </div>
        <WalletSkillsPanel mode="top" limit={6} />
      </section>

      <section className="panel p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-2">
          <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-foreground">
            {">"} BYREAL_AGENT_SKILL
          </div>
          <Tag color="green">INSTALLED PACKAGE · @byreal-io/byreal-cli</Tag>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <Command label="DISCOVER" command="byreal-cli skill" />
          <Command label="CATALOG" command="byreal-cli catalog list" />
          <Command
            label="SAFE PREVIEW"
            command="BYREAL_ENABLED=true BYREAL_ARGS='overview -o json' npm run agent:runtime"
          />
        </div>
      </section>

      <section className="grid md:grid-cols-2 gap-5">
        {skills.length === 0 ? (
          <div className="md:col-span-2 panel p-6 text-center">
            <div className="font-display text-xl text-yellow">
              {isLoading ? "LOADING SKILLS" : "NO SKILLS INDEXED"}
            </div>
            <div className="font-mono text-xs text-muted-foreground mt-2">
              Publish skills through SkillRegistry and run the Envio indexer to populate this
              market.
            </div>
          </div>
        ) : (
          skills.map((s) => <SkillCard key={s.name} skill={s} />)
        )}
      </section>
    </div>
  );
}

function Command({ label, command }: { label: string; command: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };
  return (
    <button
      onClick={copy}
      className="border border-border bg-black/40 p-3 text-left hover:border-yellow/60"
    >
      <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 break-all font-mono text-[11px] text-cyan">$ {command}</div>
      <div className="mt-2 font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
        {copied ? "copied" : "copy"}
      </div>
    </button>
  );
}

function SkillCard({ skill }: { skill: SkillListing }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(skill.cli);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  const roleColor =
    skill.role === "SCOUT" ? "yellow" : skill.role === "EXECUTOR" ? "cyan" : "purple";

  return (
    <div className="panel p-6 flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Tag color={roleColor as "yellow"}>{skill.role}</Tag>
          <Tag color="muted">FIRES · {skill.fires}</Tag>
        </div>
        <span className="font-mono text-[10px] text-muted-foreground">
          {skill.installs} installs
        </span>
      </div>

      <div className="font-display text-2xl text-foreground">{skill.name}</div>
      <p className="font-mono text-[11px] text-muted-foreground mt-2 leading-relaxed flex-1">
        {skill.desc}
      </p>

      <div className="mt-5">
        <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground mb-1.5">
          INSTALL · BYREAL CLI
        </div>
        <button
          onClick={copy}
          className="w-full text-left bg-black border border-border hover:border-yellow/60 p-3 font-mono text-[11px] text-cyan flex items-center justify-between group transition-colors"
        >
          <span className="truncate pr-2">$ {skill.cli}</span>
          <span className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground group-hover:text-yellow shrink-0">
            {copied ? "✓ COPIED" : "COPY"}
          </span>
        </button>
        <div className="font-mono text-[10px] text-muted-foreground mt-2 uppercase tracking-[0.1em]">
          → runtime proposes · wallet limits enforce · events prove execution
        </div>
      </div>
    </div>
  );
}
