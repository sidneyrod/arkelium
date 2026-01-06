import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface WorkspaceTab {
  id: string;
  path: string;
  label: string;
  icon?: string;
  isActive: boolean;
  scrollPosition?: number;
  hasUnsavedChanges?: boolean;
  formState?: Record<string, any>;
}

interface UserTabsState {
  [userId: string]: WorkspaceTab[];
}

interface WorkspaceState {
  userTabs: UserTabsState;
  currentUserId: string | null;
  activeTabId: string | null;
  
  // Actions
  setCurrentUser: (userId: string | null) => void;
  openTab: (path: string, label: string, icon?: string) => void;
  closeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  updateTabScrollPosition: (id: string, scrollPosition: number) => void;
  setTabUnsavedChanges: (id: string, hasUnsavedChanges: boolean) => void;
  updateTabFormState: (id: string, formState: Record<string, any>) => void;
  closeAllTabs: () => void;
  closeOtherTabs: (id: string) => void;
  reorderTabs: (fromIndex: number, toIndex: number) => void;
  
  // Computed getter for current user tabs
  tabs: WorkspaceTab[];
}

const getTabIdFromPath = (path: string) => {
  // Remove query params and leading slash to get consistent tab ID
  const pathWithoutQuery = path.split('?')[0];
  return pathWithoutQuery.replace(/^\//, '') || 'dashboard';
};

const getDefaultTabs = (): WorkspaceTab[] => [{
  id: 'dashboard',
  path: '/',
  label: 'Dashboard',
  isActive: true,
}];

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      userTabs: {},
      currentUserId: null,
      activeTabId: 'dashboard',
      
      get tabs() {
        const { currentUserId, userTabs } = get();
        if (!currentUserId) return getDefaultTabs();
        return userTabs[currentUserId] || getDefaultTabs();
      },

      setCurrentUser: (userId: string | null) => {
        if (!userId) {
          set({ currentUserId: null, activeTabId: 'dashboard' });
          return;
        }
        
        const { userTabs } = get();
        const existingTabs = userTabs[userId];
        
        if (!existingTabs || existingTabs.length === 0) {
          // Initialize tabs for new user
          set({
            currentUserId: userId,
            userTabs: {
              ...userTabs,
              [userId]: getDefaultTabs(),
            },
            activeTabId: 'dashboard',
          });
        } else {
          // Restore existing tabs and find active one
          const activeTab = existingTabs.find(t => t.isActive) || existingTabs[0];
          set({
            currentUserId: userId,
            activeTabId: activeTab?.id || 'dashboard',
          });
        }
      },

      openTab: (path: string, label: string, icon?: string) => {
        const id = getTabIdFromPath(path);
        const { currentUserId, userTabs } = get();
        
        if (!currentUserId) return;
        
        const tabs = userTabs[currentUserId] || getDefaultTabs();
        
        // Check if tab already exists
        const existingTab = tabs.find(tab => tab.id === id);
        
        if (existingTab) {
          // Just activate the existing tab and update the path
          set({
            userTabs: {
              ...userTabs,
              [currentUserId]: tabs.map(tab => ({
                ...tab,
                isActive: tab.id === id,
                path: tab.id === id ? path : tab.path,
              })),
            },
            activeTabId: id,
          });
        } else {
          // Create new tab
          const newTab: WorkspaceTab = {
            id,
            path,
            label,
            icon,
            isActive: true,
          };
          
          set({
            userTabs: {
              ...userTabs,
              [currentUserId]: [
                ...tabs.map(tab => ({ ...tab, isActive: false })),
                newTab,
              ],
            },
            activeTabId: id,
          });
        }
      },

      closeTab: (id: string) => {
        const { currentUserId, userTabs, activeTabId } = get();
        
        if (!currentUserId) return;
        
        const tabs = userTabs[currentUserId] || [];
        const tabIndex = tabs.findIndex(tab => tab.id === id);
        const newTabs = tabs.filter(tab => tab.id !== id);
        
        if (newTabs.length === 0) {
          // If closing the last tab, navigate to home/dashboard
          set({
            userTabs: {
              ...userTabs,
              [currentUserId]: getDefaultTabs(),
            },
            activeTabId: 'dashboard',
          });
          return;
        }
        
        let newActiveId = activeTabId;
        
        if (activeTabId === id) {
          // If closing active tab, go to previous tab or first available, prefer Home
          const homeTab = newTabs.find(t => t.id === 'dashboard' || t.path === '/');
          if (homeTab) {
            newActiveId = homeTab.id;
          } else if (tabIndex > 0) {
            newActiveId = newTabs[tabIndex - 1].id;
          } else {
            newActiveId = newTabs[0].id;
          }
        }
        
        set({
          userTabs: {
            ...userTabs,
            [currentUserId]: newTabs.map(tab => ({
              ...tab,
              isActive: tab.id === newActiveId,
            })),
          },
          activeTabId: newActiveId,
        });
      },

      setActiveTab: (id: string) => {
        const { currentUserId, userTabs } = get();
        
        if (!currentUserId) return;
        
        const tabs = userTabs[currentUserId] || [];
        
        set({
          userTabs: {
            ...userTabs,
            [currentUserId]: tabs.map(tab => ({
              ...tab,
              isActive: tab.id === id,
            })),
          },
          activeTabId: id,
        });
      },

      updateTabScrollPosition: (id: string, scrollPosition: number) => {
        const { currentUserId, userTabs } = get();
        
        if (!currentUserId) return;
        
        const tabs = userTabs[currentUserId] || [];
        
        set({
          userTabs: {
            ...userTabs,
            [currentUserId]: tabs.map(tab =>
              tab.id === id ? { ...tab, scrollPosition } : tab
            ),
          },
        });
      },

      setTabUnsavedChanges: (id: string, hasUnsavedChanges: boolean) => {
        const { currentUserId, userTabs } = get();
        
        if (!currentUserId) return;
        
        const tabs = userTabs[currentUserId] || [];
        
        set({
          userTabs: {
            ...userTabs,
            [currentUserId]: tabs.map(tab =>
              tab.id === id ? { ...tab, hasUnsavedChanges } : tab
            ),
          },
        });
      },

      updateTabFormState: (id: string, formState: Record<string, any>) => {
        const { currentUserId, userTabs } = get();
        
        if (!currentUserId) return;
        
        const tabs = userTabs[currentUserId] || [];
        
        set({
          userTabs: {
            ...userTabs,
            [currentUserId]: tabs.map(tab =>
              tab.id === id ? { ...tab, formState } : tab
            ),
          },
        });
      },

      closeAllTabs: () => {
        const { currentUserId, userTabs } = get();
        
        if (!currentUserId) return;
        
        const tabs = userTabs[currentUserId] || [];
        
        if (tabs.length > 0) {
          // Keep only the first tab
          const firstTab = tabs[0];
          set({
            userTabs: {
              ...userTabs,
              [currentUserId]: [{ ...firstTab, isActive: true }],
            },
            activeTabId: firstTab.id,
          });
        }
      },

      closeOtherTabs: (id: string) => {
        const { currentUserId, userTabs } = get();
        
        if (!currentUserId) return;
        
        const tabs = userTabs[currentUserId] || [];
        
        set({
          userTabs: {
            ...userTabs,
            [currentUserId]: tabs.filter(tab => tab.id === id).map(tab => ({
              ...tab,
              isActive: true,
            })),
          },
          activeTabId: id,
        });
      },

      reorderTabs: (fromIndex: number, toIndex: number) => {
        const { currentUserId, userTabs } = get();
        
        if (!currentUserId) return;
        
        const tabs = [...(userTabs[currentUserId] || [])];
        
        if (fromIndex < 0 || fromIndex >= tabs.length || toIndex < 0 || toIndex >= tabs.length) {
          return;
        }
        
        const [movedTab] = tabs.splice(fromIndex, 1);
        tabs.splice(toIndex, 0, movedTab);
        
        set({
          userTabs: {
            ...userTabs,
            [currentUserId]: tabs,
          },
        });
      },
    }),
    {
      name: 'workspace-tabs-v2',
    }
  )
);
