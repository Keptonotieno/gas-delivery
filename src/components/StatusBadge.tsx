import React from 'react';
import { OrderStatus, Priority } from '../types';

interface StatusBadgeProps {
  status: OrderStatus;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'sm' }) => {
  const styles: Record<OrderStatus, { bg: string; text: string; border: string }> = {
    Pending: {
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      border: 'border-amber-200'
    },
    Preparing: {
      bg: 'bg-amber-50',
      text: 'text-amber-800',
      border: 'border-amber-300'
    },
    'Payment Pending': {
      bg: 'bg-yellow-50',
      text: 'text-yellow-800',
      border: 'border-yellow-300'
    },
    'Driver Assigned': {
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      border: 'border-blue-200'
    },
    Dispatched: {
      bg: 'bg-sky-50',
      text: 'text-sky-700',
      border: 'border-sky-200'
    },
    Assigned: {
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      border: 'border-blue-200'
    },
    Accepted: {
      bg: 'bg-indigo-50',
      text: 'text-indigo-700',
      border: 'border-indigo-200'
    },
    'En Route': {
      bg: 'bg-[#FFF5EE]',
      text: 'text-[#E04F11]',
      border: 'border-[#FEECE2]'
    },
    'Out for Delivery': {
      bg: 'bg-[#FFF5EE]',
      text: 'text-[#E04F11]',
      border: 'border-[#FEECE2]'
    },
    Arrived: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-800',
      border: 'border-emerald-300'
    },
    Delivered: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      border: 'border-emerald-200'
    },
    Cancelled: {
      bg: 'bg-gray-100',
      text: 'text-gray-600',
      border: 'border-gray-200'
    },
    Failed: {
      bg: 'bg-rose-50',
      text: 'text-rose-700',
      border: 'border-rose-200'
    },
    Archived: {
      bg: 'bg-gray-100',
      text: 'text-gray-500',
      border: 'border-gray-300'
    }
  };

  const current = styles[status] || styles.Pending;
  const padding = size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm';

  return (
    <span
      className={`inline-flex items-center font-semibold rounded-full border ${current.bg} ${current.text} ${current.border} ${padding}`}
    >
      {(status === 'Out for Delivery' || status === 'En Route') && (
        <span className="w-1.5 h-1.5 rounded-full bg-[#E04F11] mr-1.5 animate-pulse" />
      )}
      {status}
    </span>
  );
};

export const PriorityBadge: React.FC<{ priority: Priority }> = ({ priority }) => {
  const styles: Record<Priority, string> = {
    Urgent: 'bg-rose-50 text-rose-700 border-rose-200',
    High: 'bg-amber-50 text-amber-700 border-amber-200',
    Normal: 'bg-gray-50 text-gray-600 border-gray-200'
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${styles[priority]}`}
    >
      {priority}
    </span>
  );
};
