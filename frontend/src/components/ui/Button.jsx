import { cn } from '../../lib/utils';

export function Button({ 
  children, 
  className, 
  variant = 'default',
  size = 'default',
  ...props 
}) {
  const baseStyles = 'inline-flex items-center justify-center rounded-2xl font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50';
  
  const variants = {
    default: 'bg-gradient-to-r from-secondary-400 to-primary-400 text-white hover:from-secondary-500 hover:to-primary-500 focus-visible:ring-primary-400 shadow-soft hover:shadow-soft-lg hover:-translate-y-0.5',
    outline: 'border-2 border-primary-300 bg-primary-50 text-primary-700 hover:bg-primary-100 hover:border-primary-400 focus-visible:ring-primary-400',
    ghost: 'text-primary-600 hover:bg-primary-50 focus-visible:ring-primary-400',
    secondary: 'bg-gradient-to-r from-accent-200 to-accent-300 text-accent-800 hover:from-accent-300 hover:to-accent-400 focus-visible:ring-accent-400 shadow-soft',
  };
  
  const sizes = {
    default: 'h-11 px-6 py-2.5',
    sm: 'h-9 px-4 text-sm',
    lg: 'h-12 px-10 text-lg',
  };

  return (
    <button
      className={cn(
        baseStyles,
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
