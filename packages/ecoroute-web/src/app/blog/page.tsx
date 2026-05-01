import Link from "next/link";

const POSTS = [
  {
    id: 1,
    title: "Why Carbon-Aware Routing is the Future of Logistics",
    excerpt: "Discover how intelligent routing can reduce supply chain emissions by up to 15% without compromising on delivery speed.",
    date: "April 28, 2026",
    category: "Insights"
  },
  {
    id: 2,
    title: "EcoRoute SDK v1.0: Now with Rust-Powered Performance",
    excerpt: "We've rebuilt our core routing engine in Rust to provide sub-millisecond route calculations across entire continents.",
    date: "April 15, 2026",
    category: "Product"
  },
  {
    id: 3,
    title: "How to Integrate EcoRoute with Your Existing Fleet",
    excerpt: "A comprehensive guide on connecting our API with major telematics providers and custom logistics software.",
    date: "April 02, 2026",
    category: "Guides"
  }
];

export default function BlogPage() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-24">
      <div className="text-center mb-16">
        <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-[var(--neon-green)] mb-4">Blog & Resources</h2>
        <h1 className="text-4xl font-extrabold text-[var(--text-primary)] sm:text-6xl tracking-tight mb-6">
          Green tech <span className="text-glow-green">insights</span>
        </h1>
        <p className="max-w-2xl mx-auto text-lg text-[var(--text-secondary)]">
          Stay updated with the latest in sustainable logistics, API updates, and engineering deep-dives.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {POSTS.map((post) => (
          <div key={post.id} className="glass-panel p-8 border-glow-hover flex flex-col bg-[var(--surface-glass)] group">
            <div className="flex items-center justify-between mb-6">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--neon-purple)] bg-[rgba(168,85,247,0.1)] px-2 py-1 rounded">
                {post.category}
              </span>
              <span className="text-[10px] text-[var(--text-secondary)] font-medium">
                {post.date}
              </span>
            </div>
            <h3 className="text-xl font-bold text-[var(--text-primary)] mb-4 group-hover:text-[var(--neon-green)] transition-colors leading-tight">
              {post.title}
            </h3>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-8 flex-1">
              {post.excerpt}
            </p>
            <Link 
              href={`/blog/${post.id}`} 
              className="text-sm font-bold text-[var(--text-primary)] hover:text-[var(--neon-green)] flex items-center gap-2 group/link"
            >
              Read Article 
              <span className="group-hover/link:translate-x-1 transition-transform">&rarr;</span>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
