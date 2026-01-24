import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

export type NotificationType = 'job' | 'visit' | 'off_request' | 'invoice' | 'payroll' | 'system' | 'financial';
export type NotificationSeverity = 'info' | 'warning' | 'critical';

export interface Notification {
  id: string;
  company_id: string;
  recipient_user_id: string | null;
  role_target: string | null;
  title: string;
  message: string;
  type: NotificationType;
  severity: NotificationSeverity;
  metadata: Record<string, unknown> | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export interface NotificationPreferences {
  id: string;
  user_id: string;
  company_id: string;
  notify_new_jobs: boolean;
  notify_job_changes: boolean;
  notify_job_cancellations: boolean;
  notify_visits: boolean;
  notify_off_requests: boolean;
  notify_off_request_status: boolean;
  notify_invoices: boolean;
  notify_payroll: boolean;
  notify_system: boolean;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  preferences: NotificationPreferences | null;
  initialized: boolean;
  userId: string | null;
  
  // Actions
  setNotifications: (notifications: Notification[]) => void;
  setUnreadCount: (count: number) => void;
  setLoading: (loading: boolean) => void;
  setPreferences: (preferences: NotificationPreferences | null) => void;
  setInitialized: (initialized: boolean, userId?: string | null) => void;
  
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  addNotification: (notification: Notification) => void;
  
  fetchNotifications: (limit?: number) => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  fetchPreferences: (userId: string) => Promise<void>;
  updatePreferences: (userId: string, newPrefs: Partial<NotificationPreferences>) => Promise<void>;
  
  reset: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: true,
  preferences: null,
  initialized: false,
  userId: null,
  
  setNotifications: (notifications) => set({ notifications }),
  setUnreadCount: (count) => set({ unreadCount: count }),
  setLoading: (loading) => set({ loading }),
  setPreferences: (preferences) => set({ preferences }),
  setInitialized: (initialized, userId = null) => set({ initialized, userId }),
  
  markAsRead: async (notificationId: string) => {
    const { notifications, unreadCount } = get();
    
    // Find the notification to check if it's already read
    const notification = notifications.find(n => n.id === notificationId);
    if (!notification || notification.is_read) return;
    
    // Optimistic update
    set({
      notifications: notifications.map(n => 
        n.id === notificationId 
          ? { ...n, is_read: true, read_at: new Date().toISOString() } 
          : n
      ),
      unreadCount: Math.max(0, unreadCount - 1)
    });
    
    try {
      // Use RPC function that handles role_target='all' correctly
      const { error } = await supabase.rpc('mark_notification_as_read', {
        p_notification_id: notificationId
      });
      
      if (error) {
        console.error('Error marking notification as read:', error);
        // Revert on error
        set({ 
          notifications: notifications,
          unreadCount: unreadCount 
        });
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
      // Revert on error
      set({ 
        notifications: notifications,
        unreadCount: unreadCount 
      });
    }
  },
  
  markAllAsRead: async () => {
    const { notifications, userId } = get();
    const unreadNotifications = notifications.filter(n => !n.is_read);
    
    if (!userId || unreadNotifications.length === 0) return;
    
    // Optimistic update
    const updatedNotifications = notifications.map(n => ({
      ...n,
      is_read: true,
      read_at: n.is_read ? n.read_at : new Date().toISOString()
    }));
    
    set({
      notifications: updatedNotifications,
      unreadCount: 0
    });
    
    try {
      // Use RPC function that handles role_target='all' correctly
      const { error } = await supabase.rpc('mark_all_notifications_as_read');
      
      if (error) {
        console.error('Error marking all notifications as read:', error);
        // Revert on error
        set({ 
          notifications: notifications,
          unreadCount: unreadNotifications.length 
        });
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      // Revert on error
      set({ 
        notifications: notifications,
        unreadCount: unreadNotifications.length 
      });
    }
  },
  
  addNotification: (notification: Notification) => {
    const { notifications } = get();
    
    // Check if already exists
    if (notifications.some(n => n.id === notification.id)) {
      return;
    }
    
    set({
      notifications: [notification, ...notifications],
      unreadCount: get().unreadCount + (notification.is_read ? 0 : 1)
    });
  },
  
  fetchNotifications: async (limit = 50) => {
    const { userId } = get();
    if (!userId) return;

    set({ loading: true });
    
    try {
      // Fetch notifications
      const { data: notificationsData, error: notificationsError } = await supabase
        .from('notifications')
        .select('*')
        .or(`recipient_user_id.eq.${userId},recipient_user_id.is.null`)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (notificationsError) throw notificationsError;
      
      // Fetch read status for broadcast notifications (per-user tracking)
      const { data: readStatusData, error: readStatusError } = await supabase
        .from('notification_read_status')
        .select('notification_id')
        .eq('user_id', userId);
      
      if (readStatusError) {
        console.error('Error fetching read status:', readStatusError);
      }
      
      // Create a Set of notification IDs the user has marked as read
      const readNotificationIds = new Set(
        (readStatusData || []).map(r => r.notification_id)
      );
      
      // Merge read status: a notification is "read" if:
      // - It's a direct notification with is_read=true, OR
      // - It's a broadcast notification and exists in notification_read_status for this user
      const notificationsWithReadStatus = (notificationsData || []).map(n => {
        const isBroadcast = n.recipient_user_id === null;
        const isReadByUser = isBroadcast 
          ? readNotificationIds.has(n.id)
          : n.is_read;
        
        return {
          ...n,
          is_read: isReadByUser,
          read_at: isReadByUser ? (n.read_at || new Date().toISOString()) : null
        };
      }) as unknown as Notification[];
      
      set({ notifications: notificationsWithReadStatus });
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      set({ loading: false });
    }
  },
  
  fetchUnreadCount: async () => {
    const { userId } = get();
    if (!userId) return;

    try {
      // Count unread direct notifications
      const { count: directCount, error: directError } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', false)
        .eq('recipient_user_id', userId);
      
      if (directError) throw directError;
      
      // Get user's role for broadcast filtering
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .limit(1)
        .single();
      
      const userRole = roleData?.role || '';
      
      // Count broadcast notifications not in read_status for this user
      // We need to fetch and count manually since Supabase doesn't support NOT EXISTS easily
      const { data: broadcastNotifications, error: broadcastError } = await supabase
        .from('notifications')
        .select('id')
        .is('recipient_user_id', null)
        .or(`role_target.eq.all,role_target.eq.${userRole}`);
      
      if (broadcastError) throw broadcastError;
      
      const broadcastIds = (broadcastNotifications || []).map(n => n.id);
      
      // Get which broadcast notifications the user has read
      const { data: readBroadcasts, error: readError } = await supabase
        .from('notification_read_status')
        .select('notification_id')
        .eq('user_id', userId)
        .in('notification_id', broadcastIds.length > 0 ? broadcastIds : ['00000000-0000-0000-0000-000000000000']);
      
      if (readError) throw readError;
      
      const readBroadcastIds = new Set((readBroadcasts || []).map(r => r.notification_id));
      const unreadBroadcastCount = broadcastIds.filter(id => !readBroadcastIds.has(id)).length;
      
      set({ unreadCount: (directCount || 0) + unreadBroadcastCount });
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  },
  
  fetchPreferences: async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (error) throw error;
      set({ preferences: data });
    } catch (error) {
      console.error('Error fetching notification preferences:', error);
    }
  },
  
  updatePreferences: async (userId: string, newPrefs: Partial<NotificationPreferences>) => {
    const { preferences } = get();
    
    try {
      const { data: companyId } = await supabase.rpc('get_user_company_id');
      
      if (preferences) {
        const { error } = await supabase
          .from('notification_preferences')
          .update(newPrefs)
          .eq('id', preferences.id);
        
        if (error) throw error;
        set({ preferences: { ...preferences, ...newPrefs } as NotificationPreferences });
      } else {
        const { data, error } = await supabase
          .from('notification_preferences')
          .insert({
            user_id: userId,
            company_id: companyId,
            ...newPrefs
          })
          .select()
          .single();
        
        if (error) throw error;
        set({ preferences: data });
      }
    } catch (error) {
      console.error('Error updating notification preferences:', error);
    }
  },
  
  reset: () => set({
    notifications: [],
    unreadCount: 0,
    loading: true,
    preferences: null,
    initialized: false,
    userId: null
  })
}));

// Singleton channel reference to prevent multiple subscriptions
let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;

export const initializeNotificationSubscription = (userId: string) => {
  const store = useNotificationStore.getState();
  
  // If already initialized for this user, don't re-initialize
  if (store.initialized && store.userId === userId) {
    return () => {};
  }
  
  // Clean up existing channel if any
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel);
    realtimeChannel = null;
  }
  
  // Set userId before fetching so filters work correctly
  store.setInitialized(true, userId);
  store.fetchNotifications();
  store.fetchUnreadCount();
  store.fetchPreferences(userId);
  
  // Create new subscription
  realtimeChannel = supabase
    .channel('notifications-global')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications'
      },
      (payload) => {
        const newNotification = payload.new as Notification;
        store.addNotification(newNotification);
      }
    )
    .subscribe();
  
  // Return cleanup function
  return () => {
    if (realtimeChannel) {
      supabase.removeChannel(realtimeChannel);
      realtimeChannel = null;
    }
    store.reset();
  };
};
