import React from 'react';
import {
  Bell,
  AlertCircle,
  Radio,
  MapPin,
  CheckCircle2,
  Info,
  ChevronRight
} from 'lucide-react';

export interface DriverNotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  severity: 'info' | 'warning' | 'success' | 'alert';
}

interface DriverNotificationsCardProps {
  notifications?: DriverNotificationItem[];
  onDismiss?: (id: string) => void;
}

export const DriverNotificationsCard: React.FC<DriverNotificationsCardProps> = ({
  notifications = [],
  onDismiss
}) => {
  return (
    <section
      aria-label="Driver Operational Notifications"
      className="bg-white rounded-2xl border border-gray-200 p-5 shadow-2xs space-y-3.5"
    >
      <div className="flex items-center justify-between pb-1 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-gray-700" />
          <h3 className="text-sm font-bold text-gray-900 tracking-tight">
            Notifications & Alerts
          </h3>
        </div>
        <span className="text-[11px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
          {notifications.length} Active
        </span>
      </div>

      <div className="space-y-2.5">
        {notifications.length === 0 ? (
          <div className="p-4 text-center rounded-xl bg-gray-50 border border-gray-100 text-xs text-gray-500">
            No new operational alerts at this time.
          </div>
        ) : (
          notifications.map((n) => {
          const config = {
            info: {
              icon: Radio,
              iconColor: 'text-blue-600',
              bg: 'bg-blue-50/60 border-blue-200',
              titleColor: 'text-blue-950'
            },
            warning: {
              icon: AlertCircle,
              iconColor: 'text-amber-600',
              bg: 'bg-amber-50/60 border-amber-200',
              titleColor: 'text-amber-950'
            },
            success: {
              icon: CheckCircle2,
              iconColor: 'text-emerald-600',
              bg: 'bg-emerald-50/60 border-emerald-200',
              titleColor: 'text-emerald-950'
            },
            alert: {
              icon: AlertCircle,
              iconColor: 'text-rose-600',
              bg: 'bg-rose-50/60 border-rose-200',
              titleColor: 'text-rose-950'
            }
          }[n.severity];

          const Icon = config.icon;

          return (
            <div
              key={n.id}
              className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${config.bg}`}
            >
              <Icon className={`w-4 h-4 ${config.iconColor} shrink-0 mt-0.5`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <strong className={`block truncate ${config.titleColor}`}>
                    {n.title}
                  </strong>
                  <span className="text-[10px] text-gray-400 shrink-0 ml-2">
                    {n.time}
                  </span>
                </div>
                <p className="text-[11px] text-gray-600 leading-snug mt-0.5">
                  {n.message}
                </p>
              </div>
            </div>
          );
        }))}
      </div>
    </section>
  );
};
