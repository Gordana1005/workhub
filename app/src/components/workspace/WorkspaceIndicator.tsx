import { Building2 } from 'lucide-react'

interface WorkspaceIndicatorProps {
  name: string
  color?: string
  category?: string
  size?: 'sm' | 'md' | 'lg'
  showCategory?: boolean
  className?: string
}

export default function WorkspaceIndicator({
  name,
  color = '#667eea',
  category,
  size = 'md',
  showCategory = false,
  className = '',
}: WorkspaceIndicatorProps) {
  const sizeClasses = {
    sm: {
      dot: 'w-2 h-2',
      text: 'text-xs',
      container: 'gap-2',
    },
    md: {
      dot: 'w-3 h-3',
      text: 'text-sm',
      container: 'gap-2',
    },
    lg: {
      dot: 'w-4 h-4',
      text: 'text-base',
      container: 'gap-3',
    },
  }

  const classes = sizeClasses[size]

  return (
    <div className={`flex items-center ${classes.container} ${className}`}>
      {color ? (
        <div
          className={`${classes.dot} rounded-full flex-shrink-0 ring-1 ring-slate-700/50`}
          style={{ backgroundColor: color }}
        />
      ) : (
        <Building2 className={`${classes.dot === 'w-2 h-2' ? 'w-3 h-3' : classes.dot === 'w-3 h-3' ? 'w-4 h-4' : 'w-5 h-5'} text-slate-400 flex-shrink-0`} />
      )}
      
      <div className="flex-1 min-w-0">
        <div className={`font-medium text-white truncate ${classes.text}`}>
          {name}
        </div>
        {showCategory && category && (
          <div className={`text-slate-400 truncate ${size === 'sm' ? 'text-[10px]' : 'text-xs'}`}>
            {category}
          </div>
        )}
      </div>
    </div>
  )
}
