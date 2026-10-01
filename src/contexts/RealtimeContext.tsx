import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';

type EventListener = (event: { type: string; data: any; timestamp: string }) => void;

interface RealtimeContextType {
  isConnected: boolean;
  subscribe: (listener: EventListener) => () => void;
  lastEvent: { type: string; data: any; timestamp: string } | null;
  unreadNotifications: number;
  clearNotifications: () => void;
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined);

export const RealtimeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const listenersRef = useRef<Set<EventListener>>(new Set());
  const [lastEvent, setLastEvent] = useState<{ type: string; data: any; timestamp: string } | null>(null);
  const [unreadNotifications, setUnreadNotifications] = useState<number>(0);

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimeout: any = null;
    let isMounted = true;

    function connectSSE() {
      if (!isMounted) return;
      if (eventSource) {
        try {
          eventSource.close();
        } catch {
          // ignore
        }
      }

      const url = `/api/events?role=${user?.role || 'guest'}&userId=${user?.id || ''}`;
      eventSource = new EventSource(url);

      eventSource.onopen = () => {
        if (isMounted) setIsConnected(true);
      };

      eventSource.onmessage = (e) => {
        try {
          const parsed = JSON.parse(e.data);
          if (parsed.type === 'CONNECTED' || parsed.type === 'PING') return;

          if (isMounted) {
            setLastEvent(parsed);
            setUnreadNotifications((prev) => prev + 1);
          }

          // Broadcast to all active listeners immediately
          listenersRef.current.forEach((fn) => {
            try {
              fn(parsed);
            } catch (err) {
              console.error('Error invoking real-time event listener', err);
            }
          });
        } catch (err) {
          console.error('Error parsing SSE event', err);
        }
      };

      eventSource.onerror = () => {
        if (isMounted) setIsConnected(false);
        try {
          eventSource?.close();
        } catch {
          // ignore
        }
        clearTimeout(reconnectTimeout);
        // Automatic exponential / quick reconnect after 2.5s
        reconnectTimeout = setTimeout(() => {
          if (isMounted) connectSSE();
        }, 2500);
      };
    }

    connectSSE();

    return () => {
      isMounted = false;
      clearTimeout(reconnectTimeout);
      try {
        eventSource?.close();
      } catch {
        // ignore
      }
    };
  }, [user?.role, user?.id]);

  const subscribe = useCallback((listener: EventListener) => {
    listenersRef.current.add(listener);
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

  const clearNotifications = () => {
    setUnreadNotifications(0);
  };

  return (
    <RealtimeContext.Provider
      value={{
        isConnected,
        subscribe,
        lastEvent,
        unreadNotifications,
        clearNotifications
      }}
    >
      {children}
    </RealtimeContext.Provider>
  );
};

export function useRealtime() {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error('useRealtime must be used within a RealtimeProvider');
  }
  return context;
}
