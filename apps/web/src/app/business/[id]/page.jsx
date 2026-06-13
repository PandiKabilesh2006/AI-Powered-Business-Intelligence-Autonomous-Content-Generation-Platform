"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ArrowLeft,
  Sparkles,
  FileText,
  Image,
  Megaphone,
  Palette,
  TrendingUp,
  Loader2,
  Globe,
  Copy,
  Check,
  AlertCircle,
  ChevronRight,
  Zap,
  Brain,
  BarChart3,
  Trash2,
  Video,
  Play,
  Pause,
  Film,
  RotateCcw,
  Upload,
  CheckCircle2,
  Download,
} from "lucide-react";

const CONTENT_TYPES = [
  { value: "linkedin", label: "LinkedIn Post" },
  { value: "blog", label: "Blog Article" },
  { value: "email", label: "Marketing Email" },
  { value: "twitter", label: "Twitter Thread" },
  { value: "instagram", label: "Instagram Caption" },
  { value: "facebook", label: "Facebook Post" },
  { value: "seo_article", label: "SEO Article" },
];

const CREATIVE_TYPES = [
  { value: "poster", label: "Poster" },
  { value: "banner", label: "Banner" },
  { value: "social", label: "Social Media Post" },
  { value: "ad", label: "Ad Creative" },
];

const FORMATS = [
  { value: "square", label: "Square (1:1)", dim: "1080×1080" },
  { value: "portrait", label: "Portrait (9:16)", dim: "1080×1920" },
  { value: "landscape", label: "Landscape (16:9)", dim: "1920×1080" },
];

const CAMPAIGN_TYPES = [
  { value: "launch", label: "Product Launch" },
  { value: "lead_gen", label: "Lead Generation" },
  { value: "awareness", label: "Brand Awareness" },
  { value: "seasonal", label: "Seasonal" },
  { value: "competitor", label: "Competitor Takeaway" },
];

const TABS = [
  { id: "overview", label: "Overview", icon: Sparkles },
  { id: "brand", label: "Brand Kit", icon: Palette },
  { id: "content", label: "Content", icon: FileText },
  { id: "creatives", label: "Creatives", icon: Image },
  { id: "video", label: "Videos", icon: Video },
  { id: "campaigns", label: "Campaigns", icon: Megaphone },
  { id: "intelligence", label: "Intelligence", icon: TrendingUp },
];

// ─── Utility Components ─────────────────────────────────────────────────────

