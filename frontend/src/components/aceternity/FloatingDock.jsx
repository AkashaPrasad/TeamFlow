import { useRef, useState } from 'react'
import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from 'framer-motion'
import { cn } from '../../lib/utils'

export function FloatingDock({ items, className }) {
  return (
    <div className={cn('flex items-end gap-2 rounded-2xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border border-gray-200 dark:border-gray-700 px-4 py-3 shadow-xl', className)}>
      {items.map((item) => (
        <IconContainer key={item.title} {...item} />
      ))}
    </div>
  )
}

function IconContainer({ title, icon, href, onClick, active }) {
  const ref = useRef(null)
  const [hovered, setHovered] = useState(false)

  const mouseX = useMotionValue(Infinity)
  const distance = useTransform(mouseX, (val) => {
    const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 }
    return val - bounds.x - bounds.width / 2
  })

  const widthTransform = useTransform(distance, [-100, 0, 100], [40, 56, 40])
  const heightTransform = useTransform(distance, [-100, 0, 100], [40, 56, 40])
  const width = useSpring(widthTransform, { mass: 0.1, stiffness: 150, damping: 12 })
  const height = useSpring(heightTransform, { mass: 0.1, stiffness: 150, damping: 12 })

  const Component = href ? 'a' : 'button'

  return (
    <Component href={href} onClick={onClick} className="flex flex-col items-center justify-end">
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, y: 10, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 2, x: '-50%' }}
            className="absolute -top-8 left-1/2 whitespace-pre rounded-md border border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700 px-2 py-0.5 text-xs text-neutral-700 dark:text-white"
          >
            {title}
          </motion.div>
        )}
      </AnimatePresence>
      <motion.div
        ref={ref}
        style={{ width, height }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={cn(
          'relative flex items-center justify-center rounded-full',
          active
            ? 'bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-400'
            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
        )}
      >
        {icon}
        {active && (
          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-brand-600" />
        )}
      </motion.div>
    </Component>
  )
}
