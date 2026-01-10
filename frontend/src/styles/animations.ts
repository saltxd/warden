import type { Variants } from 'framer-motion'

// Page transitions
export const pageVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.3 } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
}

// Card animations (for QuickActions, ActiveOperations)
export const cardVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3 }
  },
  hover: {
    scale: 1.02,
    transition: { duration: 0.2 }
  },
  tap: {
    scale: 0.98,
    transition: { duration: 0.1 }
  },
}

// Stagger children (for lists)
export const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
}

// Modal (bottom sheet)
export const modalVariants: Variants = {
  hidden: {
    y: '100%',
    opacity: 0,
  },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: 'spring',
      damping: 25,
      stiffness: 300,
    }
  },
  exit: {
    y: '100%',
    opacity: 0,
    transition: { duration: 0.2 }
  },
}

// Backdrop
export const backdropVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
}

// Node pulse animation
export const nodePulseVariants: Variants = {
  idle: {
    scale: [1, 1.05, 1],
    opacity: [0.8, 1, 0.8],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
  busy: {
    scale: [1, 1.1, 1],
    opacity: [0.7, 1, 0.7],
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
  error: {
    scale: [1, 1.15, 1],
    opacity: [0.6, 1, 0.6],
    transition: {
      duration: 0.5,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
}

// Progress bar
export const progressVariants: Variants = {
  initial: { width: 0 },
  animate: (progress: number) => ({
    width: `${progress}%`,
    transition: { duration: 0.5, ease: 'easeOut' },
  }),
}

// Success checkmark (SVG path animation)
export const checkmarkVariants: Variants = {
  hidden: {
    pathLength: 0,
    opacity: 0,
  },
  visible: {
    pathLength: 1,
    opacity: 1,
    transition: {
      pathLength: { duration: 0.5, ease: 'easeInOut' },
      opacity: { duration: 0.2 },
    }
  },
}

// Slide in from right (for TaskDetail)
export const slideInVariants: Variants = {
  hidden: { x: '100%', opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: { type: 'spring', damping: 25, stiffness: 200 }
  },
  exit: {
    x: '100%',
    opacity: 0,
    transition: { duration: 0.2 }
  },
}

// Number counter animation helper
export const springConfig = {
  damping: 20,
  stiffness: 100,
}
