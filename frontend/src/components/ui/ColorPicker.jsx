import { Check } from 'lucide-react';
import { PREDEFINED_COLORS } from '../../constants/colors';

/**
 * ColorPicker Component
 * 
 * Displays a grid of predefined colors for selection.
 * Used in accommodation units and package creation.
 */
export function ColorPicker({ 
  value, 
  onChange, 
  disabled = false,
  className = '' 
}) {
  return (
    <div className={`grid grid-cols-8 gap-2 ${className}`}>
      {PREDEFINED_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          onClick={() => onChange(color)}
          disabled={disabled}
          className={`
            w-10 h-10 rounded-md border-2 transition-all
            hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500
            ${value === color ? 'border-gray-900 ring-2 ring-gray-900' : 'border-gray-300'}
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
          style={{ backgroundColor: color }}
          title={color}
        >
          {value === color && (
            <Check 
              className="w-5 h-5 text-white mx-auto" 
              strokeWidth={3}
              style={{ filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.8))' }}
            />
          )}
        </button>
      ))}
    </div>
  );
}
