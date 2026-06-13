"use client";

import { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  Globe,
  FileText,
  Image,
  Megaphone,
  TrendingUp,
  Palette,
  ArrowRight,
  Check,
  ChevronDown,
  Zap,
  Brain,
  Target,
  BarChart3,
  Layers,
  Users,
} from "lucide-react";
import { useAuth, SignUpButton } from "@clerk/clerk-react";

const NAV_LINKS = ["Features", "How It Works", "Comparison", "Pricing"];

const STAGES = [
  {
    number: "01",
    icon: Globe,
    title: "Website Ingestion",
    description:
      "Drop in your URL. We scrape, parse, and extract your full business context — products, positioning, audience, differentiators.",
  },
  {
    number: "02",
    icon: Brain,
    title: "Brand Discovery",
    description:
      "AI builds your Brand DNA — voice, story, messaging pillars, personas, and visual language. No brief required.",
  },
  {
    number: "03",
    icon: TrendingUp,
    title: "Competitor Intelligence",
    description:
      "Feed competitor URLs. Get a full positioning gap map, strengths, weaknesses, and whitespace opportunities.",
  },
  {
    number: "04",
    icon: FileText,
    title: "Content Engine",
    description:
      "LinkedIn, blogs, SEO articles, emails, WhatsApp, social — all written in your brand voice. Instantly.",
  },
  {
    number: "05",
    icon: Image,
    title: "Creative Engine",
    description:
      "Brand-aware posters, banners, carousels, and ad creatives in square, portrait, and landscape — generated in seconds.",
  },
  {
    number: "06",
    icon: Megaphone,
    title: "Campaign Engine",
    description:
      "Full campaign briefs for launch, lead gen, awareness, seasonal, and competitor takeaway — with timelines and budgets.",
  },
  {
    number: "07",
    icon: Target,
    title: "Outreach Engine",
    description:
      "Sales and marketing outreach sequences tailored to your ICP, brand voice, and campaign objectives.",
  },
  {
    number: "08",
    icon: BarChart3,
    title: "Intelligence Engine",
    description:
      "Continuous market monitoring, trend alerts, and strategic recommendations — your always-on marketing brain.",
  },
];

const COMPARISON = [
  {
    capability: "Website Scraping",
    jasper: false,
    canva: false,
    copy: false,
    contentOS: true,
  },
  {
    capability: "Business Understanding",
    jasper: "partial",
    canva: false,
    copy: "partial",
    contentOS: true,
  },
  {
    capability: "Brand Intelligence",
    jasper: "partial",
    canva: false,
    copy: false,
    contentOS: true,
  },
  {
    capability: "Competitor Intelligence",
    jasper: false,
    canva: false,
    copy: false,
    contentOS: true,
  },
  {
    capability: "Brand Kit Generation",
    jasper: "partial",
    canva: "partial",
    copy: false,
    contentOS: true,
  },
  {
    capability: "Content Creation",
    jasper: true,
    canva: "partial",
    copy: true,
    contentOS: true,
  },
  {
    capability: "Poster / Creative Gen",
    jasper: false,
    canva: true,
    copy: false,
    contentOS: true,
  },
  {
    capability: "Campaign Generation",
    jasper: "partial",
    canva: false,
    copy: "partial",
    contentOS: true,
  },
  {
    capability: "Outreach Sequences",
    jasper: false,
    canva: false,
    copy: "partial",
    contentOS: true,
  },
  {
    capability: "Market Monitoring",
    jasper: false,
    canva: false,
    copy: false,
    contentOS: true,
  },
];

const AUDIENCE = [
  {
    icon: Users,
    label: "SMBs",
    desc: "One system for your entire marketing stack",
  },
  {
    icon: Layers,
    label: "Agencies",
    desc: "White-label brand brains for every client",
  },
  {
    icon: Zap,
    label: "Founders",
    desc: "Launch-ready brand and content from day one",
  },
  {
    icon: Target,
    label: "Marketing Teams",
    desc: "Unified context for consistent output at scale",
  },
];

