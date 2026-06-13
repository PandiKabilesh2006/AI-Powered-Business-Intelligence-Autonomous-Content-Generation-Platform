"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  Globe,
  Sparkles,
  FileText,
  Image,
  Megaphone,
  TrendingUp,
  Palette,
  X,
  ArrowRight,
  Brain,
  Loader2,
  ChevronRight,
  Video,
} from "lucide-react";

import { useUser, UserButton } from "@clerk/clerk-react";

const INDUSTRY_OPTIONS = [
  "Quick Commerce",
  "D2C Beauty & Wellness",
  "SaaS / Software",
  "Fintech",
  "EdTech",
  "HealthTech",
  "Ecommerce",
  "Food & Beverage",
  "Real Estate",
  "Travel & Hospitality",
  "Media & Entertainment",
  "Consulting & Services",
  "Other",
];

function StatBadge({ icon: Icon, count, label, color }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}
      >
        <Icon size={14} className="text-white" />
      </div>
      <span className="text-sm font-semibold text-gray-900">{count}</span>
      <span className="text-xs text-gray-400">{label}</span>
    </div>
  );
}

function AddBusinessModal({ onClose, onCreated, userId }) {
  const [step, setStep] = useState(1); // 1 = form, 2 = processing
  const [loadingText, setLoadingText] = useState("Creating your business profile...");
  const [form, setForm] = useState({
    name: "",
    websiteUrl: "",
    industry: "",
    targetAudience: "",
    valueProp: "",
  });
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Business name is required";
    if (!form.websiteUrl.trim()) e.websiteUrl = "Website URL is required";
    else if (!form.websiteUrl.startsWith("http"))
      e.websiteUrl = "URL must start with http:// or https://";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setStep(2);
    setLoadingText("Creating your business profile...");
    try {
      const res = await fetch("/api/businesses/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: userId,
          websiteUrl: form.websiteUrl,
          name: form.name,
          industry: form.industry || null,
          target_audience: form.targetAudience || null,
          value_proposition: form.valueProp || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to create business profile");
      const { business } = await res.json();

      // Scrape the website for branding context
      setLoadingText("Scraping website & extracting brand context (may take 5-10 seconds)...");
      try {
        const scrapeRes = await fetch("/api/scrape/website", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            businessId: business.id,
            websiteUrl: business.website_url,
          }),
        });
        if (!scrapeRes.ok) {
          console.warn("Website scraping returned an error, but business was created successfully.");
        }
      } catch (scrapeErr) {
        console.error("Failed to scrape website:", scrapeErr);
      }

      onCreated(business);
    } catch (err) {
      console.error(err);
      setStep(1);
      setErrors({ submit: err.message || "Something went wrong. Please try again." });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white/80 backdrop-blur-xl rounded-2xl border border-white/50 w-full max-w-lg shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/20">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              Add New Business
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {step === 1
                ? "Fill in your business details to get started"
                : "Creating your AI workspace..."}
            </p>
          </div>
          {step === 1 && (
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100/50 transition-colors"
            >
              <X size={16} className="text-gray-500" />
            </button>
          )}
        </div>

        {step === 2 ? (
          <div className="p-10 text-center">
            <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Brain size={24} className="text-blue-600" />
            </div>
            <Loader2
              size={20}
              className="animate-spin text-blue-600 mx-auto mb-4"
            />
            <p className="text-sm font-medium text-gray-900 mb-1">
              Setting up your workspace
            </p>
            <p className="text-xs text-gray-500">
              {loadingText}
            </p>
          </div>
        ) : (
          <div className="p-6 space-y-4">
            {/* Name */}
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1.5">
                Business Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. SwiftCart, GlowUp Beauty"
                className={`w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1 ${errors.name ? "border-red-300" : "border-gray-200"}`}
              />
              {errors.name && (
                <p className="text-xs text-red-500 mt-1">{errors.name}</p>
              )}
            </div>

            {/* Website */}
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1.5">
                Website URL <span className="text-red-400">*</span>
              </label>
              <input
                type="url"
                value={form.websiteUrl}
                onChange={(e) =>
                  setForm({ ...form, websiteUrl: e.target.value })
                }
                placeholder="https://yourbusiness.com"
                className={`w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1 ${errors.websiteUrl ? "border-red-300" : "border-gray-200"}`}
              />
              {errors.websiteUrl && (
                <p className="text-xs text-red-500 mt-1">{errors.websiteUrl}</p>
              )}
            </div>

            {/* Industry */}
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1.5">
                Industry
              </label>
              <select
                value={form.industry}
                onChange={(e) => setForm({ ...form, industry: e.target.value })}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1 text-gray-700"
              >
                <option value="">Select industry...</option>
                {INDUSTRY_OPTIONS.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </div>

            {/* Target Audience */}
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1.5">
                Target Audience{" "}
                <span className="text-gray-400">(optional)</span>
              </label>
              <input
                type="text"
                value={form.targetAudience}
                onChange={(e) =>
                  setForm({ ...form, targetAudience: e.target.value })
                }
                placeholder="e.g. Urban millennials aged 25–40 in Tier 1 cities"
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1"
              />
            </div>

            {/* Value Prop */}
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1.5">
                Value Proposition{" "}
                <span className="text-gray-400">(optional)</span>
              </label>
              <textarea
                value={form.valueProp}
                onChange={(e) =>
                  setForm({ ...form, valueProp: e.target.value })
                }
                placeholder="What makes your business unique? What problem do you solve?"
                rows={2}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1 resize-none"
              />
            </div>

            {errors.submit && (
              <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {errors.submit}
              </p>
            )}

            <div className="flex gap-3 pt-1">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 border border-gray-200 text-sm text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="flex-1 py-2.5 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600 transition-colors inline-flex items-center justify-center gap-2"
              >
                Create Workspace
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function BusinessCard({ business }) {
  const contentCount = parseInt(business.content_count || 0);
  const creativesCount = parseInt(business.creatives_count || 0);
  const campaignsCount = parseInt(business.campaigns_count || 0);
  const competitorsCount = parseInt(business.competitors_count || 0);
  const videosCount = parseInt(business.videos_count || 0);
  const hasBrandKit = parseInt(business.has_brand_kit || 0) > 0;

  return (
    <a
      href={`/business/${business.id}`}
      className="group glass-card rounded-xl border border-gray-250 hover:border-orange-300 hover-premium overflow-hidden shadow-sm"
    >
      {/* Card Header */}
      <div className="p-6 pb-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-gray-900 mb-1 truncate">
              {business.name}
            </h3>
            {business.industry && (
              <span className="inline-flex items-center bg-orange-50 border border-orange-100 rounded-full px-2.5 py-0.5 text-xs text-orange-600">
                {business.industry}
              </span>
            )}
          </div>
          <div
            className={`w-2.5 h-2.5 rounded-full mt-1.5 ml-3 flex-shrink-0 ${hasBrandKit ? "bg-orange-500" : "bg-gray-300"}`}
            title={hasBrandKit ? "Brand kit ready" : "No brand kit yet"}
          />
        </div>

        {business.value_proposition && (
          <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 mb-3">
            {business.value_proposition}
          </p>
        )}

        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <Globe size={12} />
          <span className="truncate">{business.website_url}</span>
        </div>
      </div>

      {/* Stats bar */}
      <div className="px-6 py-4 bg-orange-50/10 border-t border-gray-100 grid grid-cols-5 gap-2.5">
        <StatBadge
          icon={FileText}
          count={contentCount}
          label="Content"
          color="bg-[#1F3F74]"
        />
        <StatBadge
          icon={Image}
          count={creativesCount}
          label="Creatives"
          color="bg-violet-500"
        />
        <StatBadge
          icon={Video}
          count={videosCount}
          label="Videos"
          color="bg-orange-600"
        />
        <StatBadge
          icon={Megaphone}
          count={campaignsCount}
          label="Campaigns"
          color="bg-orange-500"
        />
        <StatBadge
          icon={TrendingUp}
          count={competitorsCount}
          label="Intel"
          color="bg-emerald-500"
        />
      </div>

      {/* Footer */}
      <div className="px-6 py-3 bg-white/40 border-t border-gray-100 flex items-center justify-between">
        <span className="text-xs text-gray-400">
          {new Date(business.created_at).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </span>
        <span className="text-xs text-orange-600 font-medium group-hover:gap-2 inline-flex items-center gap-1 transition-all">
          Open workspace <ChevronRight size={12} />
        </span>
      </div>
    </a>
  );
}

function EmptyState({ onAdd }) {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="max-w-xl w-full text-center">
        <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Brain size={28} className="text-blue-600" />
        </div>
        <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 text-blue-600 rounded-full px-3 py-1.5 text-xs font-medium mb-5">
          <Sparkles size={12} />
          Train Once. Create Everything.
        </div>
        <h1 className="text-3xl font-semibold text-gray-900 tracking-tight mb-3">
          Your AI marketing brain awaits
        </h1>
        <p className="text-sm text-gray-500 max-w-md mx-auto mb-8 leading-relaxed">
          Add your first business to get started. ContentOS will generate your
          brand kit, content, creatives, and campaigns — all in your brand
          voice.
        </p>

        <button
          onClick={onAdd}
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors mx-auto"
        >
          <Plus size={16} />
          Add Your First Business
        </button>

        <div className="mt-10 grid grid-cols-3 gap-4 max-w-sm mx-auto">
          {[
            {
              icon: Palette,
              label: "Brand Kit",
              color: "text-pink-500 bg-pink-50",
            },
            {
              icon: FileText,
              label: "Content",
              color: "text-blue-500 bg-blue-50",
            },
            {
              icon: Megaphone,
              label: "Campaigns",
              color: "text-orange-500 bg-orange-50",
            },
          ].map(({ icon: Icon, label, color }) => (
            <div
              key={label}
              className="flex flex-col items-center gap-2 p-3 rounded-xl bg-gray-50"
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}
              >
                <Icon size={16} />
              </div>
              <span className="text-xs text-gray-600">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user, isLoaded: clerkIsLoaded } = useUser();
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [clerkTimeout, setClerkTimeout] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: -250, y: -250 });
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setClerkTimeout(true);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
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
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseenter", handleMouseEnter);
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  const isLoaded = clerkIsLoaded || clerkTimeout;
  const activeUserId = user?.id || "demo-user-123";

  const loadBusinesses = async (uid) => {
    try {
      const res = await fetch(`/api/businesses/list?userId=${uid}`);
      const data = await res.json();
      setBusinesses(data.businesses || []);
    } catch (err) {
      console.error("Error loading businesses:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isLoaded) {
      loadBusinesses(activeUserId);
    }
  }, [isLoaded, activeUserId]);

  const handleCreated = (business) => {
    // Redirect to the new business page
    window.location.href = `/business/${business.id}`;
  };

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-400">
          <Loader2 size={18} className="animate-spin" />
          <span className="text-sm">Loading workspace...</span>
        </div>
      </div>
    );
  }

  if (businesses.length === 0) {
    return (
      <>
        <EmptyState onAdd={() => setShowModal(true)} />
        {showModal && (
          <AddBusinessModal
            userId={activeUserId}
            onClose={() => setShowModal(false)}
            onCreated={handleCreated}
          />
        )}
      </>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#F8FAFC] overflow-hidden">
      {/* Interactive Cursor-Following Orange Gradient Blob */}
      <div
        className="fixed pointer-events-none rounded-full blur-[120px] z-[5] opacity-0"
        style={{
          left: `${mousePosition.x - 250}px`,
          top: `${mousePosition.y - 250}px`,
          width: "500px",
          height: "500px",
          background: "radial-gradient(circle, rgba(236,133,96,0.3) 0%, rgba(250,224,212,0.1) 60%, transparent 100%)",
          opacity: isHovered ? 1 : 0,
          transition: "left 0.2s cubic-bezier(0.16, 1, 0.3, 1), top 0.2s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.5s ease-in-out",
        }}
      />

      {/* Floating Premium Glowing Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[550px] h-[550px] rounded-full premium-glow-1 pointer-events-none" />
      <div className="absolute bottom-[20%] right-[-10%] w-[600px] h-[600px] rounded-full premium-glow-2 pointer-events-none" />
      {/* Header */}
      <div className="bg-white/60 backdrop-blur-lg border-b border-gray-200/50 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" className="flex items-center gap-2">
              <div className="w-7 h-7 bg-gradient-to-tr from-orange-500 to-orange-400 rounded-lg flex items-center justify-center">
                <Sparkles size={13} className="text-white" />
              </div>
              <div>
                <span className="text-sm font-semibold text-gray-900">
                  ContentOS
                </span>
                <span className="text-xs text-gray-400 ml-1.5">
                  by The Vertical AI
                </span>
              </div>
            </a>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600 hover:scale-105 transition-premium shadow-sm shadow-orange-500/10"
            >
              <Plus size={15} />
              Add Business
            </button>
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Page header */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 tracking-tight mb-1">
            Your Workspaces
          </h2>
          <p className="text-sm text-gray-500">
            {businesses.length} business{businesses.length !== 1 ? "es" : ""} —
            each with its own AI marketing brain
          </p>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {[
            {
              label: "Total Content Pieces",
              value: businesses.reduce(
                (a, b) => a + parseInt(b.content_count || 0),
                0,
              ),
              icon: FileText,
              color: "bg-blue-50 text-blue-600",
            },
            {
              label: "Creatives Generated",
              value: businesses.reduce(
                (a, b) => a + parseInt(b.creatives_count || 0),
                0,
              ),
              icon: Image,
              color: "bg-violet-50 text-violet-600",
            },
            {
              label: "Videos Produced",
              value: businesses.reduce(
                (a, b) => a + parseInt(b.videos_count || 0),
                0,
              ),
              icon: Video,
              color: "bg-orange-50 text-orange-600",
            },
            {
              label: "Campaigns Planned",
              value: businesses.reduce(
                (a, b) => a + parseInt(b.campaigns_count || 0),
                0,
              ),
              icon: Megaphone,
              color: "bg-orange-50 text-orange-600",
            },
            {
              label: "Competitors Tracked",
              value: businesses.reduce(
                (a, b) => a + parseInt(b.competitors_count || 0),
                0,
              ),
              icon: TrendingUp,
              color: "bg-emerald-50 text-emerald-600",
            },
          ].map(({ label, value, icon: Icon, color }) => (
            <div
              key={label}
              className="glass-card rounded-xl border border-white/40 p-4 shadow-sm hover-premium"
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${
                  label.includes("Content") ? "bg-orange-50 text-orange-500" :
                  label.includes("Creatives") ? "bg-orange-100 text-orange-600" :
                  label.includes("Campaigns") ? "bg-orange-200 text-orange-700" :
                  "bg-orange-50 text-[#D5714C]"
                }`}
              >
                <Icon size={16} />
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {value}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">{label}</div>
            </div>
          ))}
        </div>

        {/* Business grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {businesses.map((b) => (
            <BusinessCard key={b.id} business={b} />
          ))}
          {/* Add new card */}
          <button
            onClick={() => setShowModal(true)}
            className="glass-card rounded-xl border-2 border-dashed border-gray-250 hover:border-orange-300 hover:bg-orange-50/10 hover-premium p-6 flex flex-col items-center justify-center gap-3 min-h-[200px] group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-gray-100 group-hover:bg-orange-100 flex items-center justify-center transition-colors">
              <Plus
                size={20}
                className="text-gray-400 group-hover:text-orange-500 transition-colors"
              />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600 group-hover:text-orange-600 transition-colors">
                Add Business
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                Create a new workspace
              </p>
            </div>
          </button>
        </div>
      </div>

      {showModal && (
        <AddBusinessModal
          userId={activeUserId}
          onClose={() => setShowModal(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
}
