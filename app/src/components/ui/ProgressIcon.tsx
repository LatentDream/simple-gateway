import { cn } from "@/lib/utils";

interface ProgressIconProps {
  variant?: 'pending' | 'progress' | 'completed';
  className?: string;
}

const ProgressIcon: React.FC<ProgressIconProps> = ({ variant = "progress", className = '' }) => {
  // Base classes that handle color and animation, but not size
  const baseClasses = {
    pending: 'text-gray-400 animate-spin',
    progress: 'text-blue-500 animate-spin',
    completed: 'text-green-500'
  };

  if (variant === 'pending') {
    return (
      <svg
        className={cn(
          baseClasses[variant],
          'w-5 h-5',
          className
        )}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M12 8V12L15 15M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (variant === 'progress') {
    return (
      <svg
        className={cn(
          baseClasses[variant],
          'w-5 h-5',
          className
        )}
        viewBox="0 0 24 24"
        fill="none"
      >
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="2"
          className="opacity-30"
        />
        <path
          d="M12 2A10 10 0 0 1 22 12"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  // Completed variant
  return (
    <svg
      className={cn(
        baseClasses[variant],
        'w-5 h-5',
        className
      )}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M20 6L9 17L4 12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default ProgressIcon;
