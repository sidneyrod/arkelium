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

interface WorkspaceState {
  tabs: WorkspaceTab[];
  activeTabId: string | null;
  
  // Actions
  openTab: (path: string, label: string, icon?: string) => void;
  closeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  updateTabScrollPosition: (id: string, scrollPosition: number) => void;
  setTabUnsavedChanges: (id: string, hasUnsavedChanges: boolean) => void;
  updateTabFormState: (id: string, formState: Record<string, any>) => void;
  closeAllTabs: () => void;
  closeOtherTabs: (id: string) => void;
}

const getTabIdFromPath = (path: string) => path.replace(/^\//, '') || 'dashboard';

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      tabs: [],
      activeTabId: null,

      openTab: (path: string, label: string, icon?: string) => {
        const id = getTabIdFromPath(path);
        const { tabs } = get();
        
        // Check if tab already exists
        const existingTab = tabs.find(tab => tab.id === id);
        
        if (existingTab) {
          // Just activate the existing tab
          set({
            tabs: tabs.map(tab => ({
              ...tab,
              isActive: tab.id === id,
            })),
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
            tabs: [
              ...tabs.map(tab => ({ ...tab, isActive: false })),
              newTab,
            ],
            activeTabId: id,
          });
        }
      },

      closeTab: (id: string) => {
        const { tabs, activeTabId } = get();
        const tabIndex = tabs.findIndex(tab => tab.id === id);
        const newTabs = tabs.filter(tab => tab.id !== id);
        
        if (newTabs.length === 0) {
          // Don't close the last tab, just return
          return;
        }
        
        let newActiveId = activeTabId;
        
        if (activeTabId === id) {
          // Need to activate another tab
          if (tabIndex > 0) {
            newActiveId = newTabs[tabIndex - 1].id;
          } else {
            newActiveId = newTabs[0].id;
          }
        }
        
        set({
          tabs: newTabs.map(tab => ({
            ...tab,
            isActive: tab.id === newActiveId,
          })),
          activeTabId: newActiveId,
        });
      },

      setActiveTab: (id: string) => {
        set(state => ({
          tabs: state.tabs.map(tab => ({
            ...tab,
            isActive: tab.id === id,
          })),
          activeTabId: id,
        }));
      },

      updateTabScrollPosition: (id: string, scrollPosition: number) => {
        set(state => ({
          tabs: state.tabs.map(tab =>
            tab.id === id ? { ...tab, scrollPosition } : tab
          ),
        }));
      },

      setTabUnsavedChanges: (id: string, hasUnsavedChanges: boolean) => {
        set(state => ({
          tabs: state.tabs.map(tab =>
            tab.id === id ? { ...tab, hasUnsavedChanges } : tab
          ),
        }));
      },

      updateTabFormState: (id: string, formState: Record<string, any>) => {
        set(state => ({
          tabs: state.tabs.map(tab =>
            tab.id === id ? { ...tab, formState } : tab
          ),
        }));
      },

      closeAllTabs: () => {
        const { tabs } = get();
        if (tabs.length > 0) {
          // Keep only the first tab
          const firstTab = tabs[0];
          set({
            tabs: [{ ...firstTab, isActive: true }],
            activeTabId: firstTab.id,
          });
        }
      },

      closeOtherTabs: (id: string) => {
        set(state => ({
          tabs: state.tabs.filter(tab => tab.id === id).map(tab => ({
            ...tab,
            isActive: true,
          })),
          activeTabId: id,
        }));
      },
    }),
    {
      name: 'workspace-tabs',
    }
  )
);
