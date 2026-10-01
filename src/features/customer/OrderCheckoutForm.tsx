import React, { useState, useEffect } from 'react';
import { Product, PaymentMethod, GasBrand, CylinderOrderType } from '../../types';
import { 
  ArrowLeft, 
  Check, 
  AlertCircle, 
  ShieldCheck, 
  MapPin, 
  Zap, 
  Flame, 
  Building2, 
  Compass, 
  CheckCircle2,
  Clock
} from 'lucide-react';
import { PaymentMethodSelector } from './PaymentMethodSelector';
import { formatKSh } from '../../utils/format';
import { 
  GAS_BRANDS_CONFIG, 
  THIKA_HIGHWAY_ZONES, 
  getZoneById, 
  getBrandConfig 
} from '../../utils/thikaHighwayData';

interface OrderCheckoutFormProps {
  products: Product[];
  selectedProduct: Product;
  initialZoneId?: string;
  onBack: () => void;
  onSubmitOrder: (orderData: any) => Promise<void>;
}

export const OrderCheckoutForm: React.FC<OrderCheckoutFormProps> = ({
  products,
  selectedProduct,
  initialZoneId = 'zone-roysambu',
  onBack,
  onSubmitOrder
}) => {
  // Brand & Product Selection State
  const [selectedBrand, setSelectedBrand] = useState<GasBrand>(
    (selectedProduct?.brand as GasBrand) || 'TotalEnergies'
  );
  const [selectedOrderType, setSelectedOrderType] = useState<CylinderOrderType>(
    (selectedProduct?.orderType as CylinderOrderType) || 'refill'
  );
  const [selectedSize, setSelectedSize] = useState<string>(
    selectedProduct?.size || '6 kg'
  );
  const [currentProduct, setCurrentProduct] = useState<Product>(selectedProduct || products[0]);
  const [quantity, setQuantity] = useState<number>(1);

  // Thika Superhighway Location State
  const [selectedZoneId, setSelectedZoneId] = useState<string>(initialZoneId);
  const [street, setStreet] = useState('Lumumba Drive, Roysambu');
  const [estateOrBuilding, setEstateOrBuilding] = useState('Skyview Heights, Flat 4B');
  const [landmark, setLandmark] = useState('Behind TRM Mall, ring buzzer at black gate');
  const [city] = useState('Nairobi (Thika Superhighway)');
  const [zipCode] = useState('00100');

  // Delivery & Payment
  const [selectedSlot, setSelectedSlot] = useState('Express Thika Road (Within 30-40 min)');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('M-Pesa');
  const [mpesaPhone, setMpesaPhone] = useState('+254 712 345 678');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Active highway zone details
  const activeZone = getZoneById(selectedZoneId);
  const brandConfig = getBrandConfig(selectedBrand);

  // Match the best available product based on brand, size, and orderType
  useEffect(() => {
    const matched = products.find(
      (p) =>
        p.brand === selectedBrand &&
        p.size === selectedSize &&
        (p.orderType === selectedOrderType ||
          (selectedOrderType === 'refill'
            ? p.name.toLowerCase().includes('refill')
            : p.name.toLowerCase().includes('complete')))
    );

    if (matched) {
      setCurrentProduct(matched);
    } else {
      // Fallback: match by size & brand
      const fallbackBrand = products.find(
        (p) => p.brand === selectedBrand && p.size === selectedSize
      );
      if (fallbackBrand) {
        setCurrentProduct(fallbackBrand);
      } else {
        // Fallback by size
        const fallbackSize = products.find((p) => p.size === selectedSize) || products[0];
        if (fallbackSize) setCurrentProduct(fallbackSize);
      }
    }
  }, [selectedBrand, selectedSize, selectedOrderType, products]);

  // When zone changes, update sample estate suggestions if field is untouched
  const handleZoneChange = (zoneId: string) => {
    setSelectedZoneId(zoneId);
    const newZone = getZoneById(zoneId);
    if (newZone) {
      setStreet(newZone.name.split('/')[0].trim());
      if (newZone.popularEstates && newZone.popularEstates[0]) {
        setEstateOrBuilding(`${newZone.popularEstates[0]}, Court 1`);
      }
      if (newZone.landmarks && newZone.landmarks[0]) {
        setLandmark(`Near ${newZone.landmarks[0]}`);
      }
    }
  };

  const deliverySlots = [
    { time: 'Express Thika Road (Within 30-40 min)', status: 'Fastest', isExpress: true },
    { time: '8:00 AM – 11:00 AM', status: 'Available', isExpress: false },
    { time: '11:00 AM – 2:00 PM', status: 'Available', isExpress: false },
    { time: '2:00 PM – 5:00 PM', status: 'Available', isExpress: false },
    { time: '5:00 PM – 8:00 PM', status: 'Available', isExpress: false }
  ];

  const productPrice = currentProduct?.price ?? 1350;
  const subtotal = productPrice * (quantity || 1);
  const deliveryFee = activeZone.deliveryFee || 150;
  const total = subtotal + deliveryFee;

  const handlePhoneChange = (newPhone: string) => {
    setMpesaPhone(newPhone);
    if (phoneError) {
      setPhoneError(null);
    }
  };

  const validatePhone = (phone: string): boolean => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 10 && (digits.startsWith('07') || digits.startsWith('01'))) return true;
    if (digits.length === 12 && digits.startsWith('254') && (digits.startsWith('2547') || digits.startsWith('2541'))) return true;
    if (digits.length === 9 && (digits.startsWith('7') || digits.startsWith('1'))) return true;
    return false;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setPhoneError(null);

    // Validate phone number if M-Pesa is selected
    if (paymentMethod === 'M-Pesa') {
      if (!mpesaPhone.trim()) {
        setPhoneError('Safaricom phone number is required for M-Pesa prompt.');
        setError('Please enter a valid Safaricom phone number for M-Pesa.');
        return;
      }
      if (!validatePhone(mpesaPhone)) {
        setPhoneError('Please enter a valid Kenyan phone number (e.g., +254 712 345 678 or 0712 345 678).');
        setError('Invalid Safaricom phone number provided.');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const fullStreetAddress = `${street}${estateOrBuilding ? `, ${estateOrBuilding}` : ''} [${activeZone.exitNumber} - ${activeZone.name}]`;
      
      await onSubmitOrder({
        cylinderBrand: selectedBrand,
        cylinderOrderType: selectedOrderType,
        cylinderSize: selectedSize,
        thikaHighwayZone: activeZone.name,
        items: [
          {
            productId: currentProduct.id,
            productName: currentProduct.name,
            gasType: currentProduct.gasType,
            brand: selectedBrand,
            orderType: selectedOrderType,
            size: selectedSize,
            quantity,
            unitPrice: productPrice
          }
        ],
        deliveryAddress: {
          street: fullStreetAddress,
          city: 'Thika Superhighway Corridor',
          zipCode,
          landmark,
          thikaHighwayZone: activeZone.name,
          exitNumber: activeZone.exitNumber,
          estate: estateOrBuilding
        },
        deliverySlot: selectedSlot,
        deliveryFee,
        paymentMethod,
        mpesaPhone: paymentMethod === 'M-Pesa' ? mpesaPhone.trim() : undefined
      });
    } catch (err: any) {
      setError(err.message || 'Failed to submit order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 sm:p-8 shadow-xs">
      {/* Top Breadcrumb & Corridor Headline */}
      <div className="pb-5 border-b border-gray-100 mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 mb-3 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Catalog</span>
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FFF5EE] text-[#E04F11] border border-[#FEECE2]">
                <Zap className="w-3 h-3 text-[#E04F11]" />
                <span>Thika Superhighway Express Dispatch</span>
              </span>
              <span className="text-[11px] font-semibold text-gray-500">
                Pangani ↔ Roysambu ↔ KU ↔ Ruiru ↔ Juja ↔ Thika
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
              Order Gas Cylinder
            </h2>
          </div>

          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-xl text-xs">
            <MapPin className="w-4 h-4 text-[#E04F11] shrink-0" />
            <div className="leading-tight">
              <span className="font-bold text-gray-800 block text-[11px]">{activeZone.hubName}</span>
              <span className="text-gray-500 text-[10px]">ETA: {activeZone.estMinutes}</span>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* SECTION 1: SELECT GAS CYLINDER BRAND */}
        <div className="p-5 rounded-2xl bg-gray-50/70 border border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#E04F11] text-white text-xs flex items-center justify-center font-bold">
                1
              </span>
              <span>Select Gas Cylinder Brand</span>
            </h3>
            <span className="text-xs text-gray-500">
              Select the brand you own (for refill swap) or wish to buy
            </span>
          </div>

          {/* Brand Grid Selector */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 mb-5">
            {GAS_BRANDS_CONFIG.map((b) => {
              const isSelected = selectedBrand === b.id;
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setSelectedBrand(b.id)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative flex flex-col justify-between ${
                    isSelected
                      ? `border-2 bg-white shadow-sm ring-2 ring-offset-1`
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                  style={{
                    borderColor: isSelected ? b.color : undefined,
                    boxShadow: isSelected ? `0 0 0 1px ${b.color}` : undefined
                  }}
                >
                  <div className="flex items-start justify-between gap-1 mb-2">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: b.color }}
                      />
                      <span className="font-bold text-xs text-gray-900 truncate">{b.name.split('(')[0]}</span>
                    </div>
                    {isSelected && (
                      <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: b.color }} />
                    )}
                  </div>
                  <p className="text-[10px] text-gray-500 line-clamp-1">{b.badge}</p>
                </button>
              );
            })}
          </div>

          {/* Selected Brand Banner */}
          <div 
            className="p-3.5 rounded-xl border flex items-center justify-between gap-3 mb-5"
            style={{ 
              backgroundColor: `${brandConfig.color}08`,
              borderColor: `${brandConfig.color}30` 
            }}
          >
            <div className="flex items-center gap-3">
              <div 
                className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white shrink-0 text-xs shadow-xs"
                style={{ backgroundColor: brandConfig.color }}
              >
                <Flame className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-xs text-gray-900 block">{brandConfig.name}</span>
                <span className="text-[11px] text-gray-600">{brandConfig.tagline} · {brandConfig.valveType}</span>
              </div>
            </div>
            <span 
              className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border shrink-0 bg-white"
              style={{ color: brandConfig.color, borderColor: `${brandConfig.color}40` }}
            >
              100% Genuine Seal
            </span>
          </div>

          {/* Order Type (Refill vs Complete Kit) & Size Selection */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* Refill vs New Kit Toggle */}
            <div className="md:col-span-6">
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Service Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedOrderType('refill')}
                  className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                    selectedOrderType === 'refill'
                      ? 'border-[#E04F11] bg-[#FFF5EE] text-gray-900 ring-1 ring-[#E04F11]'
                      : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span className="font-bold text-xs block">🔄 Refill Exchange</span>
                  <span className="text-[10px] text-gray-500">I have an empty cylinder to swap</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedOrderType('complete_kit')}
                  className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                    selectedOrderType === 'complete_kit'
                      ? 'border-[#E04F11] bg-[#FFF5EE] text-gray-900 ring-1 ring-[#E04F11]'
                      : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span className="font-bold text-xs block">📦 New Complete Set</span>
                  <span className="text-[10px] text-gray-500">Cylinder + Gas + Burner/Hose</span>
                </button>
              </div>
            </div>

            {/* Cylinder Size (6kg, 13kg, 50kg) */}
            <div className="md:col-span-3">
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Cylinder Size
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { size: '6 kg', tag: 'Compact', color: '#1E40AF' },
                  { size: '13 kg', tag: 'Most Popular', color: '#E04F11' },
                  { size: '50 kg', tag: 'Commercial', color: '#EAB308' },
                ].map((item) => (
                  <button
                    key={item.size}
                    type="button"
                    onClick={() => setSelectedSize(item.size)}
                    className={`py-1.5 px-1 rounded-lg border text-center font-bold text-xs cursor-pointer transition-all flex flex-col items-center justify-center gap-0.5 ${
                      selectedSize === item.size
                        ? 'border-[#E04F11] bg-[#E04F11] text-white shadow-xs'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <span 
                        className="w-2 h-2 rounded-full shrink-0 ring-1 ring-white/30" 
                        style={{ backgroundColor: item.color }} 
                      />
                      <span>{item.size}</span>
                    </span>
                    <span className={`text-[9px] font-medium leading-none ${selectedSize === item.size ? 'text-white/85' : 'text-gray-500'}`}>
                      {item.tag}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Quantity */}
            <div className="md:col-span-3">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-gray-700">Quantity</label>
                <span className="text-[11px] text-gray-400">Max 3</span>
              </div>
              <div className="flex items-center border border-gray-300 rounded-xl overflow-hidden bg-white">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-10 py-2 text-gray-600 hover:bg-gray-100 font-bold text-sm cursor-pointer"
                >
                  -
                </button>
                <span className="flex-1 text-center font-bold text-sm text-gray-900">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity(Math.min(3, quantity + 1))}
                  className="w-10 py-2 text-gray-600 hover:bg-gray-100 font-bold text-sm cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: SELECT PLACE ALONG THIKA SUPERHIGHWAY */}
        <div className="p-5 rounded-2xl bg-white border border-[#E04F11]/30 ring-4 ring-[#FFF5EE]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#E04F11] text-white text-xs flex items-center justify-center font-bold">
                2
              </span>
              <span>Your Place on Thika Superhighway</span>
            </h3>
            <span className="text-xs font-bold text-[#E04F11] flex items-center gap-1">
              <Zap className="w-3.5 h-3.5" />
              Express Corridor Dispatch
            </span>
          </div>

          <div className="space-y-4">
            {/* Superhighway Zone Dropdown / Quick Picker */}
            <div>
              <label className="block text-xs font-bold text-gray-800 mb-1.5 flex items-center justify-between">
                <span>Select Your Thika Superhighway Exit / Neighborhood</span>
                <span className="text-[11px] font-normal text-gray-500">14 Corridor Hubs Active</span>
              </label>
              <select
                value={selectedZoneId}
                onChange={(e) => handleZoneChange(e.target.value)}
                className="w-full px-3.5 py-3 rounded-xl border border-gray-300 text-sm font-semibold text-gray-900 bg-white focus:ring-2 focus:ring-[#E04F11] focus:outline-none"
              >
                {THIKA_HIGHWAY_ZONES.map((zone) => (
                  <option key={zone.id} value={zone.id}>
                    {zone.exitNumber} — {zone.name} (Hub: {zone.hubName.split('(')[0].trim()} · {zone.estMinutes})
                  </option>
                ))}
              </select>
            </div>

            {/* Zone Highlight Card with ETA and Dispatch Point */}
            <div className="p-4 rounded-xl bg-[#FFF8F5] border border-[#FEECE2] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <Compass className="w-5 h-5 text-[#E04F11] shrink-0 mt-0.5" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-gray-900">{activeZone.name}</span>
                    <span className="text-[10px] font-bold bg-[#E04F11] text-white px-2 py-0.5 rounded-full">
                      {activeZone.exitNumber}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Dispatched from: <strong className="text-gray-900">{activeZone.hubName}</strong>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-orange-100">
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">Est. Delivery</span>
                  <span className="text-xs font-extrabold text-emerald-700 flex items-center gap-1 justify-end">
                    <Clock className="w-3 h-3" />
                    {activeZone.estMinutes}
                  </span>
                </div>
                <div className="text-right pl-3 border-l border-orange-200">
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">Delivery Fee</span>
                  <span className="text-xs font-extrabold text-gray-900">
                    {formatKSh(activeZone.deliveryFee)}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Landmark Suggestions for this zone */}
            {activeZone.landmarks && activeZone.landmarks.length > 0 && (
              <div>
                <span className="text-[11px] font-semibold text-gray-500 block mb-1.5">
                  Popular landmarks in this zone (click to add):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {activeZone.landmarks.map((lm) => (
                    <button
                      key={lm}
                      type="button"
                      onClick={() => {
                        if (!landmark.includes(lm)) {
                          setLandmark(landmark ? `${landmark}, near ${lm}` : `Near ${lm}`);
                        }
                      }}
                      className="px-2.5 py-1 bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-lg text-xs font-medium cursor-pointer transition-colors"
                    >
                      + {lm}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Street & Estate / Building Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Street / Road along Highway
                </label>
                <input
                  type="text"
                  required
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  placeholder="e.g. Lumumba Drive, Wendani Road, JKUAT Main Gate Rd"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-[#E04F11] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Apartment / Court / Estate / House No.
                </label>
                <input
                  type="text"
                  required
                  value={estateOrBuilding}
                  onChange={(e) => setEstateOrBuilding(e.target.value)}
                  placeholder="e.g. Galana Court, Door 3B, 2nd Floor"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-[#E04F11] focus:outline-none"
                />
              </div>
            </div>

            {/* Landmarks / Delivery Instructions */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Landmarks & Gate Directions (Helps rider locate you faster)
              </label>
              <input
                type="text"
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
                placeholder="e.g. Opposite Naivas, behind TRM, black gate, call on arrival"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-[#E04F11] focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* SECTION 3: DELIVERY TIME SLOT */}
        <div>
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-[#E04F11] text-white text-xs flex items-center justify-center font-bold">
              3
            </span>
            <span>Delivery Time Slot</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {deliverySlots.map((slot) => {
              const isSelected = selectedSlot === slot.time;
              return (
                <div
                  key={slot.time}
                  onClick={() => setSelectedSlot(slot.time)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer select-none flex flex-col justify-between ${
                    isSelected
                      ? 'border-[#E04F11] bg-[#FFF5EE] ring-2 ring-[#E04F11]/20'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-gray-900">{slot.time}</span>
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        isSelected
                          ? 'border-[#E04F11] bg-[#E04F11] text-white'
                          : 'border-gray-300'
                      }`}
                    >
                      {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </div>
                  </div>
                  <span className={`text-[11px] font-semibold ${slot.isExpress ? 'text-[#E04F11] flex items-center gap-1' : 'text-emerald-600'}`}>
                    {slot.isExpress && <Zap className="w-3 h-3" />}
                    ● {slot.status}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* SECTION 4: PAYMENT METHOD (M-Pesa & Cash on Delivery) */}
        <PaymentMethodSelector
          selectedMethod={paymentMethod}
          onSelectMethod={(method) => {
            setPaymentMethod(method);
            setPhoneError(null);
          }}
          mpesaPhone={mpesaPhone}
          onMpesaPhoneChange={handlePhoneChange}
          phoneError={phoneError}
          totalAmount={total}
        />

        {/* ORDER SUMMARY */}
        <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">
            Order Summary · Thika Superhighway Delivery
          </h4>
          <div className="space-y-2 text-sm text-gray-600 pb-3 border-b border-gray-200">
            <div className="flex justify-between">
              <span>
                <strong className="text-gray-900">{selectedBrand}</strong> {selectedSize} ({selectedOrderType === 'refill' ? 'Refill' : 'Complete Kit'}) x {quantity}
              </span>
              <span className="font-semibold text-gray-900">{formatKSh(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <div>
                <span>Corridor Delivery ({activeZone.name.split('/')[0]})</span>
                <span className="block text-[11px] text-gray-400">{activeZone.hubName}</span>
              </div>
              <span className="font-semibold text-gray-900">{formatKSh(deliveryFee)}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-emerald-700 pt-1">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              <span>Free safety seal verification, soap bubble leak test & burner installation by certified rider</span>
            </div>
          </div>

          <div className="flex justify-between items-center pt-3">
            <div>
              <span className="font-bold text-gray-900 text-base block">Total Payable</span>
              <span className="text-[11px] text-gray-500">Includes cylinder, delivery & safety check</span>
            </div>
            <span className="font-extrabold text-2xl text-[#E04F11]">
              {formatKSh(total)}
            </span>
          </div>
        </div>

        {/* ACTIONS */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={onBack}
            className="w-full sm:w-auto px-6 py-3 border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold rounded-xl text-sm transition-colors cursor-pointer"
          >
            Back to Catalog
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto px-8 py-3 bg-[#E04F11] hover:bg-[#C9420A] text-white font-bold rounded-xl text-sm transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75"
          >
            {isSubmitting ? (
              <span>Confirming Order...</span>
            ) : (
              <span>Confirm Order — {formatKSh(total)}</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
