import { useState, useEffect } from 'react';

const bgImages = [
  'https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=2000', // Moody modern office space
  'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?q=80&w=2000'  // Dark/professional team meeting
];

export default function AuthLayout({ imagePanel, children, backgroundType = 'slider', videoUrl = '' }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (backgroundType !== 'slider') return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % bgImages.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [backgroundType]);

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 sm:p-6 md:p-8 lg:p-12 xl:p-16 overflow-hidden bg-[#0F1E1A]">
      
      {/* Full Page Sliding Background or Video */}
      <div className="absolute inset-0 z-0">
        {backgroundType === 'video' && videoUrl ? (
          <video 
            autoPlay 
            loop 
            muted 
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          >
            <source src={videoUrl} type="video/mp4" />
          </video>
        ) : (
          <div 
            className="absolute inset-0 flex transition-transform duration-1000 ease-in-out"
            style={{ transform: `translateX(-${currentIndex * 100}%)` }}
          >
            {bgImages.map((img, idx) => (
              <div 
                key={idx}
                className="relative w-full h-full flex-shrink-0 bg-cover bg-center"
                style={{ backgroundImage: `url("${img}")` }}
              />
            ))}
          </div>
        )}
        {/* Theme Overlays: Ensuring the background is dark enough for the login box to pop, with a subtle teal accent */}
        <div className="absolute inset-0 bg-[#0F1E1A]/50" />
        <div className="absolute inset-0 bg-gradient-to-tr from-[#0F1E1A]/90 via-[#0F1E1A]/40 to-[#4FD1C5]/20 backdrop-blur-[2px]" />
      </div>
      
      {/* The main login box, fully responsive and centered over the slider */}
      <div className={`relative w-full ${imagePanel ? 'max-w-[420px] sm:max-w-[500px] md:max-w-[840px] lg:max-w-[960px] xl:max-w-[1080px] md:grid md:grid-cols-2' : 'max-w-[380px] sm:max-w-[440px] md:max-w-[520px]'} flex flex-col rounded-[2rem] shadow-[0_30px_60px_rgba(0,0,0,0.7)] border border-white/10 bg-[#142420]/90 backdrop-blur-2xl overflow-hidden z-20 animate-fade-in-scale transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_40px_80px_rgba(0,0,0,0.9)] hover:border-white/20`}>
        
        {/* Form content (Bottom on mobile, Left on desktop if image exists) */}
        <div className={`flex flex-col justify-center p-6 sm:p-8 md:p-10 lg:p-14 xl:p-16 ${imagePanel ? 'order-2 md:order-1' : ''}`}>
          {children}
        </div>

        {/* Image Panel (Top on mobile, Right on desktop) */}
        {imagePanel && (
          <div className="min-h-[240px] sm:min-h-[280px] md:min-h-[500px] lg:min-h-[600px] md:h-full w-full order-1 md:order-2">
            {imagePanel}
          </div>
        )}
        
      </div>
    </div>
  );
}