function Pill({ children, color = "gray" }) {
  const colors = {
    gray: "bg-gray-100 text-gray-600 border border-gray-200",
    blue: "bg-orange-50/50 text-orange-600 border border-orange-100/50",
    green: "bg-green-50 text-green-600 border border-green-100",
    orange: "bg-orange-100 text-orange-700 border border-orange-200",
    violet: "bg-violet-50 text-violet-600 border border-violet-100",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[color]}`}
    >
      {children}
    </span>
  );
}

function ApiKeyNotice() {
  const [keysStatus, setKeysStatus] = useState({
    openai: false,
    firecrawl: false,
    gemini: false,
    elevenlabs: false,
    loading: true,
  });

  useEffect(() => {
    fetch("/api/utils/keys-status")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setKeysStatus({
            openai: data.openai,
            firecrawl: data.firecrawl,
            gemini: data.gemini,
            elevenlabs: data.elevenlabs,
            loading: false,
          });
        }
      })
      .catch((err) => {
        console.error(err);
        setKeysStatus((prev) => ({ ...prev, loading: false }));
      });
  }, []);

  if (keysStatus.loading) return null;

  if (keysStatus.openai && keysStatus.firecrawl && keysStatus.gemini && keysStatus.elevenlabs) {
    return null;
  }

  const missing = [];
  if (!keysStatus.openai) missing.push("OPENAI_API_KEY");
  if (!keysStatus.firecrawl) missing.push("FIRECRAWL_API_KEY");
  if (!keysStatus.gemini) missing.push("GEMINI_API_KEY");
  if (!keysStatus.elevenlabs) missing.push("ELEVENLABS_API_KEY");

  return (
    <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
      <AlertCircle size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
      <div>
        <p className="text-xs font-medium text-amber-800">
          API keys not fully configured yet
        </p>
        <p className="text-xs text-amber-700 mt-0.5">
          Add <code className="bg-amber-100 px-1 rounded">{missing.join(", ")}</code>{" "}
          to enable AI generation. Seed data below shows what outputs look like.
        </p>
      </div>
    </div>
  );
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="p-1.5 rounded-md hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
      title="Copy"
    >
      {copied ? (
        <Check size={13} className="text-green-500" />
      ) : (
        <Copy size={13} />
      )}
    </button>
  );
}

function EmptyTabState({ icon: Icon, title, description }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center glass-card rounded-xl border border-white/40 shadow-sm">
      <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mb-4">
        <Icon size={24} className="text-gray-300" />
      </div>
      <h3 className="text-sm font-semibold text-gray-700 mb-1">{title}</h3>
      <p className="text-xs text-gray-400 max-w-xs leading-relaxed">
        {description}
      </p>
    </div>
  );
}

// ─── Tab: Overview ───────────────────────────────────────────────────────────

function OverviewTab({ business, onTabSwitch, onReScrape, scraping, brandKit, onLogoUpload, onEditOpen }) {
  const [keysStatus, setKeysStatus] = useState({
    openai: false,
    firecrawl: false,
    gemini: false,
    elevenlabs: false,
  });

  useEffect(() => {
    fetch("/api/utils/keys-status")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setKeysStatus(data);
        }
      })
      .catch((err) => console.error(err));
  }, []);

  const stats = [
    {
      label: "Content Pieces",
      value: parseInt(business.content_count || 0),
      icon: FileText,
      color: "bg-blue-500",
      tab: "content",
    },
    {
      label: "Creatives",
      value: parseInt(business.creatives_count || 0),
      icon: Image,
      color: "bg-violet-500",
      tab: "creatives",
    },
    {
      label: "Videos",
      value: parseInt(business.videos_count || 0),
      icon: Video,
      color: "bg-orange-600",
      tab: "video",
    },
    {
      label: "Campaigns",
      value: parseInt(business.campaigns_count || 0),
      icon: Megaphone,
      color: "bg-orange-500",
      tab: "campaigns",
    },
    {
      label: "Competitors Tracked",
      value: parseInt(business.competitors_count || 0),
      icon: TrendingUp,
      color: "bg-emerald-500",
      tab: "intelligence",
    },
  ];
  const context = business.business_context || {};

  // Profile Completeness checklist items
  const checklist = [
    {
      id: "name",
      label: "Workspace Name",
      completed: !!business.name,
    },
    {
      id: "industry",
      label: "Industry Profile",
      completed: !!business.industry,
      action: "edit",
    },
    {
      id: "audience",
      label: "Target Audience",
      completed: !!business.target_audience,
      action: "edit",
    },
    {
      id: "value_prop",
      label: "Value Proposition",
      completed: !!business.value_proposition,
      action: "edit",
    },
    {
      id: "brand_kit",
      label: "Brand Kit Generation",
      completed: !!brandKit,
      action: "brand",
    },
    {
      id: "logo",
      label: "Workspace Logo Upload",
      completed: !!brandKit?.logo_url,
      action: "logo",
    },
  ];

  const completedCount = checklist.filter((item) => item.completed).length;
  const percentage = Math.round((completedCount / checklist.length) * 100);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {stats.map(({ label, value, icon: Icon, color, tab }) => (
          <button
            key={label}
            onClick={() => onTabSwitch(tab)}
            className="glass-card rounded-xl border border-white/40 shadow-sm p-5 text-left hover:border-blue-200 hover:shadow-sm transition-all group"
          >
            <div
              className={`w-9 h-9 ${color} rounded-lg flex items-center justify-center mb-3`}
            >
              <Icon size={16} className="text-white" />
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-0.5">
              {value}
            </div>
            <div className="text-xs text-gray-500">{label}</div>
            <div className="mt-2 text-xs text-orange-600 opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1">
              View <ChevronRight size={11} />
            </div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-card rounded-xl border border-white/40 shadow-sm p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-5 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Brain size={16} className="text-orange-500" /> Business Intelligence
            </span>
            {business.website_url && (
              <button
                onClick={onReScrape}
                disabled={scraping}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {scraping ? (
                  <Loader2 size={12} className="animate-spin text-gray-400" />
                ) : (
                  <Globe size={12} className="text-gray-400" />
                )}
                {scraping ? "Scraping..." : "Re-scrape Website"}
              </button>
            )}
          </h3>
          <div className="space-y-4">
            {[
              { label: "Industry", value: business.industry },
              { label: "Target Audience", value: business.target_audience },
              { label: "Value Proposition", value: business.value_proposition },
              { label: "Website", value: business.website_url, isLink: true },
            ].map(({ label, value, isLink }) =>
              value ? (
                <div key={label} className="flex gap-4">
                  <div className="w-36 flex-shrink-0">
                    <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                      {label}
                    </span>
                  </div>
                  <div className="flex-1">
                    {isLink ? (
                      <a
                        href={value}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-orange-600 hover:underline flex items-center gap-1 font-medium"
                      >
                        <Globe size={12} /> {value}
                      </a>
                    ) : (
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {value}
                      </p>
                    )}
                  </div>
                </div>
              ) : null,
            )}
            {context.unique_selling_points?.length > 0 && (
              <div className="flex gap-4">
                <div className="w-36 flex-shrink-0">
                  <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                    USPs
                  </span>
                </div>
                <div className="flex-1 flex flex-wrap gap-2">
                  {context.unique_selling_points.map((u, i) => (
                    <Pill key={i} color="blue">
                      {u}
                    </Pill>
                  ))}
                </div>
              </div>
            )}
            {context.products?.length > 0 && (
              <div className="flex gap-4">
                <div className="w-36 flex-shrink-0">
                  <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                    Products
                  </span>
                </div>
                <div className="flex-1 flex flex-wrap gap-2">
                  {context.products.map((p, i) => (
                    <Pill key={i}>{p}</Pill>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {/* Workspace Setup Progress Checklist */}
          <div className="glass-card rounded-xl border border-white/40 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <CheckCircle2 size={16} className="text-orange-500" />
                Profile Completeness
              </h3>
              <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                {percentage}%
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
              <div
                className="bg-orange-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${percentage}%` }}
              />
            </div>

            {/* Checklist Items */}
            <div className="space-y-2.5 pt-1">
              {checklist.map((item) => (
                <div key={item.id} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-gray-700">
                    {item.completed ? (
                      <Check size={14} className="text-green-500 font-bold" />
                    ) : (
                      <span className="w-3.5 h-3.5 rounded-full border border-gray-300 flex-shrink-0" />
                    )}
                    <span className={item.completed ? "text-gray-400 line-through" : "font-medium"}>
                      {item.label}
                    </span>
                  </div>

                  {!item.completed && (
                    <div>
                      {item.action === "edit" && (
                        <button
                          onClick={onEditOpen}
                          className="text-orange-600 hover:text-orange-700 font-semibold hover:underline"
                        >
                          Configure
                        </button>
                      )}
                      {item.action === "brand" && (
                        <button
                          onClick={() => onTabSwitch("brand")}
                          className="text-orange-600 hover:text-orange-700 font-semibold hover:underline"
                        >
                          Generate
                        </button>
                      )}
                      {item.action === "logo" && (
                        <label className="cursor-pointer text-orange-600 hover:text-orange-700 font-semibold hover:underline">
                          Upload
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              if (e.target.files?.[0]) {
                                onLogoUpload(e.target.files[0]);
                              }
                            }}
                          />
                        </label>
                      )}
                    </div>
                  )}

                  {item.completed && item.action === "logo" && (
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {brandKit.logo_url && (
                        <img src={brandKit.logo_url} alt="Logo" className="w-4 h-4 object-contain rounded bg-white border border-gray-100 p-0.5" />
                      )}
                      <label className="cursor-pointer text-gray-400 hover:text-orange-600 transition-colors font-medium">
                        Update
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files?.[0]) {
                              onLogoUpload(e.target.files[0]);
                            }
                          }}
                        />
                      </label>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card rounded-xl border border-white/40 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Zap size={15} className="text-orange-500" /> Quick Actions
            </h3>
            <div className="space-y-2">
              {[
                { label: "Generate Content", tab: "content", variant: "blue" },
                { label: "Create Visual", tab: "creatives", variant: "orange" },
                { label: "Plan Campaign", tab: "campaigns", variant: "blue" },
                {
                  label: "Analyze Competitors",
                  tab: "intelligence",
                  variant: "orange",
                },
                { label: "View Brand Kit", tab: "brand", variant: "outline" },
              ].map(({ label, tab, variant }) => (
                <button
                  key={label}
                  onClick={() => onTabSwitch(tab)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-premium flex items-center justify-between hover:scale-[1.01] ${variant === "blue"
                      ? "bg-blue-600 text-white hover:bg-blue-700 shadow-sm shadow-blue-500/10"
                      : variant === "orange"
                        ? "bg-orange-500 text-white hover:bg-orange-600 shadow-sm shadow-orange-500/10"
                        : "bg-white/40 border border-white/40 text-gray-700 hover:bg-white/60 hover:border-orange-200"
                    }`}
                >
                  {label}
                  <ChevronRight size={13} />
                </button>
              ))}
            </div>
          </div>

          <div className="glass-card rounded-xl border border-white/40 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              AI Engine Status
            </h3>
            <div className="space-y-2.5">
              {[
                { label: "Brand Memory", ready: keysStatus.openai },
                { label: "Content Engine", ready: keysStatus.openai },
                { label: "Creative Engine", ready: keysStatus.gemini },
                { label: "Campaign Engine", ready: keysStatus.openai },
                { label: "Intel Engine", ready: keysStatus.openai && keysStatus.firecrawl },
              ].map(({ label, ready }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">{label}</span>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${ready ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-400"}`}
                  >
                    {ready ? "Ready" : "Add API Key"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Tab: Brand Kit ──────────────────────────────────────────────────────────

// ─── Utility Brand Kit Renderers & Parsers ───────────────────────────────────

function getCopyableText(val) {
  if (!val) return "";
  try {
    const parsed = typeof val === "string" ? JSON.parse(val) : val;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return Object.entries(parsed)
        .map(([k, v]) => {
          const keyStr = k.replace(/_/g, ' ').toUpperCase();
          const valStr = Array.isArray(v) ? v.join(", ") : String(v);
          return `${keyStr}:\n${valStr}`;
        })
        .join("\n\n");
    }
  } catch (e) { }
  return String(val);
}

function BrandVoiceContent({ val, bodyFont }) {
  if (!val) return null;
  try {
    const parsed = typeof val === "string" ? JSON.parse(val) : val;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return (
        <div className="space-y-3" style={{ fontFamily: bodyFont }}>
          {parsed.personality && (
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Personality</span>
              <p className="text-sm text-gray-700 mt-0.5 leading-relaxed">{parsed.personality}</p>
            </div>
          )}
          {parsed.tone_descriptors && Array.isArray(parsed.tone_descriptors) && (
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Tone Descriptors</span>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {parsed.tone_descriptors.map((t, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center rounded-full bg-orange-50/50 border border-orange-100/50 px-2.5 py-0.5 text-xs font-medium text-orange-600"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}
          {Object.entries(parsed).map(([key, value]) => {
            if (key === "personality" || key === "tone_descriptors") return null;
            return (
              <div key={key}>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block capitalize">
                  {key.replace(/_/g, ' ')}
                </span>
                <p className="text-sm text-gray-700 mt-0.5 leading-relaxed">
                  {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                </p>
              </div>
            );
          })}
        </div>
      );
    }
  } catch (e) { }
  return <p className="text-sm text-gray-600 leading-relaxed" style={{ fontFamily: bodyFont }}>{String(val)}</p>;
}

function ToneGuidelinesContent({ val, bodyFont }) {
  if (!val) return null;
  try {
    const parsed = typeof val === "string" ? JSON.parse(val) : val;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const dos = parsed["do's"] || parsed["dos"] || parsed["Do's"] || parsed["Dos"] || [];
      const donts = parsed["don'ts"] || parsed["donts"] || parsed["Don'ts"] || parsed["Donts"] || [];

      if (Array.isArray(dos) || Array.isArray(donts)) {
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" style={{ fontFamily: bodyFont }}>
            {Array.isArray(dos) && dos.length > 0 && (
              <div>
                <span className="text-[10px] font-bold text-green-600 uppercase tracking-wider block mb-2">Do's</span>
                <ul className="space-y-1.5">
                  {dos.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-1.5 text-xs text-gray-600">
                      <span className="text-green-500 font-bold flex-shrink-0">✓</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {Array.isArray(donts) && donts.length > 0 && (
              <div>
                <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider block mb-2">Don'ts</span>
                <ul className="space-y-1.5">
                  {donts.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-1.5 text-xs text-gray-600">
                      <span className="text-red-400 font-bold flex-shrink-0">✗</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {Object.entries(parsed).map(([key, value]) => {
              const lowerKey = key.toLowerCase();
              if (lowerKey.includes("do") || lowerKey.includes("dont")) return null;
              return (
                <div key={key} className="col-span-2 mt-2">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block capitalize">
                    {key.replace(/_/g, ' ')}
                  </span>
                  <p className="text-sm text-gray-700 mt-0.5 leading-relaxed">
                    {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                  </p>
                </div>
              );
            })}
          </div>
        );
      }
    }
  } catch (e) { }
  return <p className="text-sm text-gray-600 leading-relaxed" style={{ fontFamily: bodyFont }}>{String(val)}</p>;
}

function BrandTab({ businessId, brandKit, onGenerate, generating, onDelete, onLogoUpload }) {
  if (!brandKit) {
    return (
      <div className="glass-card rounded-xl border border-white/40 shadow-sm p-8 max-w-2xl space-y-6">
        <ApiKeyNotice />
        <EmptyTabState
          icon={Palette}
          title="No brand kit yet"
          description="Generate your complete brand identity — voice, story, color palette, typography, taglines, and tone guidelines."
        />

        {/* Logo Upload when Brand Kit is not yet generated */}
        <div className="border-t border-gray-100 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-left">
            <h4 className="text-sm font-semibold text-gray-900">Upload Logo</h4>
            <p className="text-xs text-gray-400 mt-0.5">Start by uploading your workspace logo.</p>
          </div>
          <label className="cursor-pointer inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-50 transition-colors shadow-sm">
            <Upload size={13} />
            Choose Logo Image
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  onLogoUpload(e.target.files[0]);
                }
              }}
            />
          </label>
        </div>

        <div className="pt-4 flex justify-center">
          <button
            onClick={onGenerate}
            disabled={generating}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors w-full sm:w-auto justify-center"
          >
            {generating ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Sparkles size={15} />
            )}
            {generating ? "Generating..." : "Generate Brand Kit"}
          </button>
        </div>
      </div>
    );
  }

  const colors = brandKit.color_palette || {};
  const headingFont = brandKit.typography?.heading || brandKit.typography?.headings || "";
  const bodyFont = brandKit.typography?.body || "";

  // Helper to extract first family name and clean up CSS variables (e.g. "var(--font-orbitron)" -> "Orbitron")
  const cleanFontFamily = (fontString) => {
    if (!fontString) return "";
    let clean = fontString.split(',')[0].trim().replace(/['"]/g, '');
    const varMatch = clean.match(/(?:var\()?--font-([a-zA-Z0-9-]+)\)?/);
    if (varMatch) {
      clean = varMatch[1];
    }
    return clean
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const cleanHeading = cleanFontFamily(headingFont);
  const cleanBody = cleanFontFamily(bodyFont);

  // Render a link tag to load fonts dynamically from Google Fonts API
  const fontLink = (cleanHeading || cleanBody) ? (
    <link
      rel="stylesheet"
      href={`https://fonts.googleapis.com/css2?${[
        cleanHeading ? `family=${encodeURIComponent(cleanHeading)}:wght@400;600;700` : "",
        cleanBody ? `family=${encodeURIComponent(cleanBody)}:wght@400;500;600` : ""
      ].filter(Boolean).join('&')}&display=swap`}
    />
  ) : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-5xl">
      {fontLink}
      <div className="lg:col-span-2 space-y-5">
        {/* Brand Logo Card */}
        <div className="glass-card rounded-xl border border-white/40 shadow-sm p-5 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-900" style={{ fontFamily: cleanHeading }}>Brand Logo</h3>
            <p className="text-xs text-gray-400 mt-1">This logo is utilized across all marketing materials.</p>
          </div>
          <div className="flex items-center gap-4">
            {brandKit.logo_url && (
              <img
                src={brandKit.logo_url}
                alt="Brand Logo"
                className="w-16 h-16 object-contain rounded-lg border border-gray-100 bg-white p-1"
              />
            )}
            <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-50 transition-colors">
              <Upload size={12} />
              {brandKit.logo_url ? "Change Logo" : "Upload Logo"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    onLogoUpload(e.target.files[0]);
                  }
                }}
              />
            </label>
          </div>
        </div>
        {/* Brand Voice */}
        {brandKit.brand_voice && (
          <div className="glass-card rounded-xl border border-white/40 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900" style={{ fontFamily: cleanHeading }}>Brand Voice</h3>
              <CopyButton text={getCopyableText(brandKit.brand_voice)} />
            </div>
            <BrandVoiceContent val={brandKit.brand_voice} bodyFont={cleanBody} />
          </div>
        )}

        {/* Brand Story */}
        {brandKit.brand_story && (
          <div className="glass-card rounded-xl border border-white/40 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900" style={{ fontFamily: cleanHeading }}>Brand Story</h3>
              <CopyButton text={brandKit.brand_story} />
            </div>
            <p className="text-sm text-gray-600 leading-relaxed" style={{ fontFamily: cleanBody }}>{brandKit.brand_story}</p>
          </div>
        )}

        {/* Elevator Pitch */}
        {brandKit.elevator_pitch && (
          <div className="glass-card rounded-xl border border-white/40 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900" style={{ fontFamily: cleanHeading }}>Elevator Pitch</h3>
              <CopyButton text={brandKit.elevator_pitch} />
            </div>
            <p className="text-sm text-gray-600 leading-relaxed" style={{ fontFamily: cleanBody }}>{brandKit.elevator_pitch}</p>
          </div>
        )}

        {/* Tone Guidelines */}
        {brandKit.tone_guidelines && (
          <div className="glass-card rounded-xl border border-white/40 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900" style={{ fontFamily: cleanHeading }}>Tone Guidelines</h3>
              <CopyButton text={getCopyableText(brandKit.tone_guidelines)} />
            </div>
            <ToneGuidelinesContent val={brandKit.tone_guidelines} bodyFont={cleanBody} />
          </div>
        )}

        {brandKit.messaging_pillars?.length > 0 && (
          <div className="glass-card rounded-xl border border-white/40 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-3" style={{ fontFamily: cleanHeading }}>
              Messaging Pillars
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {brandKit.messaging_pillars.map((p, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg"
                >
                  <span className="w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {i + 1}
                  </span>
                  <span className="text-sm text-gray-700" style={{ fontFamily: cleanBody }}>{p}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-5">
        {Object.keys(colors).length > 0 && (
          <div className="glass-card rounded-xl border border-white/40 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-3" style={{ fontFamily: cleanHeading }}>
              Color Palette
            </h3>
            <div className="space-y-2">
              {Object.entries(colors).map(([name, value]) => {
                const hexColor = typeof value === "object" && value !== null ? value.hex : value;
                const label = typeof value === "object" && value !== null && value.name ? `${name} (${value.name})` : name;
                return (
                  <div key={name} className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-lg border border-gray-200 flex-shrink-0"
                      style={{ backgroundColor: hexColor }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-gray-700 capitalize" style={{ fontFamily: cleanBody }}>
                        {label}
                      </div>
                      <div className="text-xs text-gray-400 font-mono">{hexColor}</div>
                    </div>
                    <CopyButton text={hexColor} />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {brandKit.typography && (
          <div className="glass-card rounded-xl border border-white/40 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-3" style={{ fontFamily: cleanHeading }}>
              Typography
            </h3>
            <div className="space-y-2">
              {Object.entries(brandKit.typography).map(([key, val]) =>
                typeof val === "string" ? (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 capitalize" style={{ fontFamily: cleanBody }}>
                      {key}
                    </span>
                    <span className="text-xs font-semibold text-gray-700" style={{ fontFamily: cleanFontFamily(val) }}>
                      {cleanFontFamily(val)}
                    </span>
                  </div>
                ) : null,
              )}
            </div>

            {/* Typography Live Visual Preview */}
            <div className="mt-4 p-3.5 rounded-lg bg-gray-50 border border-gray-150 space-y-3">
              {cleanHeading && (
                <div>
                  <span className="text-[9px] uppercase font-bold tracking-wider text-gray-400 block">Heading Style</span>
                  <h4 className="text-sm font-bold text-gray-800 mt-0.5 leading-snug" style={{ fontFamily: headingFont }}>
                    {cleanHeading} (Bold Title Example)
                  </h4>
                </div>
              )}
              {cleanBody && (
                <div>
                  <span className="text-[9px] uppercase font-bold tracking-wider text-gray-400 block">Body Style</span>
                  <p className="text-xs text-gray-600 mt-0.5 leading-relaxed" style={{ fontFamily: bodyFont }}>
                    Example of your clean body typography using {cleanBody}.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {brandKit.taglines?.length > 0 && (
          <div className="glass-card rounded-xl border border-white/40 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              Taglines
            </h3>
            <ul className="space-y-2">
              {brandKit.taglines.map((t, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-gray-50"
                >
                  <span className="text-sm text-gray-700 italic">"{t}"</span>
                  <CopyButton text={t} />
                </li>
              ))}
            </ul>
          </div>
        )}

        <button
          onClick={onGenerate}
          disabled={generating}
          className="w-full py-2.5 border border-gray-200 text-sm text-gray-600 rounded-lg hover:bg-gray-50 transition-colors inline-flex items-center justify-center gap-2"
        >
          {generating ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Sparkles size={14} />
          )}
          {generating ? "Regenerating..." : "Regenerate Brand Kit"}
        </button>

        <button
          onClick={onDelete}
          className="w-full py-2.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-sm font-medium rounded-lg transition-colors inline-flex items-center justify-center gap-2"
        >
          <Trash2 size={14} />
          Delete Brand Kit
        </button>
      </div>
    </div>
  );
}

// ─── Tab: Content ────────────────────────────────────────────────────────────

function ContentTab({ businessId, content, onRefresh, onDelete }) {
  const [contentType, setContentType] = useState("linkedin");
  const [topic, setTopic] = useState("");
  const [customInstructions, setCustomInstructions] = useState("");
  const [generating, setGenerating] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [error, setError] = useState(null);

  const generate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/content/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, contentType, topic, customInstructions }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed");
      }
      setTopic("");
      setCustomInstructions("");
      onRefresh();
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="glass-card rounded-xl border border-white/40 shadow-sm p-5 h-fit">
        <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Sparkles size={14} className="text-orange-500" />
          Generate Content
        </h3>
        <ApiKeyNotice />
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1.5">
              Content Type
            </label>
            <select
              value={contentType}
              onChange={(e) => setContentType(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              {CONTENT_TYPES.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1.5">
              Topic <span className="text-gray-400">(optional)</span>
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Product launch, industry trend..."
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1.5">
              Custom Instructions <span className="text-gray-400">(optional)</span>
            </label>
            <textarea
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              placeholder="e.g. Write in a witty tone, explain it like I'm 5, or focus on cloud computing..."
              rows={3}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
            />
          </div>
          {error && (
            <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg p-2">
              {error}
            </p>
          )}
          <button
            onClick={generate}
            disabled={generating}
            className="w-full py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors inline-flex items-center justify-center gap-2"
          >
            {generating ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Sparkles size={14} />
            )}
            {generating ? "Generating..." : "Generate"}
          </button>
        </div>
      </div>

      <div className="lg:col-span-2 space-y-4">
        <h3 className="text-sm font-semibold text-gray-900">
          {content.length} piece{content.length !== 1 ? "s" : ""} generated
        </h3>
        {content.length === 0 ? (
          <EmptyTabState
            icon={FileText}
            title="No content yet"
            description="Generate brand-voiced LinkedIn posts, blog articles, emails, tweets, Instagram captions, and more."
          />
        ) : (
          content.map((item) => {
            const isExpanded = expanded === item.id;
            const typeLabel =
              CONTENT_TYPES.find((t) => t.value === item.content_type)?.label ||
              item.content_type;
            return (
              <div
                key={item.id}
                className="glass-card rounded-xl border border-white/40 shadow-sm overflow-hidden"
              >
                <div className="p-5 pb-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Pill color="blue">{typeLabel}</Pill>
                      {item.metadata?.hashtags?.length > 0 && (
                        <Pill color="gray">
                          {item.metadata.hashtags.length} hashtags
                        </Pill>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <CopyButton text={item.content} />
                      <button
                        onClick={() => onDelete(item.id)}
                        className="p-1.5 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                        title="Delete Content"
                      >
                        <Trash2 size={13} />
                      </button>
                      <span className="text-xs text-gray-400">
                        {new Date(item.created_at).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                    </div>
                  </div>
                  {item.title && (
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">
                      {item.title}
                    </h4>
                  )}
                  <p
                    className={`text-sm text-gray-600 whitespace-pre-wrap leading-relaxed ${isExpanded ? "" : "line-clamp-4"}`}
                  >
                    {item.content}
                  </p>
                </div>
                <div className="px-5 pb-3 border-t border-gray-50 pt-3 flex items-center justify-between">
                  <button
                    onClick={() => setExpanded(isExpanded ? null : item.id)}
                    className="text-xs text-orange-600 hover:text-orange-700 font-medium"
                  >
                    {isExpanded ? "Show less" : "Read full content"}
                  </button>
                  {item.metadata?.subject && (
                    <span className="text-xs text-gray-400 truncate ml-2">
                      Subject: {item.metadata.subject}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ─── Tab: Creatives ──────────────────────────────────────────────────────────

function CreativesTab({ businessId, creatives, onRefresh, onDelete, brandKit }) {
  const [creativeType, setCreativeType] = useState("poster");
  const [format, setFormat] = useState("square");
  const [description, setDescription] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);

  // Form Details
  const [platform, setPlatform] = useState("Instagram");
  const [audience, setAudience] = useState("");
  const [tone, setTone] = useState("Minimalist");
  const [customInstructions, setCustomInstructions] = useState("");

  // In-place Regeneration State
  const [regeneratingCreativeId, setRegeneratingCreativeId] = useState(null);
  const [regenPlatform, setRegenPlatform] = useState("");
  const [regenAudience, setRegenAudience] = useState("");
  const [regenTone, setRegenTone] = useState("");
  const [regenCustomInstructions, setRegenCustomInstructions] = useState("");

  const startRegenerate = (item) => {
    setRegeneratingCreativeId(item.id);
    setRegenPlatform(item.metadata?.platform || "Instagram");
    setRegenAudience(item.metadata?.audience || "");
    setRegenTone(item.metadata?.tone || "Minimalist");
    setRegenCustomInstructions(item.metadata?.customInstructions || "");
  };

  const submitRegenerate = async (item) => {
    setRegeneratingCreativeId(null);
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/creatives/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId,
          creativeType: item.creative_type,
          format: item.format,
          description: item.prompt,
          platform: regenPlatform,
          audience: regenAudience,
          tone: regenTone,
          customInstructions: regenCustomInstructions,
          creativeId: item.id,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to regenerate creative visual");
      }
      onRefresh();
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const generate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/creatives/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId,
          creativeType,
          format,
          description,
          platform,
          audience,
          tone,
          customInstructions,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed");
      }
      setDescription("");
      setAudience("");
      setCustomInstructions("");
      onRefresh();
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="glass-card rounded-xl border border-white/40 shadow-sm p-5 h-fit">
        <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Sparkles size={14} className="text-orange-500" />
          Generate Creative
        </h3>
        <ApiKeyNotice />
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1.5">
              Type
            </label>
            <select
              value={creativeType}
              onChange={(e) => setCreativeType(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              {CREATIVE_TYPES.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1.5">
              Format
            </label>
            <div className="space-y-1.5">
              {FORMATS.map(({ value, label, dim }) => (
                <button
                  key={value}
                  onClick={() => setFormat(value)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-sm transition-colors ${format === value ? "border-orange-500 bg-orange-50/50 text-orange-700 font-medium" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}
                >
                  <span className="font-medium">{label}</span>
                  <span className="text-xs text-gray-400">{dim}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1.5">Platform</label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="Instagram">Instagram</option>
                <option value="Facebook">Facebook</option>
                <option value="TikTok">TikTok</option>
                <option value="LinkedIn">LinkedIn</option>
                <option value="Twitter">Twitter (X)</option>
                <option value="Pinterest">Pinterest</option>
                <option value="General/Web">General / Web</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1.5">Tone</label>
              <input
                type="text"
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                placeholder="e.g. Minimalist"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1.5">Target Audience</label>
            <input
              type="text"
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              placeholder="e.g. Young Professionals"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1.5">Custom Instructions</label>
            <textarea
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              placeholder="e.g. cyber punk style, high contrast dark theme..."
              rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1.5">
              Description <span className="text-gray-400">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what you want..."
              rows={3}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
            />
          </div>
          {error && (
            <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg p-2">
              {error}
            </p>
          )}
          <button
            onClick={generate}
            disabled={generating}
            className="w-full py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors inline-flex items-center justify-center gap-2"
          >
            {generating ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Sparkles size={14} />
            )}
            {generating ? "Generating..." : "Generate Creative"}
          </button>
        </div>
      </div>

      <div className="lg:col-span-2">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">
          {creatives.length} creative{creatives.length !== 1 ? "s" : ""}{" "}
          generated
        </h3>
        {creatives.length === 0 ? (
          <EmptyTabState
            icon={Image}
            title="No creatives yet"
            description="Generate brand-aware posters, banners, social posts, and ad creatives in your brand colors."
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {creatives.map((item) => (
              <div
                key={item.id}
                className="glass-card rounded-xl border border-white/40 shadow-sm overflow-hidden"
              >
                <div
                  className={`bg-gray-100 flex items-center justify-center ${item.format === "portrait" ? "aspect-[9/16]" : item.format === "landscape" ? "aspect-video" : "aspect-square"}`}
                >
                  {item.image_url ? (
                    <div className="relative w-full h-full flex items-center justify-center">
                      {item.image_url.startsWith("data:video/") || item.image_url.endsWith(".mp4") ? (
                        <video
                          src={item.image_url}
                          autoPlay
                          loop
                          muted
                          playsInline
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <img
                          src={item.image_url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      )}
                      {brandKit?.logo_url && (
                        <img
                          src={brandKit.logo_url}
                          alt="Brand Logo Overlay"
                          className="absolute bottom-2 right-2 w-8 h-8 object-contain bg-white/80 backdrop-blur-sm rounded border border-white/50 p-0.5 shadow-sm pointer-events-none z-10"
                        />
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-gray-400 p-6 text-center">
                      <Image size={28} />
                      <span className="text-xs font-medium">
                        Generation pending
                      </span>
                      <span className="text-xs text-gray-300">
                        Add GEMINI_API_KEY to generate
                      </span>
                    </div>
                  )}
                </div>
                {regeneratingCreativeId === item.id ? (
                  <div className="p-3 bg-gray-50/50 border-t border-gray-100 space-y-2.5">
                    <h4 className="text-xs font-bold text-gray-900 flex items-center gap-1.5 mb-1">
                      <RotateCcw size={12} className="text-orange-500 animate-spin-slow" />
                      Regenerate Creative
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-medium text-gray-500 block mb-0.5">Platform</label>
                        <select
                          value={regenPlatform}
                          onChange={(e) => setRegenPlatform(e.target.value)}
                          className="w-full px-2 py-1 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-orange-500"
                        >
                          <option value="Instagram">Instagram</option>
                          <option value="Facebook">Facebook</option>
                          <option value="TikTok">TikTok</option>
                          <option value="LinkedIn">LinkedIn</option>
                          <option value="Twitter">Twitter (X)</option>
                          <option value="Pinterest">Pinterest</option>
                          <option value="General/Web">General / Web</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-medium text-gray-500 block mb-0.5">Tone</label>
                        <input
                          type="text"
                          value={regenTone}
                          onChange={(e) => setRegenTone(e.target.value)}
                          placeholder="Tone"
                          className="w-full px-2 py-1 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-orange-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-medium text-gray-500 block mb-0.5">Target Audience</label>
                      <input
                        type="text"
                        value={regenAudience}
                        onChange={(e) => setRegenAudience(e.target.value)}
                        placeholder="Audience"
                        className="w-full px-2 py-1 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-orange-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-medium text-gray-500 block mb-0.5">Custom Instructions</label>
                      <textarea
                        value={regenCustomInstructions}
                        onChange={(e) => setRegenCustomInstructions(e.target.value)}
                        placeholder="Instructions..."
                        className="w-full px-2 py-1 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-orange-500 resize-none"
                        rows={2}
                      />
                    </div>
                    <div className="flex gap-2 justify-end pt-1">
                      <button
                        onClick={() => setRegeneratingCreativeId(null)}
                        className="px-2 py-0.5 text-xs border border-gray-200 rounded hover:bg-gray-100 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => submitRegenerate(item)}
                        className="px-2 py-0.5 text-xs bg-orange-500 hover:bg-orange-600 text-white font-medium rounded transition-colors"
                      >
                        Confirm
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <Pill color="violet">{item.creative_type}</Pill>
                        <Pill>{item.format}</Pill>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => startRegenerate(item)}
                          className="p-1 rounded hover:bg-orange-50 text-gray-400 hover:text-orange-500 transition-colors"
                          title="Regenerate Creative"
                        >
                          <RotateCcw size={12} />
                        </button>
                        <button
                          onClick={() => onDelete(item.id)}
                          className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                          title="Delete Creative"
                        >
                          <Trash2 size={12} />
                        </button>
                        <span className="text-xs text-gray-400">
                          {new Date(item.created_at).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                          })}
                        </span>
                      </div>
                    </div>
                    {item.prompt && (
                      <p className="text-xs text-gray-400 line-clamp-2">
                        {item.prompt}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tab: Campaigns ──────────────────────────────────────────────────────────

function CampaignsTab({ businessId, campaigns, onRefresh, onDelete }) {
  const [campaignType, setCampaignType] = useState("launch");
  const [objective, setObjective] = useState("");
  const [generating, setGenerating] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [error, setError] = useState(null);

  const generate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/campaigns/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, campaignType, objective }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed");
      }
      setObjective("");
      onRefresh();
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="glass-card rounded-xl border border-white/40 shadow-sm p-5 h-fit">
        <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Sparkles size={14} className="text-orange-500" />
          Generate Campaign
        </h3>
        <ApiKeyNotice />
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1.5">
              Campaign Type
            </label>
            <div className="space-y-1.5">
              {CAMPAIGN_TYPES.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setCampaignType(value)}
                  className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-colors ${campaignType === value ? "border-orange-500 bg-orange-50/50 text-orange-700 font-medium font-medium" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1.5">
              Objective <span className="text-gray-400">(optional)</span>
            </label>
            <input
              type="text"
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              placeholder="e.g. Generate 500 qualified leads"
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          {error && (
            <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg p-2">
              {error}
            </p>
          )}
          <button
            onClick={generate}
            disabled={generating}
            className="w-full py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors inline-flex items-center justify-center gap-2"
          >
            {generating ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Sparkles size={14} />
            )}
            {generating ? "Generating..." : "Generate Campaign"}
          </button>
        </div>
      </div>

      <div className="lg:col-span-2 space-y-4">
        <h3 className="text-sm font-semibold text-gray-900">
          {campaigns.length} campaign{campaigns.length !== 1 ? "s" : ""} planned
        </h3>
        {campaigns.length === 0 ? (
          <EmptyTabState
            icon={Megaphone}
            title="No campaigns yet"
            description="Generate full campaign briefs with objectives, channel mix, timelines, and budget recommendations."
          />
        ) : (
          campaigns.map((item) => {
            const isExpanded = expanded === item.id;
            const typeLabel =
              CAMPAIGN_TYPES.find((t) => t.value === item.campaign_type)
                ?.label || item.campaign_type;
            const timeline =
              item.timeline && typeof item.timeline === "string"
                ? JSON.parse(item.timeline)
                : item.timeline || {};
            return (
              <div
                key={item.id}
                className="glass-card rounded-xl border border-white/40 shadow-sm overflow-hidden"
              >
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <h4 className="text-base font-semibold text-gray-900 mb-1.5">
                        {item.name}
                      </h4>
                      <Pill color="orange">{typeLabel}</Pill>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => onDelete(item.id)}
                        className="p-1 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                        title="Delete Campaign"
                      >
                        <Trash2 size={13} />
                      </button>
                      <span className="text-xs text-gray-400">
                        {new Date(item.created_at).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                    </div>
                  </div>

                  {item.objective && (
                    <div className="mb-3 p-3 bg-blue-50 rounded-lg">
                      <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide block mb-1">
                        Objective
                      </span>
                      <p className="text-sm text-blue-800">{item.objective}</p>
                    </div>
                  )}

                  {item.channels?.length > 0 && (
                    <div className="mb-3">
                      <span className="text-xs font-medium text-gray-400 uppercase tracking-wide block mb-2">
                        Channels
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {item.channels.map((ch, i) => (
                          <Pill key={i} color="blue">
                            {ch}
                          </Pill>
                        ))}
                      </div>
                    </div>
                  )}

                  {isExpanded && (
                    <div className="space-y-4 mt-4 border-t border-gray-100 pt-4">
                      {item.strategy && (
                        <div>
                          <span className="text-xs font-medium text-gray-400 uppercase tracking-wide block mb-2">
                            Strategy
                          </span>
                          <p className="text-sm text-gray-600 leading-relaxed">
                            {item.strategy}
                          </p>
                        </div>
                      )}
                      {timeline && Object.keys(timeline).length > 0 && (
                        <div>
                          <span className="text-xs font-medium text-gray-400 uppercase tracking-wide block mb-2">
                            Timeline
                          </span>
                          <div className="space-y-2">
                            {Object.entries(timeline).map(([key, phase]) => (
                              <div
                                key={key}
                                className="p-3 bg-gray-50 rounded-lg"
                              >
                                <div className="text-xs font-semibold text-gray-700">
                                  {phase.name}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {phase.duration} — {phase.focus}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {item.budget_recommendation && (
                        <div>
                          <span className="text-xs font-medium text-gray-400 uppercase tracking-wide block mb-2">
                            Budget
                          </span>
                          <p className="text-sm text-gray-600">
                            {item.budget_recommendation}
                          </p>
                        </div>
                      )}
                      {item.content_ideas?.length > 0 && (
                        <div>
                          <span className="text-xs font-medium text-gray-400 uppercase tracking-wide block mb-2">
                            Content Ideas
                          </span>
                          <ul className="space-y-1.5">
                            {item.content_ideas.map((idea, i) => (
                              <li
                                key={i}
                                className="flex items-start gap-2 text-sm text-gray-600"
                              >
                                <span className="text-blue-400 mt-0.5">→</span>{" "}
                                {idea}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="px-5 pb-4 border-t border-gray-50 pt-3">
                  <button
                    onClick={() => setExpanded(isExpanded ? null : item.id)}
                    className="text-xs text-orange-600 hover:text-orange-700 font-medium"
                  >
                    {isExpanded ? "Show less" : "View full campaign brief →"}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ─── Tab: Intelligence ───────────────────────────────────────────────────────

function IntelligenceTab({ businessId, competitors, onRefresh, onDelete }) {
  const [urls, setUrls] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);

  const analyze = async () => {
    const urlList = urls
      .split("\n")
      .map((u) => u.trim())
      .filter(Boolean);
    if (!urlList.length) return;
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/competitors/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, competitorUrls: urlList }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed");
      }
      setUrls("");
      onRefresh();
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="glass-card rounded-xl border border-white/40 shadow-sm p-5 h-fit">
        <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <TrendingUp size={14} className="text-orange-500" />
          Analyze Competitors
        </h3>
        <ApiKeyNotice />
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1.5">
              Competitor URLs{" "}
              <span className="text-gray-400">(one per line, max 5)</span>
            </label>
            <textarea
              value={urls}
              onChange={(e) => setUrls(e.target.value)}
              placeholder={"https://competitor1.com\nhttps://competitor2.com"}
              rows={6}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none font-mono"
            />
          </div>
          {error && (
            <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg p-2">
              {error}
            </p>
          )}
          <button
            onClick={analyze}
            disabled={generating || !urls.trim()}
            className="w-full py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors inline-flex items-center justify-center gap-2"
          >
            {generating ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <BarChart3 size={14} />
            )}
            {generating ? "Analyzing..." : "Analyze Competitors"}
          </button>
        </div>
      </div>

      <div className="lg:col-span-2 space-y-4">
        <h3 className="text-sm font-semibold text-gray-900">
          {competitors.length} competitor{competitors.length !== 1 ? "s" : ""}{" "}
          tracked
        </h3>
        {competitors.length === 0 ? (
          <EmptyTabState
            icon={TrendingUp}
            title="No competitor analysis yet"
            description="Add competitor URLs to generate positioning maps, strengths, weaknesses, and whitespace opportunities."
          />
        ) : (
          competitors.map((item) => (
            <div
              key={item.id}
              className="glass-card rounded-xl border border-white/40 shadow-sm p-5"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h4 className="text-base font-semibold text-gray-900 mb-1">
                    {item.name}
                  </h4>
                  <a
                    href={item.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-orange-600 hover:underline inline-flex items-center gap-1"
                  >
                    <Globe size={11} /> {item.website_url}
                  </a>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => onDelete(item.id)}
                    className="p-1 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                    title="Delete Competitor Track"
                  >
                    <Trash2 size={13} />
                  </button>
                  <span className="text-xs text-gray-400">
                    {new Date(item.created_at).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                </div>
              </div>
              {item.positioning && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">
                    Positioning
                  </span>
                  <p className="text-sm text-gray-700">{item.positioning}</p>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {item.strengths?.length > 0 && (
                  <div>
                    <span className="text-xs font-semibold text-green-600 uppercase tracking-wide block mb-2">
                      Strengths
                    </span>
                    <ul className="space-y-1.5">
                      {item.strengths.map((s, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 text-xs text-gray-600"
                        >
                          <span className="text-green-400 mt-0.5">+</span> {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {item.weaknesses?.length > 0 && (
                  <div>
                    <span className="text-xs font-semibold text-orange-500 uppercase tracking-wide block mb-2">
                      Gaps / Weaknesses
                    </span>
                    <ul className="space-y-1.5">
                      {item.weaknesses.map((w, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 text-xs text-gray-600"
                        >
                          <span className="text-orange-400 mt-0.5">−</span> {w}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

// ─── Tab: Video Creation ─────────────────────────────────────────────────────

function VideoPlayer({ video, onClose, brandKit }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [previewMode, setPreviewMode] = useState(video.metadata?.is_mock || !video.video_url);

  const scenes = video.script?.scenes || [];
  const activeScene = scenes[currentSceneIndex];

  // Effect to handle slideshow playback
  useEffect(() => {
    if (!isPlaying || !previewMode || scenes.length === 0) return;

    const scene = scenes[currentSceneIndex];
    if (!scene) return;

    let audio = null;
    let synthUtterance = null;
    let backupTimer = null;

    const playNext = () => {
      if (currentSceneIndex < scenes.length - 1) {
        setCurrentSceneIndex((prev) => prev + 1);
      } else {
        setIsPlaying(false);
        setCurrentSceneIndex(0);
      }
    };

    if (scene.audio_url === "speech_synthesis") {
      // Use browser text-to-speech synthesis
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(scene.voiceover_text);
      utterance.rate = 1.0;
      utterance.onend = () => {
        playNext();
      };
      utterance.onerror = (err) => {
        console.warn("Speech synthesis error, falling back to timer:", err);
        playNext();
      };
      synthUtterance = utterance;
      window.speechSynthesis.speak(utterance);
    } else if (scene.audio_url) {
      // Play real generated MP3 file
      audio = new Audio(scene.audio_url);
      audio.play().catch((e) => {
        console.warn("Audio playback failed, starting backup timer:", e.message);
        // Fallback timer if audio play fails (e.g. browser autoplay restrictions)
        backupTimer = setTimeout(playNext, (scene.duration || 5) * 1000);
      });
      audio.onended = () => {
        playNext();
      };
    } else {
      // No audio, wait designated duration
      backupTimer = setTimeout(playNext, (scene.duration || 5) * 1000);
    }

    return () => {
      if (audio) {
        audio.pause();
        audio.src = "";
      }
      if (synthUtterance) {
        window.speechSynthesis.cancel();
      }
      if (backupTimer) {
        clearTimeout(backupTimer);
      }
    };
  }, [isPlaying, currentSceneIndex, previewMode, scenes.length]);

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (index) => {
    setCurrentSceneIndex(index);
    if (isPlaying) {
      // restart playing at new index
      setIsPlaying(false);
      setTimeout(() => setIsPlaying(true), 50);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative bg-white/95 backdrop-blur-xl rounded-2xl border border-white/50 w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh]">
        {/* Left Side: Video Output Area */}
        <div className="flex-1 bg-black flex flex-col justify-between p-4 min-h-[300px] md:min-h-[500px]">
          <div className="flex items-center justify-between text-white pb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              {previewMode ? "Interactive Storyboard Preview" : "Compiled Faceless Video"}
            </span>
            <div className="flex items-center gap-2">
              {(!previewMode && video.video_url) ? (
                <a
                  href={video.video_url}
                  download={`video-${video.id}.mp4`}
                  className="text-gray-400 hover:text-white text-xs font-medium bg-white/10 hover:bg-white/20 rounded-lg px-2.5 py-1.5 transition-colors inline-flex items-center gap-1.5"
                >
                  <Download size={12} />
                  Download
                </a>
              ) : (
                <button
                  disabled
                  title="Video compilation was bypassed or failed. Output is playable as Slideshow Storyboard only."
                  className="text-gray-500 text-xs font-medium bg-white/5 rounded-lg px-2.5 py-1.5 border border-white/5 cursor-not-allowed opacity-50 flex items-center gap-1.5"
                >
                  <Download size={12} />
                  Download
                </button>
              )}
              <button
                onClick={() => {
                  setIsPlaying(false);
                  onClose();
                }}
                className="text-gray-400 hover:text-white text-xs font-medium bg-white/10 hover:bg-white/20 rounded-lg px-2.5 py-1.5 transition-colors"
              >
                Close Player
              </button>
            </div>
          </div>

          <div className="flex-1 flex items-center justify-center relative">
            {!previewMode && video.video_url ? (
              <div className="relative w-full aspect-video rounded-lg overflow-hidden shadow-2xl bg-black max-h-[350px] flex items-center justify-center">
                <video
                  src={video.video_url}
                  controls
                  autoPlay
                  className="w-full h-full object-contain"
                />
                {brandKit?.logo_url && (
                  <img
                    src={brandKit.logo_url}
                    alt="Logo Watermark"
                    className="absolute top-2 right-2 w-8 h-8 object-contain bg-white/80 backdrop-blur-sm rounded border border-white/50 p-0.5 shadow-sm pointer-events-none z-10"
                  />
                )}
              </div>
            ) : (
              // Slideshow Mode
              <div className="relative w-full aspect-video rounded-lg overflow-hidden shadow-2xl bg-gray-950 max-h-[350px] flex items-center justify-center">
                {brandKit?.logo_url && (
                  <img
                    src={brandKit.logo_url}
                    alt="Logo Watermark"
                    className="absolute top-2 right-2 w-8 h-8 object-contain bg-white/80 backdrop-blur-sm rounded border border-white/50 p-0.5 shadow-sm pointer-events-none z-10"
                  />
                )}
                {activeScene?.image_url ? (
                  activeScene.image_url.toLowerCase().endsWith(".mp4") ? (
                    <video
                      key={activeScene.image_url}
                      src={activeScene.image_url}
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <img
                      src={activeScene.image_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  )
                ) : (
                  <div className="text-gray-500 text-xs font-medium">Generating visual...</div>
                )}

                {/* Subtitle Text Overlay */}
                {activeScene?.text_overlay && (
                  <div className="absolute bottom-4 left-4 right-4 bg-black/75 backdrop-blur-md border border-white/10 rounded-xl px-5 py-3 text-center">
                    <p className="text-sm font-semibold text-white tracking-wide">
                      {activeScene.text_overlay}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Slideshow controls */}
          {previewMode && scenes.length > 0 && (
            <div className="pt-4 space-y-3">
              <div className="flex items-center justify-between gap-4">
                <button
                  onClick={togglePlay}
                  className="w-10 h-10 rounded-full bg-orange-500 hover:bg-orange-600 text-white flex items-center justify-center transition-colors shadow-md shadow-orange-500/20"
                >
                  {isPlaying ? <Pause size={18} fill="white" /> : <Play size={18} fill="white" className="ml-0.5" />}
                </button>

                {/* Segment timeline progress */}
                <div className="flex-1 flex items-center gap-1.5 h-2">
                  {scenes.map((s, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSeek(idx)}
                      className={`h-full rounded-full transition-all flex-1 ${idx === currentSceneIndex
                          ? "bg-orange-500"
                          : idx < currentSceneIndex
                            ? "bg-gray-600"
                            : "bg-gray-800 hover:bg-gray-700"
                        }`}
                      style={{ flexGrow: s.duration || 5 }}
                      title={`Scene ${idx + 1}`}
                    />
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-400 font-mono">
                <span>Scene {currentSceneIndex + 1} of {scenes.length}</span>
                <span>Voice: {activeScene?.audio_url === "speech_synthesis" ? "Browser Speech" : "OpenAI TTS"}</span>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Script Detail View */}
        <div className="w-full md:w-[350px] border-t md:border-t-0 md:border-l border-gray-150 p-5 flex flex-col justify-between overflow-y-auto max-h-[40vh] md:max-h-[85vh]">
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-2 leading-snug">{video.title}</h3>
            <p className="text-xs text-gray-500 line-clamp-3 mb-4">Topic: {video.topic}</p>

            {/* Play Mode Selector */}
            {video.video_url && (
              <div className="grid grid-cols-2 gap-2 bg-gray-100 rounded-lg p-1 mb-5 text-xs font-semibold">
                <button
                  onClick={() => {
                    setIsPlaying(false);
                    setPreviewMode(false);
                  }}
                  className={`py-1.5 rounded-md text-center transition-all ${!previewMode ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-800"
                    }`}
                >
                  Compiled Video
                </button>
                <button
                  onClick={() => {
                    setIsPlaying(false);
                    setPreviewMode(true);
                  }}
                  className={`py-1.5 rounded-md text-center transition-all ${previewMode ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-800"
                    }`}
                >
                  Storyboard Play
                </button>
              </div>
            )}

            <div className="space-y-4">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Scenes Storyboard</span>
              {scenes.map((scene, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSeek(idx)}
                  className={`w-full text-left p-3 rounded-xl border transition-all ${idx === currentSceneIndex
                      ? "border-orange-500 bg-orange-50/50 shadow-sm"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-gray-500">Scene {idx + 1}</span>
                    <span className="text-xs font-mono text-gray-400">{(scene.duration || 5).toFixed(1)}s</span>
                  </div>
                  <p className="text-xs text-gray-700 font-medium mb-1.5 line-clamp-2">
                    "{scene.voiceover_text}"
                  </p>
                  <p className="text-[10px] text-gray-400 italic line-clamp-2">
                    Visual: {scene.image_prompt}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function VideoTab({ businessId, videos, onRefresh, onDelete, onRegenerate, brandKit }) {
  const [topic, setTopic] = useState("");
  const [title, setTitle] = useState("");
  const [generating, setGenerating] = useState(false);
  const [activePlayerVideo, setActivePlayerVideo] = useState(null);
  const [error, setError] = useState(null);

  // Form Details
  const [platform, setPlatform] = useState("TikTok");
  const [audience, setAudience] = useState("");
  const [tone, setTone] = useState("Professional");
  const [customInstructions, setCustomInstructions] = useState("");

  // In-place Regeneration State
  const [regeneratingVideoId, setRegeneratingVideoId] = useState(null);
  const [regenPlatform, setRegenPlatform] = useState("");
  const [regenAudience, setRegenAudience] = useState("");
  const [regenTone, setRegenTone] = useState("");
  const [regenCustomInstructions, setRegenCustomInstructions] = useState("");

  const startRegenerate = (item) => {
    setRegeneratingVideoId(item.id);
    setRegenPlatform(item.metadata?.platform || "TikTok");
    setRegenAudience(item.metadata?.audience || "");
    setRegenTone(item.metadata?.tone || "Professional");
    setRegenCustomInstructions(item.metadata?.customInstructions || "");
  };

  const submitRegenerate = async (id) => {
    setRegeneratingVideoId(null);
    onRegenerate(id, {
      platform: regenPlatform,
      audience: regenAudience,
      tone: regenTone,
      customInstructions: regenCustomInstructions,
    });
  };

  // Poll tasks if any are in progress
  useEffect(() => {
    const hasPending = videos.some(
      (v) => v.status !== "completed" && v.status !== "failed"
    );
    if (hasPending) {
      const timer = setInterval(() => {
        onRefresh();
      }, 4000);
      return () => clearInterval(timer);
    }
  }, [videos, onRefresh]);

  const generate = async () => {
    if (!topic.trim()) return;
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/videos/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId,
          topic,
          title: title || null,
          platform,
          audience,
          tone,
          customInstructions
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to initiate generation");
      }
      setTopic("");
      setTitle("");
      setAudience("");
      setCustomInstructions("");
      onRefresh();
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "pending":
        return "Initiating workflow... 📝";
      case "generating_script":
        return "Generating & reviewing script... 📝";
      case "generating_assets":
        return "Creating audio & visuals... 🎨";
      case "assembling":
        return "Assembling scene timelines... 🎬";
      case "completed":
        return "Completed";
      case "failed":
        return "Failed ❌";
      default:
        return status;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Video Generation Config Form */}
      <div className="glass-card rounded-xl border border-white/40 shadow-sm p-5 h-fit">
        <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Sparkles size={14} className="text-orange-500" />
          Create Faceless Video
        </h3>
        <ApiKeyNotice />
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1.5">
              Topic / Concept <span className="text-red-400">*</span>
            </label>
            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. 3 simple morning habits to boost productivity..."
              rows={4}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1.5">
              Video Title <span className="text-gray-400">(optional)</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Morning Boost"
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1.5">Platform</label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="TikTok">TikTok</option>
                <option value="Instagram Reels">Instagram Reels</option>
                <option value="YouTube Shorts">YouTube Shorts</option>
                <option value="LinkedIn">LinkedIn Video</option>
                <option value="YouTube Longform">YouTube Video</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1.5">Tone</label>
              <input
                type="text"
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                placeholder="e.g. Exciting"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1.5">Target Audience</label>
            <input
              type="text"
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              placeholder="e.g. College Students"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1.5">Custom Instructions</label>
            <textarea
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              placeholder="e.g. use bright dynamic typography, cinematic video style..."
              rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
            />
          </div>
          {error && (
            <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg p-2">
              {error}
            </p>
          )}
          <button
            onClick={generate}
            disabled={generating || !topic.trim()}
            className="w-full py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors inline-flex items-center justify-center gap-2"
          >
            {generating ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Film size={14} />
            )}
            {generating ? "Initializing Agents..." : "Generate Faceless Video"}
          </button>
        </div>
      </div>

      {/* Videos List */}
      <div className="lg:col-span-2 space-y-4">
        <h3 className="text-sm font-semibold text-gray-900">
          {videos.length} video{videos.length !== 1 ? "s" : ""} generated
        </h3>
        {videos.length === 0 ? (
          <EmptyTabState
            icon={Film}
            title="No videos yet"
            description="Use AI agents to draft scripts, review guidelines, generate voiceovers and assets, and compile faceless marketing videos."
          />
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {videos.map((item) => {
              const isPending = item.status !== "completed" && item.status !== "failed";
              const isFailed = item.status === "failed";
              return (
                <div
                  key={item.id}
                  className="glass-card rounded-xl border border-white/40 shadow-sm p-5 hover:border-orange-200 transition-all flex flex-col justify-between"
                >
                  {regeneratingVideoId === item.id ? (
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-gray-900 flex items-center gap-1.5 mb-1">
                        <RotateCcw size={12} className="text-orange-500" />
                        Regenerate Video Settings
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="text-[10px] font-medium text-gray-500 block mb-1">Platform</label>
                          <select
                            value={regenPlatform}
                            onChange={(e) => setRegenPlatform(e.target.value)}
                            className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-orange-500"
                          >
                            <option value="TikTok">TikTok</option>
                            <option value="Instagram Reels">Instagram Reels</option>
                            <option value="YouTube Shorts">YouTube Shorts</option>
                            <option value="LinkedIn">LinkedIn Video</option>
                            <option value="YouTube Longform">YouTube Video</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] font-medium text-gray-500 block mb-1">Audience</label>
                          <input
                            type="text"
                            value={regenAudience}
                            onChange={(e) => setRegenAudience(e.target.value)}
                            placeholder="Target Audience"
                            className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-orange-500"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-medium text-gray-500 block mb-1">Tone</label>
                          <input
                            type="text"
                            value={regenTone}
                            onChange={(e) => setRegenTone(e.target.value)}
                            placeholder="Voice Tone"
                            className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-orange-500"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] font-medium text-gray-500 block mb-1">Custom Instructions</label>
                        <textarea
                          value={regenCustomInstructions}
                          onChange={(e) => setRegenCustomInstructions(e.target.value)}
                          placeholder="E.g. rewrite scenes, use cyber punk styles..."
                          className="w-full px-2 py-1 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-orange-500 resize-none"
                          rows={2}
                        />
                      </div>
                      <div className="flex gap-2 justify-end pt-1">
                        <button
                          onClick={() => setRegeneratingVideoId(null)}
                          className="px-2.5 py-1 text-xs border border-gray-200 rounded-md hover:bg-gray-100 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => submitRegenerate(item.id)}
                          className="px-2.5 py-1 text-xs bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-md transition-colors"
                        >
                          Confirm & Regenerate
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div>
                        <div className="flex items-start justify-between gap-4 mb-2.5">
                          <div>
                            <h4 className="text-sm font-bold text-gray-900">{item.title}</h4>
                            <p className="text-xs text-gray-400 font-mono mt-0.5">
                              {new Date(item.created_at).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {isPending && (
                              <span className="inline-flex items-center gap-1 bg-amber-50 border border-amber-100 text-amber-700 px-2.5 py-0.5 rounded-full text-xs font-medium animate-pulse">
                                <Loader2 size={10} className="animate-spin text-amber-500" />
                                {getStatusText(item.status)}
                              </span>
                            )}
                            {!isPending && (
                              <span
                                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${isFailed
                                    ? "bg-red-50 text-red-600 border border-red-100"
                                    : "bg-green-50 text-green-600 border border-green-100"
                                  }`}
                              >
                                {isFailed ? "Generation Failed" : "Ready"}
                              </span>
                            )}
                            <button
                              onClick={() => onDelete(item.id)}
                              className="p-1 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                              title="Delete Video"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed mb-4">
                          Topic: {item.topic}
                        </p>
                      </div>

                      {!isPending && !isFailed && (
                        <div className="border-t border-gray-50 pt-3.5 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400">
                              Scenes: {item.script?.scenes?.length || 0}
                            </span>
                            {item.metadata?.is_mock && (
                              <span className="inline-flex items-center rounded-full bg-blue-50 text-blue-600 border border-blue-100 px-2.5 py-0.5 text-[10px] font-medium">
                                Slideshow Preview
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {item.video_url ? (
                              <a
                                href={item.video_url}
                                download={`video-${item.id}.mp4`}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-50 transition-colors"
                              >
                                <Download size={11} />
                                Download
                              </a>
                            ) : (
                              <button
                                disabled
                                title="Video compilation was bypassed or failed. Output is playable as Slideshow Storyboard only."
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-100 text-gray-400 rounded-lg text-xs font-semibold cursor-not-allowed opacity-50"
                              >
                                <Download size={11} />
                                Download
                              </button>
                            )}
                            <button
                              onClick={() => startRegenerate(item)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-50 transition-colors cursor-pointer"
                            >
                              <RotateCcw size={11} />
                              Regenerate
                            </button>
                            <button
                              onClick={() => setActivePlayerVideo(item)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 text-white rounded-lg text-xs font-semibold hover:bg-orange-600 transition-colors cursor-pointer"
                            >
                              <Play size={11} fill="white" />
                              Play Video
                            </button>
                          </div>
                        </div>
                      )}

                      {isFailed && (
                        <div className="border-t border-gray-50 pt-3.5 flex items-center justify-between gap-4">
                          <p className="text-[10px] font-mono text-red-500 bg-red-50 rounded-lg p-2 leading-relaxed flex-grow line-clamp-2" title={item.metadata?.error || "Unknown Error"}>
                            Error: {item.metadata?.error || "Unknown Error"}
                          </p>
                          <button
                            onClick={() => startRegenerate(item)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-red-200 text-red-700 bg-red-50/50 rounded-lg text-xs font-semibold hover:bg-red-50 transition-colors cursor-pointer flex-shrink-0 h-fit"
                          >
                            <RotateCcw size={11} />
                            Retry
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Media Player overlay */}
      {activePlayerVideo && (
        <VideoPlayer
          video={activePlayerVideo}
          onClose={() => setActivePlayerVideo(null)}
          brandKit={brandKit}
        />
      )}
    </div>
  );
}

export default function BusinessDetailPage({ params }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [business, setBusiness] = useState(null);
  const [brandKit, setBrandKit] = useState(null);
  const [content, setContent] = useState([]);
  const [creatives, setCreatives] = useState([]);
  const [videos, setVideos] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [competitors, setCompetitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generatingBrand, setGeneratingBrand] = useState(false);
  const [scraping, setScraping] = useState(false);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editIndustry, setEditIndustry] = useState("");
  const [editAudience, setEditAudience] = useState("");
  const [editValueProp, setEditValueProp] = useState("");

  const openEditModal = () => {
    setEditName(business?.name || "");
    setEditIndustry(business?.industry || "");
    setEditAudience(business?.target_audience || "");
    setEditValueProp(business?.value_proposition || "");
    setIsEditOpen(true);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/businesses/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          industry: editIndustry,
          target_audience: editAudience,
          value_proposition: editValueProp,
        }),
      });
      if (res.ok) {
        setIsEditOpen(false);
        await loadBusiness();
      } else {
        alert("Failed to save workspace profile.");
      }
    } catch (err) {
      console.error(err);
      alert("Error saving workspace profile: " + err.message);
    }
  };

  const handleLogoUpload = async (file) => {
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result;
      try {
        const res = await fetch("/api/brand/upload-logo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ businessId: id, logoUrl: base64String }),
        });
        if (res.ok) {
          await loadBrandKit();
          await loadBusiness();
        } else {
          alert("Failed to upload logo.");
        }
      } catch (err) {
        console.error(err);
        alert("Error uploading logo: " + err.message);
      }
    };
    reader.readAsDataURL(file);
  };

  const id = params.id;

  const loadBusiness = useCallback(async () => {
    try {
      const res = await fetch(`/api/businesses/${id}`);
      if (!res.ok) throw new Error("Not found");
      const data = await res.json();
      setBusiness(data.business);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadBrandKit = useCallback(async () => {
    try {
      const res = await fetch(`/api/brand/get?businessId=${id}`);
      if (res.ok) {
        const d = await res.json();
        setBrandKit(d.brandKit || null);
      }
    } catch (err) {
      console.error(err);
    }
  }, [id]);

  const loadContent = useCallback(async () => {
    try {
      const res = await fetch(`/api/content/list?businessId=${id}`);
      if (res.ok) {
        const d = await res.json();
        setContent(d.content || []);
      }
    } catch (err) {
      console.error(err);
    }
  }, [id]);

  const loadCreatives = useCallback(async () => {
    try {
      const res = await fetch(`/api/creatives/list?businessId=${id}`);
      if (res.ok) {
        const d = await res.json();
        setCreatives(d.creatives || []);
      }
    } catch (err) {
      console.error(err);
    }
  }, [id]);

  const loadVideos = useCallback(async () => {
    try {
      const res = await fetch(`/api/videos/list?businessId=${id}`);
      if (res.ok) {
        const d = await res.json();
        setVideos(d.videos || []);
      }
    } catch (err) {
      console.error(err);
    }
  }, [id]);

  const loadCampaigns = useCallback(async () => {
    try {
      const res = await fetch(`/api/campaigns/list?businessId=${id}`);
      if (res.ok) {
        const d = await res.json();
        setCampaigns(d.campaigns || []);
      }
    } catch (err) {
      console.error(err);
    }
  }, [id]);

  const loadCompetitors = useCallback(async () => {
    try {
      const res = await fetch(`/api/competitors/list?businessId=${id}`);
      if (res.ok) {
        const d = await res.json();
        setCompetitors(d.competitors || []);
      }
    } catch (err) {
      console.error(err);
    }
  }, [id]);

  useEffect(() => {
    loadBusiness();
    loadBrandKit();
    loadContent();
    loadCreatives();
    loadVideos();
    loadCampaigns();
    loadCompetitors();
  }, []);

  const handleGenerateBrand = async () => {
    setGeneratingBrand(true);
    try {
      const res = await fetch("/api/brand/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId: id }),
      });
      if (res.ok) await loadBrandKit();
    } catch (err) {
      console.error(err);
    } finally {
      setGeneratingBrand(false);
    }
  };

  const handleDeleteBrand = async () => {
    if (!confirm("Are you sure you want to delete the Brand Kit? This will clear all generated brand parameters.")) return;
    try {
      const res = await fetch(`/api/brand/delete?businessId=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await loadBrandKit();
        await loadBusiness();
      } else {
        alert("Failed to delete brand kit.");
      }
    } catch (err) {
      console.error(err);
      alert("Error: " + err.message);
    }
  };

  const handleDeleteContent = async (contentId) => {
    if (!confirm("Are you sure you want to delete this content piece?")) return;
    try {
      const res = await fetch(`/api/content/delete?id=${contentId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await loadContent();
        await loadBusiness();
      } else {
        alert("Failed to delete content piece.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteCreative = async (creativeId) => {
    if (!confirm("Are you sure you want to delete this creative visual?")) return;
    try {
      const res = await fetch(`/api/creatives/delete?id=${creativeId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await loadCreatives();
        await loadBusiness();
      } else {
        alert("Failed to delete creative.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteCampaign = async (campaignId) => {
    if (!confirm("Are you sure you want to delete this campaign brief?")) return;
    try {
      const res = await fetch(`/api/campaigns/delete?id=${campaignId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await loadCampaigns();
        await loadBusiness();
      } else {
        alert("Failed to delete campaign.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteCompetitor = async (competitorId) => {
    if (!confirm("Are you sure you want to delete this competitor tracker?")) return;
    try {
      const res = await fetch(`/api/competitors/delete?id=${competitorId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await loadCompetitors();
        await loadBusiness();
      } else {
        alert("Failed to delete competitor tracking.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteVideo = async (videoId) => {
    if (!confirm("Are you sure you want to delete this video?")) return;
    try {
      const res = await fetch(`/api/videos/delete?id=${videoId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await loadVideos();
        await loadBusiness();
      } else {
        alert("Failed to delete video.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRegenerateVideo = async (videoId, options = {}) => {
    if (!confirm("Are you sure you want to regenerate this video? This will delete the previous video and start a new generation.")) return;
    try {
      const res = await fetch("/api/videos/regenerate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId, ...options }),
      });
      if (res.ok) {
        await loadVideos();
        await loadBusiness();
      } else {
        alert("Failed to initiate regeneration.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleReScrape = async () => {
    if (!business?.website_url) return;
    setScraping(true);
    try {
      const res = await fetch("/api/scrape/website", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId: id, websiteUrl: business.website_url }),
      });
      if (res.ok) {
        await loadBusiness();
      } else {
        alert("Failed to scrape website.");
      }
    } catch (err) {
      console.error("Error scraping website:", err);
      alert("Error scraping website: " + err.message);
    } finally {
      setScraping(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-400">
          <Loader2 size={18} className="animate-spin" />
          <span className="text-sm">Loading workspace...</span>
        </div>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-gray-500 mb-4">Business not found</p>
          <a
            href="/dashboard"
            className="text-sm text-orange-600 hover:text-orange-700 hover:underline"
          >
            ← Back to Dashboard
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#F8FAFC] overflow-hidden">
      {/* Floating Premium Glowing Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[550px] h-[550px] rounded-full premium-glow-1 pointer-events-none" />
      <div className="absolute bottom-[20%] right-[-10%] w-[600px] h-[600px] rounded-full premium-glow-2 pointer-events-none" />
      {/* Sticky Header */}
      <div className="bg-white/45 backdrop-blur-xl border-b border-white/30 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <a
                href="/dashboard"
                className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors"
              >
                <ArrowLeft size={15} /> Dashboard
              </a>
              <span className="text-gray-200">/</span>
              <span className="text-sm font-medium text-gray-900">
                {business.name}
              </span>
            </div>
            <span className="inline-flex items-center gap-1.5 bg-orange-50/80 border border-orange-200/50 text-orange-700 rounded-full px-3 py-1 text-xs font-medium backdrop-blur-sm shadow-sm">
              <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse" /> AI Active
            </span>
          </div>

          <div className="flex items-start gap-3.5 mb-4">
            {brandKit?.logo_url && (
              <img
                src={brandKit.logo_url}
                alt="Logo"
                className="w-12 h-12 object-contain bg-white rounded-xl border border-gray-150 p-1 shadow-sm flex-shrink-0"
              />
            )}
            <div>
              <h1 className="text-xl font-semibold text-gray-900 mb-1.5">
                {business.name}
              </h1>
              <div className="flex items-center gap-2 flex-wrap">
                {business.industry && (
                  <Pill color="gray">{business.industry}</Pill>
                )}
                {business.website_url && (
                  <a
                    href={business.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-orange-500 transition-colors"
                  >
                    <Globe size={11} /> {business.website_url}
                  </a>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-1 overflow-x-auto">
            {TABS.map(({ id: tabId, label, icon: Icon }) => (
              <button
                key={tabId}
                onClick={() => setActiveTab(tabId)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-premium whitespace-nowrap ${activeTab === tabId
                    ? "bg-orange-50 text-orange-600 font-medium border border-orange-100/30 shadow-sm"
                    : "text-gray-500 hover:text-gray-700 hover:bg-white/40"
                  }`}
              >
                <Icon size={14} /> {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === "overview" && (
          <OverviewTab
            business={business}
            onTabSwitch={setActiveTab}
            onReScrape={handleReScrape}
            scraping={scraping}
            brandKit={brandKit}
            onLogoUpload={handleLogoUpload}
            onEditOpen={openEditModal}
          />
        )}
        {activeTab === "brand" && (
          <BrandTab
            businessId={id}
            brandKit={brandKit}
            onGenerate={handleGenerateBrand}
            generating={generatingBrand}
            onDelete={handleDeleteBrand}
            onLogoUpload={handleLogoUpload}
          />
        )}
        {activeTab === "content" && (
          <ContentTab
            businessId={id}
            content={content}
            onRefresh={loadContent}
            onDelete={handleDeleteContent}
          />
        )}
        {activeTab === "creatives" && (
          <CreativesTab
            businessId={id}
            creatives={creatives}
            onRefresh={loadCreatives}
            onDelete={handleDeleteCreative}
            brandKit={brandKit}
          />
        )}
        {activeTab === "campaigns" && (
          <CampaignsTab
            businessId={id}
            campaigns={campaigns}
            onRefresh={loadCampaigns}
            onDelete={handleDeleteCampaign}
          />
        )}
        {activeTab === "video" && (
          <VideoTab
            businessId={id}
            videos={videos}
            onRefresh={loadVideos}
            onDelete={handleDeleteVideo}
            onRegenerate={handleRegenerateVideo}
            brandKit={brandKit}
          />
        )}
        {activeTab === "intelligence" && (
          <IntelligenceTab
            businessId={id}
            competitors={competitors}
            onRefresh={loadCompetitors}
            onDelete={handleDeleteCompetitor}
          />
        )}
      </div>

      {/* Edit Workspace Profile Modal */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <form
            onSubmit={handleSaveProfile}
            className="bg-white/95 backdrop-blur-xl rounded-2xl border border-white/50 w-full max-w-md shadow-2xl p-6 space-y-4"
          >
            <h3 className="text-base font-semibold text-gray-900">
              Edit Workspace Profile
            </h3>

            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1.5">
                Business / Workspace Name
              </label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1.5">
                Industry
              </label>
              <input
                type="text"
                value={editIndustry}
                onChange={(e) => setEditIndustry(e.target.value)}
                placeholder="e.g. SaaS, Fitness, E-commerce"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1.5">
                Target Audience
              </label>
              <input
                type="text"
                value={editAudience}
                onChange={(e) => setEditAudience(e.target.value)}
                placeholder="e.g. Remote developers, Startup founders"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1.5">
                Value Proposition
              </label>
              <textarea
                value={editValueProp}
                onChange={(e) => setEditValueProp(e.target.value)}
                placeholder="What value does your workspace deliver?"
                rows={3}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsEditOpen(false)}
                className="px-4 py-2 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600 transition-colors shadow-sm"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
