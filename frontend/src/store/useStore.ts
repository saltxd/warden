import { create } from 'zustand'
import type { Task, Notification, ModalType } from '../types'
import { mockNotifications } from '../data/mockData'

interface Store {
  // Data (nodes now come from API via useNodes hook)
  tasks: Task[]
  notifications: Notification[]

  // UI State
  activeTask: Task | null
  isModalOpen: boolean
  modalType: ModalType

  // Actions - Tasks
  setActiveTask: (task: Task | null) => void
  addTask: (task: Task) => void
  updateTask: (taskId: string, updates: Partial<Task>) => void
  removeTask: (taskId: string) => void

  // Actions - Modal
  openModal: (type: ModalType) => void
  closeModal: () => void

  // Actions - Notifications
  markNotificationRead: (notifId: string) => void
  clearNotifications: () => void
  addNotification: (notification: Notification) => void

  // Actions - Task Cleanup
  clearCompletedTasks: () => void

  // Computed
  unreadNotificationCount: () => number
  runningTaskCount: () => number
}

export const useStore = create<Store>((set, get) => ({
  // Initial data - start with empty tasks, notifications use mock data
  tasks: [],
  notifications: mockNotifications,

  // Initial UI state
  activeTask: null,
  isModalOpen: false,
  modalType: null,

  // Task actions
  setActiveTask: (task) => set({ activeTask: task }),

  addTask: (task) => set((state) => ({
    tasks: [task, ...state.tasks]
  })),

  updateTask: (taskId, updates) =>
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId ? { ...t, ...updates } : t
      ),
      // Also update activeTask if it's the one being updated
      activeTask: state.activeTask?.id === taskId
        ? { ...state.activeTask, ...updates }
        : state.activeTask,
    })),

  removeTask: (taskId) =>
    set((state) => ({
      tasks: state.tasks.filter((t) => t.id !== taskId),
      activeTask: state.activeTask?.id === taskId ? null : state.activeTask,
    })),

  // Modal actions
  openModal: (type) => set({ isModalOpen: true, modalType: type }),
  closeModal: () => set({ isModalOpen: false, modalType: null }),

  // Notification actions
  markNotificationRead: (notifId) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === notifId ? { ...n, read: true } : n
      ),
    })),

  clearNotifications: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
    })),

  addNotification: (notification) =>
    set((state) => ({
      notifications: [notification, ...state.notifications],
    })),

  // Task cleanup
  clearCompletedTasks: () =>
    set((state) => ({
      tasks: state.tasks.filter((t) => t.status === 'running' || t.status === 'queued'),
      activeTask: state.activeTask && (state.activeTask.status === 'complete' || state.activeTask.status === 'failed')
        ? null
        : state.activeTask,
    })),

  // Computed values
  unreadNotificationCount: () =>
    get().notifications.filter((n) => !n.read).length,

  runningTaskCount: () =>
    get().tasks.filter((t) => t.status === 'running').length,
}))
