export default function GlassCard({ children, className = '' }) {
  return (
    <div className={`bg-brand-surface/70 backdrop-blur-xl border border-white/20 shadow-2xl rounded-2xl hover:border-brand-accent/30 hover:shadow-[0_0_40px_rgba(79,209,197,0.15)] transition-all duration-500 ${className}`}>
      {children}
    </div>
  );
}