function StatusCell({ value, isBrand }) {
  if (value === true)
    return <Check size={16} className={`mx-auto ${isBrand ? "text-orange-500 font-semibold" : "text-blue-500"}`} />;
  if (value === "partial")
    return (
      <span className="text-gray-400 text-xs mx-auto block text-center">
        Partial
      </span>
    );
  return (
    <span className="text-gray-200 text-xs mx-auto block text-center">—</span>
  );
}

export default function LandingPage() {
  const { isSignedIn } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const heroRef = useRef(null);
  const [mousePosition, setMousePosition] = useState({ x: -250, y: -250 });
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    
    const handleMouseMove = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    const handleMouseEnter = () => setIsHovered(true);
    const handleMouseLeave = () => setIsHovered(false);
    
    window.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseenter", handleMouseEnter);
    document.addEventListener("mouseleave", handleMouseLeave);
    
    setIsHovered(true);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseenter", handleMouseEnter);
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  const renderCTA = (className, children, key) => {
    if (isSignedIn) {
      return (
        <a key={key} href="/dashboard" className={className}>
          {children}
        </a>
      );
    }
    return (
      <SignUpButton key={key} mode="modal" forceRedirectUrl="/dashboard" signInForceRedirectUrl="/dashboard">
        <button className={`${className} cursor-pointer border-none flex items-center justify-center font-inter`} style={{ outline: 'none' }}>
          {children}
        </button>
      </SignUpButton>
    );
  };

  return (
    <div className="min-h-screen bg-white font-inter text-gray-900">
      {/* Interactive Cursor-Following Orange Gradient Blob */}
      <div
        className="fixed pointer-events-none rounded-full blur-[120px] z-[5] opacity-0"
        style={{
          left: `${mousePosition.x - 250}px`,
          top: `${mousePosition.y - 250}px`,
          width: "500px",
          height: "500px",
          background: "radial-gradient(circle, rgba(236,133,96,0.35) 0%, rgba(250,224,212,0.15) 60%, transparent 100%)",
          opacity: isHovered ? 1 : 0,
          transition: "left 0.2s cubic-bezier(0.16, 1, 0.3, 1), top 0.2s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.5s ease-in-out",
        }}
      />

      {/* Nav */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${
          scrolled
            ? "bg-white/60 backdrop-blur-lg border-b border-white/40 shadow-sm"
            : "bg-white/30 backdrop-blur-sm border-b border-white/20"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-gradient-to-tr from-orange-500 to-orange-400 rounded-lg flex items-center justify-center">
              <Sparkles size={14} className="text-white" />
            </div>
            <div>
              <span className="text-sm font-semibold text-gray-900">
                ContentOS
              </span>
              <span className="text-xs text-gray-400 ml-1.5">
                by The Vertical AI
              </span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map((link) => (
              <button
                key={link}
                onClick={() => scrollTo(link.toLowerCase().replace(/\s/g, "-"))}
                className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
              >
                {link}
              </button>
            ))}
          </div>

          {renderCTA(
            "inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 hover:scale-105 transition-premium shadow-sm shadow-blue-500/10",
            <>
              Get Started
              <ArrowRight size={14} />
            </>
          )}
        </div>
      </nav>

      {/* Hero */}
      <section
        ref={heroRef}
        className="relative min-h-screen flex items-center justify-center px-6 pt-24 pb-20 overflow-hidden"
      >
        {/* Background grid */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(to right, #f1f5f9 1px, transparent 1px), linear-gradient(to bottom, #f1f5f9 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />
        {/* Premium floating glowing blobs */}
        <div className="absolute top-[10%] left-[5%] w-[450px] h-[450px] rounded-full premium-glow-1 pointer-events-none" />
        <div className="absolute bottom-[10%] right-[5%] w-[500px] h-[500px] rounded-full premium-glow-2 pointer-events-none" />

        <div className="relative max-w-4xl mx-auto text-center z-10">
          <div className="inline-flex items-center gap-2 bg-orange-50 border border-orange-100 text-orange-600 rounded-full px-4 py-1.5 text-xs font-medium mb-8 shadow-sm">
            <Sparkles size={12} />
            AI-Powered Brand & Content Operating System
          </div>

          <h1 className="text-5xl md:text-7xl font-semibold tracking-tight text-gray-900 mb-6 leading-tight">
            Train Once.
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-[#1F3F74]">Create Everything.</span>
          </h1>

          <p className="text-lg text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            ContentOS ingests your business once — via website, documents, and
            competitor URLs — and becomes your persistent AI marketing brain
            that generates brand identity, content, creatives, and campaigns at
            scale.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-16">
            {renderCTA(
              "inline-flex items-center gap-2 px-6 py-3.5 bg-gradient-to-r from-blue-600 to-orange-500 hover:from-blue-700 hover:to-orange-600 text-white text-sm font-medium rounded-xl hover:scale-[1.02] shadow-lg shadow-orange-500/15 transition-premium",
              <>
                <Globe size={16} />
                Ingest Your Business — Free
              </>
            )}
            <button
              onClick={() => scrollTo("how-it-works")}
              className="inline-flex items-center gap-2 px-6 py-3.5 border border-gray-250 text-gray-700 text-sm font-medium rounded-xl hover:bg-white/40 hover:border-orange-300 transition-premium bg-white/20 backdrop-blur-sm"
            >
              See How It Works
              <ChevronDown size={16} />
            </button>
          </div>

          {/* Hero stats */}
          <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto">
            {[
              { value: "8", label: "AI Engines" },
              { value: "10+", label: "Content Types" },
              { value: "5", label: "Campaign Types" },
            ].map(({ value, label }) => (
              <div key={label} className="glass-card py-5 px-4 text-center rounded-2xl border border-white/40 shadow-md transition-premium hover-premium">
                <div className="text-2xl font-bold text-orange-500">
                  {value}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Problem Statement */}
      <section className="py-20 px-6 bg-gray-50 border-y border-gray-100">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-xs font-medium tracking-widest text-gray-400 uppercase mb-4">
            The Problem
          </p>
          <h2 className="text-3xl md:text-4xl font-semibold text-gray-900 tracking-tight mb-6">
            Businesses use 6–10 disconnected tools
            <br />
            for marketing. None of them understand your business.
          </h2>
          <p className="text-base text-gray-500 max-w-2xl mx-auto">
            Jasper for copy. Canva for design. Semrush for SEO. Copy.ai for
            content. Crayon for competitor intel. No single tool has full
            context. Every tool starts from zero. ContentOS changes that.
          </p>
        </div>
      </section>

      {/* Features / How It Works */}
      <section id="how-it-works" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-medium tracking-widest text-gray-400 uppercase mb-4">
              How It Works
            </p>
            <h2 className="text-3xl md:text-4xl font-semibold text-gray-900 tracking-tight mb-4">
              One ingestion. Eight engines.
            </h2>
            <p className="text-base text-gray-500 max-w-xl mx-auto">
              Your business context flows through every engine — so every output
              sounds like you, every time.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 max-w-7xl mx-auto">
            {STAGES.map((stage, idx) => {
              const Icon = stage.icon;
              const isEven = idx % 2 === 0;
              const iconColor = isEven ? "text-blue-600" : "text-orange-500";
              const iconBg = isEven ? "bg-blue-50 group-hover:bg-blue-100" : "bg-orange-50 group-hover:bg-orange-100";
              return (
                <div
                  key={stage.number}
                  className={`glass-card rounded-2xl p-6 hover-premium shadow-sm group border border-white/40 ${isEven ? "hover:border-blue-300" : "hover:border-orange-300"}`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-9 h-9 ${iconBg} rounded-lg flex items-center justify-center transition-colors`}>
                      <Icon size={18} className={iconColor} />
                    </div>
                    <span className="text-xs font-mono text-gray-300">
                      {stage.number}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">
                    {stage.title}
                  </h3>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    {stage.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features highlight */}
      <section
        id="features"
        className="py-24 px-6 bg-gray-50 border-y border-gray-100"
      >
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-medium tracking-widest text-gray-400 uppercase mb-4">
              Features
            </p>
            <h2 className="text-3xl md:text-4xl font-semibold text-gray-900 tracking-tight mb-4">
              Everything your marketing team needs
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: Brain,
                title: "Persistent Brand Memory",
                desc: "One ingestion trains the system on your business. Every piece of content, every creative, every campaign — always on-brand.",
                tags: ["Brand Voice", "ICP", "Messaging"],
              },
              {
                icon: FileText,
                title: "Multi-Format Content",
                desc: "LinkedIn posts, blog articles, SEO content, marketing emails, Instagram captions, Facebook posts — all in your voice.",
                tags: ["7 Content Types", "Brand-Voiced", "Instant"],
              },
              {
                icon: Image,
                title: "AI Creative Generation",
                desc: "Brand-aware posters, banners, and social creatives generated with Gemini. Square, portrait, and landscape formats.",
                tags: ["Gemini AI", "3 Formats", "Brand-Aware"],
              },
              {
                icon: TrendingUp,
                title: "Competitor Intelligence",
                desc: "Scrape up to 5 competitor websites at once. Get positioning maps, strengths, weaknesses, and whitespace opportunities.",
                tags: ["Firecrawl", "Gap Analysis", "Positioning"],
              },
              {
                icon: Megaphone,
                title: "Campaign Briefs",
                desc: "Full campaign strategies with objectives, channel mix, timelines, budget recommendations, and content ideas.",
                tags: ["5 Campaign Types", "Strategy", "Timeline"],
              },
              {
                icon: Palette,
                title: "Full Brand Kit",
                desc: "AI generates your complete brand identity — voice, story, color palette, typography, taglines, elevator pitch, and tone guidelines.",
                tags: ["Brand Voice", "Colors", "Typography"],
              },
            ].map((feature, idx) => {
              const Icon = feature.icon;
              const isEven = idx % 2 === 0;
              const iconColor = isEven ? "text-blue-600" : "text-orange-500";
              const iconBg = isEven ? "bg-blue-50" : "bg-orange-50";
              const tagBg = isEven ? "bg-blue-50/50 border-blue-100 text-blue-650" : "bg-orange-50/50 border-orange-100 text-orange-600";
              return (
                <div
                  key={feature.title}
                  className={`glass-card rounded-2xl border border-white/40 p-6 hover-premium shadow-md transition-premium ${isEven ? "hover:border-blue-300" : "hover:border-orange-300"}`}
                >
                  <div className={`w-10 h-10 ${iconBg} rounded-xl flex items-center justify-center mb-4`}>
                    <Icon size={20} className={iconColor} />
                  </div>
                  <h3 className="text-base font-semibold text-gray-900 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-gray-500 mb-4 leading-relaxed">
                    {feature.desc}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {feature.tags.map((tag) => (
                      <span
                        key={tag}
                        className={`inline-flex items-center border rounded-full px-2.5 py-1 text-xs ${tagBg}`}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section id="comparison" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-medium tracking-widest text-gray-400 uppercase mb-4">
              Comparison
            </p>
            <h2 className="text-3xl md:text-4xl font-semibold text-gray-900 tracking-tight mb-4">
              No single competitor covers the full stack.
            </h2>
            <p className="text-base text-gray-500">
              ContentOS owns the unified layer.
            </p>
          </div>

          <div className="glass-card border border-white/40 rounded-2xl overflow-hidden shadow-xl">
            {/* Table header */}
            <div className="grid grid-cols-5 bg-white/30 border-b border-white/20">
              <div className="p-4 text-xs font-medium text-gray-500 col-span-1">
                Capability
              </div>
              {["Jasper", "Canva", "Copy.ai", "ContentOS"].map((tool, i) => (
                <div
                  key={tool}
                  className={`p-4 text-xs font-semibold text-center ${
                    i === 3 ? "text-orange-600 bg-orange-50/50" : "text-gray-700"
                  }`}
                >
                  {tool}
                </div>
              ))}
            </div>

            {/* Table rows */}
            {COMPARISON.map((row, idx) => (
              <div
                key={row.capability}
                className={`grid grid-cols-5 border-b border-white/20 last:border-0 ${
                  idx % 2 === 0 ? "bg-white/40" : "bg-white/10"
                }`}
              >
                <div className="p-4 text-sm text-gray-700 col-span-1 flex items-center">
                  {row.capability}
                </div>
                <div className="p-4 flex items-center justify-center">
                  <StatusCell value={row.jasper} />
                </div>
                <div className="p-4 flex items-center justify-center">
                  <StatusCell value={row.canva} />
                </div>
                <div className="p-4 flex items-center justify-center">
                  <StatusCell value={row.copy} />
                </div>
                <div className="p-4 flex items-center justify-center bg-orange-50/20">
                  <StatusCell value={row.contentOS} isBrand={true} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who it's for */}
      <section className="py-24 px-6 bg-gray-50 border-y border-gray-100">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-medium tracking-widest text-gray-400 uppercase mb-4">
              Who It's For
            </p>
            <h2 className="text-3xl md:text-4xl font-semibold text-gray-900 tracking-tight">
              Built for teams who can't afford to start over every time.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            {AUDIENCE.map(({ icon: Icon, label, desc }) => (
              <div key={label} className="glass-card p-8 rounded-2xl text-center border border-white/40 shadow-md hover-premium hover:border-orange-355 transition-premium">
                <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Icon size={22} className="text-orange-500" />
                </div>
                <h3 className="text-base font-semibold text-gray-900 mb-2">
                  {label}
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing placeholder */}
      <section id="pricing" className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-medium tracking-widest text-gray-400 uppercase mb-4">
              Pricing
            </p>
            <h2 className="text-3xl md:text-4xl font-semibold text-gray-900 tracking-tight mb-4">
              Simple, transparent pricing
            </h2>
            <p className="text-base text-gray-500">
              Start free. Scale as your marketing output grows.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                name: "Starter",
                price: "₹2,999",
                period: "/mo",
                desc: "Perfect for founders and solo marketers",
                features: [
                  "1 business",
                  "Website ingestion",
                  "Brand kit generation",
                  "50 content pieces/mo",
                  "10 creatives/mo",
                  "3 campaigns/mo",
                ],
                cta: "Get Started",
                highlight: false,
              },
              {
                name: "Growth",
                price: "₹7,999",
                period: "/mo",
                desc: "For growing teams and agencies",
                features: [
                  "5 businesses",
                  "Everything in Starter",
                  "Competitor intelligence",
                  "200 content pieces/mo",
                  "50 creatives/mo",
                  "Unlimited campaigns",
                  "PDF/DOCX export",
                ],
                cta: "Get Started",
                highlight: true,
              },
              {
                name: "Enterprise",
                price: "Custom",
                period: "",
                desc: "For large teams and enterprises",
                features: [
                  "Unlimited businesses",
                  "Everything in Growth",
                  "Market monitoring",
                  "Outreach engine",
                  "White-label",
                  "Dedicated support",
                  "Custom integrations",
                ],
                cta: "Contact Us",
                highlight: false,
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl border p-8 transition-premium hover-premium ${
                  plan.highlight
                    ? "bg-gradient-to-br from-[#1F3F74] to-[#EC8560] border-none text-white shadow-xl shadow-orange-500/15"
                    : "glass-card border-white/40 text-gray-900 shadow-md hover:border-orange-300"
                }`}
              >
                <div className="mb-6">
                  <h3
                    className={`text-sm font-semibold mb-1 ${
                      plan.highlight ? "text-orange-200" : "text-gray-500"
                    }`}
                  >
                    {plan.name}
                  </h3>
                  <div className="flex items-end gap-1">
                    <span
                      className={`text-3xl font-bold ${
                        plan.highlight ? "text-white" : "text-gray-900"
                      }`}
                    >
                      {plan.price}
                    </span>
                    {plan.period && (
                      <span
                        className={`text-sm mb-1 ${
                          plan.highlight ? "text-orange-100" : "text-gray-400"
                        }`}
                      >
                        {plan.period}
                      </span>
                    )}
                  </div>
                  <p
                    className={`text-xs mt-2 ${
                      plan.highlight ? "text-orange-100" : "text-gray-500"
                    }`}
                  >
                    {plan.desc}
                  </p>
                </div>

                <ul className="space-y-2.5 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check
                        size={14}
                        className={`mt-0.5 flex-shrink-0 ${
                          plan.highlight ? "text-orange-200" : "text-orange-500"
                        }`}
                      />
                      <span
                        className={`text-sm ${
                          plan.highlight ? "text-white" : "text-gray-600"
                        }`}
                      >
                        {f}
                      </span>
                    </li>
                  ))}
                </ul>

                {renderCTA(
                  plan.highlight
                    ? "block w-full py-3 text-center text-sm font-medium rounded-xl bg-white text-orange-600 hover:bg-orange-50 hover:scale-[1.02] transition-premium shadow-sm cursor-pointer border-none font-inter"
                    : "block w-full py-3 text-center text-sm font-medium rounded-xl bg-orange-500 text-white hover:bg-orange-600 hover:scale-[1.02] transition-premium shadow-sm shadow-orange-500/10 cursor-pointer border-none font-inter",
                  plan.cta
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 bg-gray-900">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-orange-955/20 border border-orange-800/30 text-orange-350 backdrop-blur-sm rounded-full px-4 py-1.5 text-xs font-medium mb-8">
            <Sparkles size={12} />
            Train Once. Create Everything.
          </div>
          <h2 className="text-4xl md:text-5xl font-semibold text-white tracking-tight mb-6">
            Your marketing brain,
            <br />
            built in minutes.
          </h2>
          <p className="text-base text-gray-400 mb-10 max-w-xl mx-auto">
            Stop starting from scratch. Ingest your business once and let
            ContentOS handle every piece of brand and marketing output —
            forever.
          </p>
          {renderCTA(
            "inline-flex items-center gap-2 px-8 py-4 bg-orange-500 text-white text-sm font-medium rounded-xl hover:bg-orange-600 hover:scale-[1.02] shadow-lg shadow-orange-500/20 transition-premium",
            <>
              <Globe size={16} />
              Start for Free — No Credit Card Required
              <ArrowRight size={16} />
            </>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 border-t border-gray-800 px-6 py-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gradient-to-tr from-orange-500 to-orange-400 rounded-md flex items-center justify-center">
              <Sparkles size={12} className="text-white" />
            </div>
            <span className="text-sm font-semibold text-white">ContentOS</span>
            <span className="text-xs text-gray-500">by The Vertical AI</span>
          </div>
          <p className="text-xs text-gray-600">
            © 2026 The Vertical AI. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            {["Privacy", "Terms", "Contact"].map((link) => (
              <a
                key={link}
                href="#"
                className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
              >
                {link}
              </a>
            ))}
          </div>
        </div>
      </footer>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        .font-inter { font-family: 'Inter', sans-serif; }
      `}</style>
    </div>
  );
}
