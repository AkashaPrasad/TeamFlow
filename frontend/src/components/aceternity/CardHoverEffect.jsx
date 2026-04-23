import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../../lib/utils'

export function HoverEffect({ items, className }) {
  const [hoveredIndex, setHoveredIndex] = useState(null)

  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 py-10', className)}>
      {items.map((item, idx) => (
        <div
          key={item.link || idx}
          className="relative group block p-2 h-full w-full"
          onMouseEnter={() => setHoveredIndex(idx)}
          onMouseLeave={() => setHoveredIndex(null)}
        >
          <AnimatePresence>
            {hoveredIndex === idx && (
              <motion.span
                className="absolute inset-0 h-full w-full bg-brand-100 dark:bg-brand-800/30 block rounded-2xl"
                layoutId="hoverBackground"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { duration: 0.15 } }}
                exit={{ opacity: 0, transition: { duration: 0.15, delay: 0.2 } }}
              />
            )}
          </AnimatePresence>
          <Card>
            <CardTitle>{item.title}</CardTitle>
            <CardDescription>{item.description}</CardDescription>
          </Card>
        </div>
      ))}
    </div>
  )
}

function Card({ className, children }) {
  return (
    <div className={cn('rounded-2xl h-full w-full p-4 overflow-hidden bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 group-hover:border-brand-400 relative z-20 transition-colors', className)}>
      <div className="relative z-50 p-4">
        {children}
      </div>
    </div>
  )
}

function CardTitle({ className, children }) {
  return (
    <h4 className={cn('text-gray-900 dark:text-white font-bold tracking-wide mt-4 text-base', className)}>
      {children}
    </h4>
  )
}

function CardDescription({ className, children }) {
  return (
    <p className={cn('mt-2 text-gray-500 dark:text-gray-400 tracking-wide leading-relaxed text-sm', className)}>
      {children}
    </p>
  )
}
