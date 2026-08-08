import { forwardRef } from 'react';

const Input = forwardRef(({ className = '', icon, ...props }, ref) => {
  return (
    <div className="relative w-full group">
      {icon && (
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-white/40 group-focus-within:text-brand-accent transition-colors duration-300">
          {icon}
        </div>
      )}
      <input
        ref={ref}
        className={`w-full ${icon ? 'pl-11 pr-4' : 'px-4'} py-3 bg-[#0a1310] border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent focus:shadow-[0_0_12px_rgba(79,209,197,0.25)] hover:border-white/20 transition-all duration-300 ${className}`}
        {...props}
      />
    </div>
  );
});
Input.displayName = 'Input';

export default Input;
