export default function AnimatedBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden -z-10 bg-brand-background">
      {/* Blobs */}
      <div className="absolute top-0 -left-4 w-96 h-96 bg-brand-accent rounded-full mix-blend-screen filter blur-[120px] opacity-40 animate-blob"></div>
      <div className="absolute top-0 -right-4 w-96 h-96 bg-brand-accent2 rounded-full mix-blend-screen filter blur-[120px] opacity-40 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-8 left-20 w-96 h-96 bg-brand-accent3 rounded-full mix-blend-screen filter blur-[120px] opacity-40 animate-blob animation-delay-4000"></div>
      <div className="absolute -bottom-8 right-20 w-80 h-80 bg-brand-accent rounded-full mix-blend-screen filter blur-[120px] opacity-30 animate-blob"></div>
    </div>
  );
}
