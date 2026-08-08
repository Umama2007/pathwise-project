import { forwardRef } from 'react';

const Button = forwardRef(({ children, className = '', isLoading, disabled, ...props }, ref) => {
  return (
    <button
      ref={ref}
      disabled={disabled || isLoading}
      className={`relative inline-flex items-center justify-center px-6 py-3 font-bold text-[#0F1E1A] bg-white rounded-xl transition-all duration-300 hover:brightness-105 hover:-translate-y-0.5 hover:shadow-[0_0_20px_rgba(255,255,255,0.4)] active:translate-y-0 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none disabled:active:scale-100 ${className}`}
      {...props}
    >
      {isLoading && (
        <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-[#0F1E1A]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {children}
    </button>
  );
});
Button.displayName = 'Button';

export default Button;
