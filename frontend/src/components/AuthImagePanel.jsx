import { Link } from 'react-router-dom';

export default function AuthImagePanel({ quoteHighlighted, quoteBody, author }) {
  return (
    <div className="relative w-full h-full overflow-hidden flex flex-col justify-between">
      
      {/* Library Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 hover:scale-105"
        // A placeholder library bookshelf image matching your uploaded photo!
        style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?q=80&w=1000")' }}
      />

      {/* Moody Dark Overlay to make the text pop */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0F1E1A] via-[#0F1E1A]/60 to-[#0F1E1A]/30 mix-blend-multiply" />
      <div className="absolute inset-0 bg-black/40" />

      {/* Top Header */}
      <div className="relative z-10 flex items-center justify-between p-5 sm:p-6 md:p-8 lg:p-10">
        <div className="font-bold text-base sm:text-lg md:text-xl lg:text-2xl tracking-tight text-white drop-shadow-md">Pathwise</div>
        <Link to="/" className="text-[10px] sm:text-xs md:text-sm font-medium text-white bg-black/30 backdrop-blur-md px-3 py-1.5 md:px-4 md:py-2 lg:px-5 lg:py-2.5 rounded-full hover:bg-black/50 border border-white/10 transition-colors drop-shadow-md">
          Back to website
        </Link>
      </div>

      {/* Bottom Content - Quote Area */}
      <div className="relative z-10 p-5 sm:p-6 md:p-8 lg:p-10 flex flex-col justify-end h-full">
        <blockquote className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-light text-white leading-snug mb-3 sm:mb-4 md:mb-6">
          <span className="text-brand-accent font-medium">{quoteHighlighted || "Knowledge,"}</span><br/>
          {quoteBody || "If it does not determine action is dead to us."}
        </blockquote>
        <div className="flex items-center mt-1 sm:mt-2">
          <div className="w-3 sm:w-4 md:w-5 h-[2px] bg-brand-accent mr-2 md:mr-3"></div>
          <span className="text-[9px] sm:text-[10px] md:text-xs lg:text-sm tracking-[0.2em] font-bold text-white/70 uppercase">{author || "Plotinus"}</span>
        </div>
      </div>
    </div>
  );
}
