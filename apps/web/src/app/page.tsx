import Link from "next/link";
import { ArrowRight, Zap, Layers, ShieldCheck } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text-primary)]">
      {/* Nav */}
      <nav className="border-b border-[var(--border)] bg-[var(--surface-1)]/80 backdrop-blur-md sticky top-0 z-40">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="text-xl font-bold tracking-tight">
            <span className="text-[var(--accent)]">Duck</span>
          </span>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/login"
              className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-foreground)] hover:opacity-90 transition-opacity"
            >
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 py-24 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-[var(--accent)]/30 bg-[var(--accent)]/10 px-4 py-1.5 text-xs font-medium text-[var(--accent)] mb-8">
          <Zap className="h-3.5 w-3.5" />
          AI-powered brand consistency
        </div>

        <h1 className="text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
          Generate images that{" "}
          <span className="text-[var(--accent)]">look like your brand</span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg text-[var(--text-muted)] leading-relaxed">
          Upload a few reference images. Duck learns your brand&apos;s visual DNA —
          lighting, colour palette, composition, mood. Every generated image is
          on-brand, every time.
        </p>

        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-8 py-3.5 text-base font-semibold text-[var(--accent-foreground)] hover:opacity-90 transition-opacity shadow-lg shadow-[var(--accent)]/20"
          >
            Start for free
            <ArrowRight className="h-4 w-4" />
          </Link>
          <span className="text-sm text-[var(--text-muted)]">No credit card required</span>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="grid gap-6 sm:grid-cols-3">
          <FeatureCard
            icon={<Layers className="h-6 w-6" />}
            title="Brand Visual DNA"
            description="Upload 4–10 reference images. Our AI extracts your brand's unique lighting signature, colour palette, composition rules, and aesthetic mood."
          />
          <FeatureCard
            icon={<Zap className="h-6 w-6" />}
            title="Generate in Seconds"
            description="Describe what you need in plain English. Flux 1.1 Pro renders brand-consistent images in parallel — 1, 2, or 4 at a time."
          />
          <FeatureCard
            icon={<ShieldCheck className="h-6 w-6" />}
            title="Quality Checker"
            description="Audit any image against your brand guidelines. Get a compliance score, grade (PASS/WARN/FAIL), and specific improvement actions."
          />
        </div>
      </section>

      {/* Pricing placeholder */}
      <section className="border-t border-[var(--border)] bg-[var(--surface-1)]">
        <div className="mx-auto max-w-6xl px-6 py-24 text-center">
          <h2 className="text-3xl font-bold">Simple pricing</h2>
          <p className="mt-4 text-[var(--text-muted)]">
            Pricing coming soon. Get in early and use Duck for free during the beta.
          </p>
          <Link
            href="/login"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-8 py-3.5 text-base font-semibold text-[var(--accent-foreground)] hover:opacity-90 transition-opacity"
          >
            Join the beta
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] px-6 py-8 text-center text-sm text-[var(--text-muted)]">
        &copy; {new Date().getFullYear()} Duck. All rights reserved.
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-6">
      <div className="mb-4 inline-flex rounded-xl bg-[var(--accent)]/10 p-3 text-[var(--accent)]">
        {icon}
      </div>
      <h3 className="mb-2 text-lg font-semibold">{title}</h3>
      <p className="text-sm text-[var(--text-muted)] leading-relaxed">{description}</p>
    </div>
  );
}
