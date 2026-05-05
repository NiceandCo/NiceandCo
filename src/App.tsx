import { ArrowRight, CheckCircle2, Package, TrendingUp, Truck, Calculator, Upload } from "lucide-react";

const CONNECT = "https://connect.nice-supply.com";

const HOW_IT_WORKS = [
  {
    step: "01",
    icon: Package,
    title: "Onboarding & Compliance Setup",
    bullets: [
      "Item setup & catalog matching",
      "Brand content & migration",
      "Fulfillment compliance & routing verification",
      "UPC assignment, pricing prep, & margin modeling",
    ],
  },
  {
    step: "02",
    icon: TrendingUp,
    title: "We Offer Amazon & Wayfair — You Get the PO",
    bullets: [
      "Structured offers using your target cost",
      "We submit ASINs & handle allowances, co-ops, and chargebacks",
      "No upfront fees — we earn a Co-Op fee per remittance",
    ],
  },
  {
    step: "03",
    icon: Truck,
    title: "You Ship, Amazon Sells, We All Win",
    bullets: [
      "Ship inventory to Amazon's FCs (we guide every step)",
      "Amazon handles retail sales, Prime shipping, and Buy Box",
      "Shipments invoiced per our terms with Amazon",
      "We remit to you minus our Co-Op fee",
    ],
  },
  {
    step: "04",
    icon: CheckCircle2,
    title: "Why It Works Better Than 3P",
    bullets: [
      "Brands often double wholesale revenue over 3P",
      "Amazon's algorithm prioritizes listings with nationwide FC stocking",
      "You stay in control of brand, content, and advertising",
    ],
  },
];

const VALUE_PROPS = [
  {
    headline: "Vendor Code Terminated?",
    body: "Amazon terminated your Vendor account and now you're scrambling on 3P. Most brands lose 30–60% of revenue in the first 90 days. We help you get it back.",
  },
  {
    headline: "Unlock New 1P Channels",
    body: "Access restricted Amazon 1P categories and unlock a new revenue stream on Wayfair — without building new vendor relationships from scratch.",
  },
  {
    headline: "Want 1P Without the Wait?",
    body: "No AVS. No invites. No guessing. Whether you're stuck in 3P or just launching, we help brands of all sizes generate 1P revenue on Amazon and Wayfair — fast.",
  },
];

