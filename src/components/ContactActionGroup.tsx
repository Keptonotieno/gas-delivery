import React, { useState } from 'react';
import { Phone, MessageSquare, ExternalLink, MessageCircle, Copy, Check, X } from 'lucide-react';
import { getTelLink, getWhatsAppLink, getSmsLink, formatPhoneDisplay } from '../utils/phoneUtils';

interface ContactActionGroupProps {
  phone: string;
  name: string;
  role?: string;
  orderId?: string;
  cylinderSummary?: string;
  defaultMessage?: string;
  variant?: 'buttons' | 'dropdown' | 'compact' | 'modal-only';
  className?: string;
  isOpen?: boolean;
  onClose?: () => void;
}

export const ContactModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  phone: string;
  name: string;
  role?: string;
  orderId?: string;
  cylinderSummary?: string;
  customMessage?: string;
}> = ({ isOpen, onClose, phone, name, role = 'Contact', orderId, cylinderSummary, customMessage }) => {
  const [copied, setCopied] = useState(false);
  const [msgDraft, setMsgDraft] = useState(() => {
    if (customMessage) return customMessage;
    const orderInfo = orderId ? ` regarding Order #${orderId}` : '';
    const cylInfo = cylinderSummary ? ` (${cylinderSummary})` : '';
    return `Jambo ${name}! This is GasDeliver${orderInfo}${cylInfo}. Please confirm your status.`;
  });

  if (!isOpen) return null;

  const telLink = getTelLink(phone);
  const waLink = getWhatsAppLink(phone, msgDraft);
  const smsLink = getSmsLink(phone, msgDraft);
  const displayPhone = formatPhoneDisplay(phone);

  const handleCopy = () => {
    navigator.clipboard.writeText(phone);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-2xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 animate-in zoom-in-95 text-left">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-full bg-[#FFF5EE] text-[#E04F11] flex items-center justify-center font-bold text-sm">
              <Phone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-base">Contact {name}</h3>
              <p className="text-xs text-gray-500 font-medium">
                {role} · <span className="font-mono text-gray-700">{displayPhone}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message preview editor */}
        <div className="mt-4">
          <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
            Pre-filled Text Message (WhatsApp & SMS)
          </label>
          <textarea
            rows={2}
            value={msgDraft}
            onChange={(e) => setMsgDraft(e.target.value)}
            className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#E04F11] focus:bg-white resize-none"
            placeholder="Type your message..."
          />
        </div>

        {/* Direct Action Cards */}
        <div className="mt-4 space-y-2.5">
          {/* Direct Phone Call */}
          <a
            href={telLink}
            onClick={() => setTimeout(onClose, 500)}
            className="flex items-center justify-between p-3.5 rounded-xl border border-blue-200 bg-blue-50/70 hover:bg-blue-100/70 transition-all text-blue-900 group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Phone className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-xs flex items-center gap-1.5">
                  <span>Call directly in Phone App</span>
                  <ExternalLink className="w-3 h-3 text-blue-500 opacity-70 group-hover:opacity-100" />
                </div>
                <div className="text-[11px] text-blue-700 mt-0.5">
                  Opens default phone dialer ({displayPhone})
                </div>
              </div>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 bg-blue-600 text-white rounded-lg group-hover:bg-blue-700 transition-colors">
              Call Now
            </span>
          </a>

          {/* WhatsApp Direct Chat & Voice */}
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setTimeout(onClose, 500)}
            className="flex items-center justify-between p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100/70 transition-all text-emerald-900 group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#25D366] text-white flex items-center justify-center shrink-0 shadow-xs">
                <MessageCircle className="w-5 h-5 fill-white" />
              </div>
              <div>
                <div className="font-bold text-xs flex items-center gap-1.5">
                  <span>Chat & Call via WhatsApp</span>
                  <ExternalLink className="w-3 h-3 text-emerald-600 opacity-70 group-hover:opacity-100" />
                </div>
                <div className="text-[11px] text-emerald-700 mt-0.5">
                  Opens WhatsApp app with instant message
                </div>
              </div>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 bg-[#25D366] hover:bg-[#1EBE5D] text-white rounded-lg transition-colors">
              WhatsApp
            </span>
          </a>

          {/* Direct SMS Messaging */}
          <a
            href={smsLink}
            onClick={() => setTimeout(onClose, 500)}
            className="flex items-center justify-between p-3.5 rounded-xl border border-purple-200 bg-purple-50/70 hover:bg-purple-100/70 transition-all text-purple-900 group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-xs flex items-center gap-1.5">
                  <span>Text in SMS Messaging App</span>
                  <ExternalLink className="w-3 h-3 text-purple-500 opacity-70 group-hover:opacity-100" />
                </div>
                <div className="text-[11px] text-purple-700 mt-0.5">
                  Opens standard messaging app on mobile or desktop
                </div>
              </div>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors">
              Send SMS
            </span>
          </a>
        </div>

        {/* Copy Phone Number helper */}
        <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
          <span className="font-mono text-[11px]">{phone}</span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold cursor-pointer transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700 text-[11px]">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-gray-500" />
                <span className="text-[11px]">Copy Number</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export const ContactActionGroup: React.FC<ContactActionGroupProps> = ({
  phone,
  name,
  role = 'Driver',
  orderId,
  cylinderSummary,
  defaultMessage,
  variant = 'buttons',
  className = ''
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const telLink = getTelLink(phone);
  const waLink = getWhatsAppLink(
    phone,
    defaultMessage || `Jambo ${name}! Regarding GasDeliver order${orderId ? ` #${orderId}` : ''}${cylinderSummary ? ` (${cylinderSummary})` : ''}.`
  );

  if (variant === 'compact') {
    return (
      <>
        <div className={`inline-flex items-center gap-1.5 ${className}`}>
          <a
            href={telLink}
            title={`Direct Phone Call to ${name} (${phone})`}
            className="p-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors"
          >
            <Phone className="w-3.5 h-3.5" />
          </a>
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            title={`WhatsApp ${name}`}
            className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors"
          >
            <MessageCircle className="w-3.5 h-3.5 fill-emerald-600" />
          </a>
          <button
            onClick={() => setIsModalOpen(true)}
            title="More call and text options"
            className="p-1.5 rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200 transition-colors cursor-pointer"
          >
            <MessageSquare className="w-3.5 h-3.5" />
          </button>
        </div>

        <ContactModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          phone={phone}
          name={name}
          role={role}
          orderId={orderId}
          cylinderSummary={cylinderSummary}
          customMessage={defaultMessage}
        />
      </>
    );
  }

  // Full dual-action buttons
  return (
    <>
      <div className={`grid grid-cols-2 gap-2.5 ${className}`}>
        {/* Direct Call Button (opens Phone or modal) */}
        <div className="relative flex rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors shadow-2xs overflow-hidden">
          <a
            href={telLink}
            className="flex-1 py-2.5 px-3 font-semibold text-xs text-gray-800 flex items-center justify-center gap-1.5 hover:text-blue-700 transition-colors"
          >
            <Phone className="w-4 h-4 text-blue-600" />
            <span>Call</span>
          </a>
          <button
            onClick={() => setIsModalOpen(true)}
            title="Phone & WhatsApp Call Options"
            className="px-2 border-l border-gray-200 text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer text-xs"
          >
            ▼
          </button>
        </div>

        {/* Direct WhatsApp / SMS Button */}
        <div className="relative flex rounded-xl border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100/50 transition-colors shadow-2xs overflow-hidden">
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 py-2.5 px-3 font-semibold text-xs text-emerald-800 flex items-center justify-center gap-1.5 hover:text-emerald-900 transition-colors"
          >
            <MessageCircle className="w-4 h-4 fill-[#25D366] text-[#25D366]" />
            <span>WhatsApp / SMS</span>
          </a>
          <button
            onClick={() => setIsModalOpen(true)}
            title="All Message Options"
            className="px-2 border-l border-emerald-200 text-emerald-600 hover:text-emerald-900 hover:bg-emerald-200/50 transition-colors cursor-pointer text-xs"
          >
            ▼
          </button>
        </div>
      </div>

      <ContactModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        phone={phone}
        name={name}
        role={role}
        orderId={orderId}
        cylinderSummary={cylinderSummary}
        customMessage={defaultMessage}
      />
    </>
  );
};
