import Link from "next/link";
import { ArrowRight, Zap, Layers, ShieldCheck, Wand2, Check } from "lucide-react";

export default function LandingPage() {
  return (
    <div
      className="min-h-screen"
      style={{ background: "var(--bg)", color: "var(--text-primary)" }}
    >
      {/* Nav */}
      <nav
        className="sticky top-0 z-40 backdrop-blur-xl"
        style={{
          background: "color-mix(in srgb, var(--bg) 85%, transparent)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
          <Link href="/" className="flex items-center gap-2.5">
            <div
              className="flex h-7 w-7 items-center justify-center rounded-lg"
              style={{
                background: "var(--accent)",
                boxShadow: "0 2px 8px var(--accent-glow)",
              }}
            >
              <Zap className="h-3.5 w-3.5" style={{ color: "var(--accent-foreground)" }} />
            </div>
            <span className="text-[15px] font-bold tracking-tight">Duck</span>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="nav-back-link text-sm font-medium"
            >
              Sign in
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-90 active:scale-[0.97]"
              style={{
                background: "var(--accent)",
                color: "var(--accent-foreground)",
                boxShadow: "0 1px 4px var(--accent-glow)",
              }}
            >
              Get started
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Subtle grid background */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(var(--accent) 1px, transparent 1px), linear-gradient(90deg, var(--accent) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        {/* Radial glow */}
        <div
          className="absolute inset-x-0 top-0 h-[500px] opacity-20"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% -10%, var(--accent), transparent)",
          }}
        />

        <div className="relative mx-auto max-w-6xl px-6 pb-24 pt-20 text-center">
          {/* Badge */}
          <div
            className="mb-8 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold"
            style={{
              background: "var(--accent-subtle)",
              border: "1px solid color-mix(in srgb, var(--accent) 30%, transparent)",
              color: "var(--accent)",
            }}
          >
            <Zap className="h-3 w-3" />
            AI-powered brand consistency · Now in beta
          </div>

          <h1
            className="text-balance text-5xl font-bold tracking-tight sm:text-6xl lg:text-[72px] lg:leading-[1.05]"
            style={{ color: "var(--text-primary)" }}
          >
            Images that{" "}
            <span
              style={{
                color: "var(--accent)",
                textShadow: "0 0 40px var(--accent-glow)",
              }}
            >
              look like your brand
            </span>
            {" "}every time.
          </h1>

          <p
            className="mx-auto mt-6 max-w-xl text-lg leading-relaxed"
            style={{ color: "var(--text-muted)" }}
          >
            Upload a few reference images. Duck learns your brand&apos;s visual DNA —
            lighting, colour palette, composition, mood — and applies it to every
            generated image automatically.
          </p>

          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl px-7 py-3.5 text-base font-semibold transition-opacity hover:opacity-90 active:scale-[0.97]"
              style={{
                background: "var(--accent)",
                color: "var(--accent-foreground)",
                boxShadow: "0 4px 20px var(--accent-glow), 0 1px 3px rgba(0,0,0,0.1)",
              }}
            >
              Start for free
              <ArrowRight className="h-4 w-4" />
            </Link>
            <p className="text-sm" style={{ color: "var(--text-subtle)" }}>
              No credit card required
            </p>
          </div>

          {/* Social proof */}
          <div
            className="mt-16 flex items-center justify-center gap-8 text-sm"
            style={{ color: "var(--text-subtle)" }}
          >
            {["No credit card", "Free during beta", "Powered by Flux 1.1 Pro"].map((item) => (
              <span key={item} className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5" style={{ color: "var(--accent)" }} />
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section
        className="border-y py-20"
        style={{ borderColor: "var(--border)", background: "var(--surface-1)" }}
      >
        <div className="mx-auto max-w-6xl px-6">
          <p
            className="mb-12 text-center text-xs font-semibold uppercase tracking-widest"
            style={{ color: "var(--accent)" }}
          >
            How it works
          </p>
          <div className="grid gap-8 sm:grid-cols-3">
            {[
              {
                step: "01",
                title: "Upload references",
                desc: "Drop 4–10 photos that represent your brand's visual style — product shots, campaigns, mood boards.",
              },
              {
                step: "02",
                title: "AI builds your brand DNA",
                desc: "Our AI extracts your lighting signature, colour palette, composition rules, and aesthetic mood.",
              },
              {
                step: "03",
                title: "Generate on-brand images",
                desc: "Describe what you need in plain English. Every output is automatically brand-consistent.",
              },
            ].map(({ step, title, desc }) => (
              <div key={step} className="relative flex gap-5">
                <div className="flex-shrink-0">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-xl text-xs font-bold"
                    style={{
                      background: "var(--accent-subtle)",
                      border: "1px solid color-mix(in srgb, var(--accent) 25%, transparent)",
                      color: "var(--accent)",
                    }}
                  >
                    {step}
                  </div>
                </div>
                <div>
                  <h3
                    className="mb-1.5 font-semibold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {title}
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
                    {desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <p
          className="mb-12 text-center text-xs font-semibold uppercase tracking-widest"
          style={{ color: "var(--accent)" }}
        >
          Features
        </p>
        <div className="grid gap-5 sm:grid-cols-3">
          <FeatureCard
            icon={<Layers className="h-5 w-5" />}
            title="Brand Visual DNA"
            description="Upload 4–10 reference images. Our AI extracts your brand's unique lighting signature, colour palette, composition rules, and aesthetic mood."
          />
          <FeatureCard
            icon={<Wand2 className="h-5 w-5" />}
            title="Generate in Seconds"
            description="Describe what you need in plain English. Flux 1.1 Pro renders brand-consistent images in parallel — 1, 2, or 4 at a time."
          />
          <FeatureCard
            icon={<ShieldCheck className="h-5 w-5" />}
            title="Quality Checker"
            description="Audit any image against your brand guidelines. Get a compliance score, grade (PASS / WARN / FAIL), and specific improvement actions."
          />
        </div>
      </section>

      {/* Pricing */}
      <section
        className="border-t"
        style={{
          borderColor: "var(--border)",
          background: "var(--surface-1)",
        }}
      >
        <div className="mx-auto max-w-2xl px-6 py-24 text-center">
          <p
            className="mb-4 text-xs font-semibold uppercase tracking-widest"
            style={{ color: "var(--accent)" }}
          >
            Pricing
          </p>
          <h2
            className="text-3xl font-bold tracking-tight"
            style={{ color: "var(--text-primary)" }}
          >
            Simple, transparent pricing
          </h2>
          <p className="mt-4 leading-relaxed" style={{ color: "var(--text-muted)" }}>
            Pricing coming soon. Get in early and use Duck for free during the beta.
          </p>
          <Link
            href="/login"
            className="mt-8 inline-flex items-center gap-2 rounded-xl px-8 py-3.5 text-base font-semibold transition-opacity hover:opacity-90 active:scale-[0.97]"
            style={{
              background: "var(--accent)",
              color: "var(--accent-foreground)",
              boxShadow: "0 4px 20px var(--accent-glow)",
            }}
          >
            Join the beta — it&apos;s free
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer
        className="border-t px-6 py-8"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="flex h-6 w-6 items-center justify-center rounded-md"
              style={{ background: "var(--accent)" }}
            >
              <Zap className="h-3 w-3" style={{ color: "var(--accent-foreground)" }} />
            </div>
            <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              Duck
            </span>
          </div>
          <p className="text-sm" style={{ color: "var(--text-subtle)" }}>
            &copy; {new Date().getFullYear()} Duck. All rights reserved.
          </p>
        </div>
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
    <div
      className="feature-card rounded-2xl p-6"
      style={{
        border: "1px solid var(--border)",
        background: "var(--card-bg)",
      }}
    >
      <div
        className="mb-5 inline-flex rounded-xl p-3"
        style={{
          background: "var(--accent-subtle)",
          border: "1px solid color-mix(in srgb, var(--accent) 20%, transparent)",
          color: "var(--accent)",
        }}
      >
        {icon}
      </div>
      <h3
        className="mb-2 font-semibold"
        style={{ color: "var(--text-primary)" }}
      >
        {title}
      </h3>
      <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
        {description}
      </p>
    </div>
  );
}