export default function App() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A]">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b bg-white/95 backdrop-blur">
        <div className="mx-auto w-full max-w-[1100px] px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <img src="/nco-logo.png" alt="Nice and Co." className="h-8 w-8 rounded-lg object-cover ring-1 ring-slate-200" />
            <span className="text-base font-semibold tracking-tight text-[#1E3A5F] whitespace-nowrap">Nice and Co.</span>
          </div>
          <nav className="flex items-center gap-3 sm:gap-5">
            <a href={`${CONNECT}/calculator`} className="hidden sm:inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-[#2563EB] transition-colors">
              <Calculator className="h-4 w-4" /> Wholesale Calculator
            </a>
            <a href={`${CONNECT}/analyzer`} className="hidden sm:inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-[#2563EB] transition-colors">
              <Upload className="h-4 w-4" /> Import Bulk Analyzer
            </a>
            <a href={`${CONNECT}/login`} className="inline-flex items-center rounded-lg bg-[#2563EB] hover:bg-[#1d4ed8] px-4 py-2 text-sm font-semibold text-white transition-colors whitespace-nowrap">
              Nice and Co.nnect Login
            </a>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="px-4 sm:px-6 pt-16 sm:pt-24 pb-12 sm:pb-16">
        <div className="mx-auto w-full max-w-[800px] text-center space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 border border-blue-100 px-4 py-1.5 text-sm font-medium text-[#2563EB]">
            Amazon & Wayfair Vendor Central (1P) — Co-Op Partnership
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-[#1E3A5F] leading-tight">
            Unlock Major Retail Growth<br className="hidden sm:block" /> with Amazon &amp; Wayfair 1P
          </h1>
          <p className="text-lg sm:text-xl text-slate-600 max-w-[640px] mx-auto">
            Whether you're transitioning from 3P or recovering from a Vendor Central shutdown,
            niceandco. Co-Op model gets you back on track — with scalable access to real POs and
            none of the guesswork.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <a href={`${CONNECT}/analyzer`} className="inline-flex items-center gap-2 rounded-lg bg-[#2563EB] px-6 py-3 text-sm font-semibold text-white hover:bg-[#1d4ed8] transition-colors shadow-sm">
              <Upload className="h-4 w-4" /> Upload ASINs into Wholesale Analyzer
            </a>
            <a href={`${CONNECT}/calculator`} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-[#1E3A5F] hover:bg-slate-50 transition-colors shadow-sm">
              <Calculator className="h-4 w-4" /> Wholesale Calculator
            </a>
          </div>
        </div>
      </section>

      {/* Value Props */}
      <section className="px-4 sm:px-6 py-10 bg-white border-y border-slate-100">
        <div className="mx-auto w-full max-w-[1100px]">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {VALUE_PROPS.map(({ headline, body }) => (
              <div key={headline} className="rounded-xl border border-slate-100 bg-[#F8FAFC] p-6 space-y-2">
                <h3 className="font-semibold text-[#1E3A5F] text-base">{headline}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="px-4 sm:px-6 py-14 sm:py-20">
        <div className="mx-auto w-full max-w-[1100px]">
          <div className="text-center mb-10 sm:mb-14 space-y-2">
            <p className="text-xs uppercase tracking-widest text-[#2563EB] font-semibold">How It Works</p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#1E3A5F]">Our 1P Co-Op Model</h2>
            <p className="text-slate-500 max-w-xl mx-auto text-sm sm:text-base">
              We operate as a compliant 1P Vendor of Record — onboarding and scaling your products
              with Amazon and Wayfair while you remain the brand owner.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {HOW_IT_WORKS.map(({ step, icon: Icon, title, bullets }) => (
              <div key={step} className="rounded-xl border border-slate-100 bg-white p-6 sm:p-8 space-y-4 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-[#2563EB]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[#2563EB] mb-0.5">Step {step}</p>
                    <h3 className="font-semibold text-[#1E3A5F] text-base leading-snug">{title}</h3>
                  </div>
                </div>
                <ul className="space-y-2 pl-1">
                  {bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2 text-sm text-slate-600">
                      <CheckCircle2 className="h-4 w-4 text-[#2563EB] mt-0.5 shrink-0" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 sm:px-6 py-14 bg-[#2563EB] text-white">
        <div className="mx-auto w-full max-w-[800px] text-center space-y-5">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Want a Free ASIN Analysis?</h2>
          <p className="text-blue-100 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
            Upload your ASINs and instantly see estimated remittance, wholesale pricing targets,
            monthly GMV potential, and total brand profitability breakdown.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <a href={`${CONNECT}/analyzer`} className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-semibold text-[#1E3A5F] hover:bg-blue-50 transition-colors">
              <Upload className="h-4 w-4" /> Upload ASINs into Wholesale Analyzer
            </a>
            <a href="mailto:info@nice-supply.com?subject=ASIN Analysis Request" className="inline-flex items-center gap-2 rounded-lg border border-white/30 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10 transition-colors">
              Email Your ASINs <ArrowRight className="h-4 w-4" />
            </a>
          </div>
          <p className="text-xs text-blue-200 pt-1">
            Or email directly: <a href="mailto:info@nice-supply.com" className="underline hover:text-white">info@nice-supply.com</a>
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-white">
        <div className="mx-auto w-full max-w-[1100px] px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <img src="/nco-logo.png" alt="Nice and Co." className="h-8 w-8 rounded-lg object-cover ring-1 ring-slate-200" />
            <div className="leading-tight">
              <span className="text-sm font-semibold text-[#1E3A5F] block">Nice and Co.</span>
              <p className="text-xs text-slate-500">Cleveland Born and Raised</p>
            </div>
          </div>
          <div className="text-xs text-slate-500 space-y-1">
            <p>425 Literary Rd, Suite 325, Cleveland, OH 44113</p>
            <p><a href="mailto:info@nice-supply.com" className="text-[#2563EB] hover:underline">info@nice-supply.com</a> · Mon–Fri 9 AM – 5 PM</p>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <a href={`${CONNECT}/calculator`} className="text-slate-500 hover:text-[#2563EB] transition-colors">Wholesale Calculator</a>
            <a href={`${CONNECT}/analyzer`} className="text-slate-500 hover:text-[#2563EB] transition-colors">Import Bulk Analyzer</a>
            <a href={`${CONNECT}/login`} className="text-[#2563EB] font-medium hover:underline">Nice and Co.nnect Login →</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
