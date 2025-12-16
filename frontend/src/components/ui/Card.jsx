import { cn } from '../../lib/utils';

export function Card({ children, className, ...props }) {
  return (
    <div
      className={cn(
        'rounded-3xl border border-primary-100 bg-white/90 backdrop-blur-sm shadow-soft',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className, ...props }) {
  return (
    <div
      className={cn('flex flex-col space-y-2 p-7', className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardTitle({ children, className, ...props }) {
  return (
    <h3
      className={cn('text-2xl font-semibold leading-none tracking-tight text-primary-800', className)}
      {...props}
    >
      {children}
    </h3>
  );
}

export function CardContent({ children, className, ...props }) {
  return (
    <div className={cn('p-7 pt-0', className)} {...props}>
      {children}
    </div>
  );
}
