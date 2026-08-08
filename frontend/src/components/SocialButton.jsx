export default function SocialButton({ icon, children, onClick }) {
  return (
    <button 
      type="button"
      onClick={onClick}
      className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-brand-background border border-white/10 rounded-xl text-sm font-medium text-brand-text hover:border-white/30 hover:bg-white/[0.02] transition-all duration-300"
    >
      {icon}
      <span>{children}</span>
    </button>
  );
}
