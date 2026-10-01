import React, { useState, useRef, useEffect } from 'react';
import { Order } from '../../types';
import { Camera, CheckCircle2, RotateCcw, AlertCircle, X, ShieldCheck } from 'lucide-react';

interface ProofOfDeliveryModalProps {
  order: Order;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (proofData: {
    deliveredQuantity: number;
    cylinderExchangeCount: number;
    deliveryNotes: string;
    photoUrl?: string;
    signatureName?: string;
    signatureUrl?: string;
  }) => Promise<void>;
  isSubmitting: boolean;
  errorMessage?: string | null;
}

export const ProofOfDeliveryModal: React.FC<ProofOfDeliveryModalProps> = ({
  order,
  isOpen,
  onClose,
  onConfirm,
  isSubmitting,
  errorMessage
}) => {
  const initialQty = order.items?.reduce((sum, it) => sum + (it.quantity || 1), 0) || 1;
  const [deliveredQuantity, setDeliveredQuantity] = useState<number>(initialQty);
  const [cylinderExchangeCount, setCylinderExchangeCount] = useState<number>(initialQty);
  const [deliveryNotes, setDeliveryNotes] = useState<string>('Delivered to customer. Cylinder inspected and leak-tested.');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [signedName, setSignedName] = useState<string>(order.customerName || '');
  const [hasSignature, setHasSignature] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setDeliveredQuantity(initialQty);
      setCylinderExchangeCount(initialQty);
      setSignedName(order.customerName || '');
      setHasSignature(false);
      setPhotoPreview(null);
    }
  }, [isOpen, initialQty, order.customerName]);

  if (!isOpen) return null;

  // Signature canvas handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    setHasSignature(true);
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let signatureUrl: string | undefined;
    if (canvasRef.current && hasSignature) {
      signatureUrl = canvasRef.current.toDataURL('image/png');
    }

    await onConfirm({
      deliveredQuantity,
      cylinderExchangeCount,
      deliveryNotes: deliveryNotes.trim() || 'Delivered to customer',
      photoUrl: photoPreview || undefined,
      signatureName: signedName.trim() || order.customerName,
      signatureUrl
    });
  };

  const quickNotes = [
    'Direct handoff to customer',
    'Installed and safety-tested',
    'Empty cylinder collected',
    'Gate/security delivery'
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-xl shadow-2xl border border-gray-200 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <h3 className="font-bold text-gray-900 text-base">Proof of Delivery</h3>
            </div>
            <p className="text-xs text-gray-500 font-mono mt-0.5">Order #{order.id} · {order.customerName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-200 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-5 space-y-4 text-left">
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 1. Cylinder Quantity Verification */}
          <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200">
            <label className="block text-xs font-bold text-gray-900 uppercase tracking-wide mb-2">
              1. Confirm Delivered Cylinders
            </label>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-medium text-gray-800">{order.cylinderSummary}</p>
                <p className="text-[11px] text-gray-500">Scheduled: {initialQty} cylinder(s)</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDeliveredQuantity((q) => Math.max(1, q - 1))}
                  className="w-9 h-9 rounded-lg bg-white border border-gray-300 font-bold text-gray-700 hover:bg-gray-100 flex items-center justify-center text-base cursor-pointer"
                >
                  -
                </button>
                <span className="w-8 text-center font-mono font-bold text-sm text-gray-900">
                  {deliveredQuantity}
                </span>
                <button
                  type="button"
                  onClick={() => setDeliveredQuantity((q) => q + 1)}
                  className="w-9 h-9 rounded-lg bg-white border border-gray-300 font-bold text-gray-700 hover:bg-gray-100 flex items-center justify-center text-base cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>

            {/* Empty Return Count */}
            <div className="mt-3 pt-3 border-t border-gray-200 flex items-center justify-between text-xs">
              <span className="text-gray-600">Empty cylinders collected (exchange):</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCylinderExchangeCount((c) => Math.max(0, c - 1))}
                  className="w-7 h-7 rounded bg-white border border-gray-300 font-bold text-gray-700 hover:bg-gray-100 flex items-center justify-center text-xs cursor-pointer"
                >
                  -
                </button>
                <span className="font-mono font-bold text-gray-900 w-6 text-center">{cylinderExchangeCount}</span>
                <button
                  type="button"
                  onClick={() => setCylinderExchangeCount((c) => c + 1)}
                  className="w-7 h-7 rounded bg-white border border-gray-300 font-bold text-gray-700 hover:bg-gray-100 flex items-center justify-center text-xs cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* 2. Photo of Delivered Cylinder */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-gray-900 uppercase tracking-wide">
                2. Cylinder Photo Verification
              </label>
              <span className="text-[11px] text-gray-500">Camera or file</span>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhotoCapture}
              className="hidden"
            />

            {photoPreview ? (
              <div className="relative rounded-xl overflow-hidden border border-emerald-300 bg-emerald-50 p-3 text-center">
                <img
                  src={photoPreview}
                  alt="Proof of Delivery"
                  className="h-32 w-full object-cover rounded-lg mb-2"
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-emerald-800 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Photo Attached
                  </span>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs text-gray-600 hover:text-gray-900 underline font-medium cursor-pointer"
                  >
                    Retake
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-4 border-2 border-dashed border-gray-300 hover:border-[#E04F11] rounded-xl flex flex-col items-center justify-center gap-1 text-gray-600 hover:text-[#E04F11] bg-gray-50/70 hover:bg-[#FFF5EE]/30 cursor-pointer transition-colors"
              >
                <Camera className="w-5 h-5 text-gray-500" />
                <span className="text-xs font-semibold">Tap to capture or upload cylinder photo</span>
                <span className="text-[10px] text-gray-400">Shows cylinder at customer premises</span>
              </button>
            )}
          </div>

          {/* 3. Delivery Notes */}
          <div>
            <label className="block text-xs font-bold text-gray-900 uppercase tracking-wide mb-1.5">
              3. Delivery Notes
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {quickNotes.map((note) => (
                <button
                  key={note}
                  type="button"
                  onClick={() => setDeliveryNotes((prev) => (prev ? `${prev} · ${note}` : note))}
                  className="px-2.5 py-1 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 text-[11px] font-medium transition-colors cursor-pointer"
                >
                  + {note}
                </button>
              ))}
            </div>
            <textarea
              value={deliveryNotes}
              onChange={(e) => setDeliveryNotes(e.target.value)}
              rows={2}
              placeholder="e.g. Delivered to 2nd floor, tested safety regulator..."
              className="w-full p-2.5 rounded-lg border border-gray-300 text-xs text-gray-900 focus:ring-2 focus:ring-[#E04F11] focus:outline-none"
            />
          </div>

          {/* 4. Customer Signature Pad */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-gray-900 uppercase tracking-wide">
                4. Customer Sign-off
              </label>
              {hasSignature && (
                <button
                  type="button"
                  onClick={clearSignature}
                  className="text-xs text-gray-500 hover:text-red-600 flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" /> Clear
                </button>
              )}
            </div>

            <div className="border border-gray-300 rounded-xl bg-white overflow-hidden touch-none relative">
              <canvas
                ref={canvasRef}
                width={380}
                height={110}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="w-full h-24 cursor-crosshair bg-gray-50/50"
              />
              {!hasSignature && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-gray-400 text-xs">
                  Sign with finger or stylus here
                </div>
              )}
            </div>

            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs text-gray-500 shrink-0">Signee Name:</span>
              <input
                type="text"
                value={signedName}
                onChange={(e) => setSignedName(e.target.value)}
                placeholder="Name of person receiving"
                className="flex-1 px-2.5 py-1.5 text-xs rounded-md border border-gray-300 text-gray-900 focus:ring-1 focus:ring-[#E04F11] focus:outline-none"
              />
            </div>
          </div>

          {/* Submit Action Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Validating Delivery...' : 'Confirm & Complete Delivery'}</span>
            </button>
            <p className="text-[11px] text-gray-400 text-center mt-1.5 flex items-center justify-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              Validated by GasDeliver dispatch backend
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};
