import { AnimatePresence, motion } from 'framer-motion'
import { useStore } from './store/useStore'
import {
  Header,
  NetworkGraph,
  QuickActions,
  ActiveOperations,
  MetricsTicker,
  TaskModal,
  TaskDetail,
} from './components'
import { pageVariants } from './styles/animations'

function App() {
  const { activeTask } = useStore()

  return (
    <div className="min-h-screen bg-gradient-to-b from-black to-gray-900">
      {/* Fixed header */}
      <Header />

      {/* Main content area */}
      <main className="pt-16 pb-14 px-4 max-w-4xl mx-auto">
        <AnimatePresence mode="wait">
          {activeTask ? (
            <motion.div
              key="task-detail"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <TaskDetail task={activeTask} />
            </motion.div>
          ) : (
            <motion.div
              key="dashboard"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="py-4"
            >
              <NetworkGraph />
              <QuickActions />
              <ActiveOperations />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Fixed metrics ticker at bottom */}
      <MetricsTicker />

      {/* Task creation modal */}
      <TaskModal />
    </div>
  )
}

export default App
