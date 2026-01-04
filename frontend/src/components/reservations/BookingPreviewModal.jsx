import { useState, useRef, useMemo } from 'react';
import { X, Download, Camera } from 'lucide-react';
import { Button } from '../ui/Button';
import { toPng } from 'html-to-image';
import { differenceInDays, parseISO, addDays, isWeekend, isFriday, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import clipboardLogo from '../../../images/clipboard.svg';

// Brazilian National Holidays (fixed dates and Easter-based)
const getBrazilianHolidays = (year) => {
  const holidays = [
    { date: `${year}-01-01`, name: 'Ano Novo' },
    { date: `${year}-04-21`, name: 'Tiradentes' },
    { date: `${year}-05-01`, name: 'Dia do Trabalho' },
    { date: `${year}-09-07`, name: 'Independência do Brasil' },
    { date: `${year}-10-12`, name: 'Nossa Senhora Aparecida' },
    { date: `${year}-11-02`, name: 'Finados' },
    { date: `${year}-11-15`, name: 'Proclamação da República' },
    { date: `${year}-12-25`, name: 'Natal' },
  ];
  
  const easter = calculateEaster(year);
  const easterDate = new Date(year, easter.month - 1, easter.day);
  
  const carnival = addDays(easterDate, -47);
  holidays.push({ date: format(carnival, 'yyyy-MM-dd'), name: 'Carnaval' });
  
  const goodFriday = addDays(easterDate, -2);
  holidays.push({ date: format(goodFriday, 'yyyy-MM-dd'), name: 'Sexta-feira Santa' });
  
  const corpusChristi = addDays(easterDate, 60);
  holidays.push({ date: format(corpusChristi, 'yyyy-MM-dd'), name: 'Corpus Christi' });
  
  return holidays;
};

const calculateEaster = (year) => {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return { month, day };
};

/**
 * BookingPreviewModal Component
 * 
 * Modal for generating a booking preview/simulation without client info.
 * Shows reservation details and can export as image.
 */
export function BookingPreviewModal({ 
  isOpen, 
  onClose, 
  prefilledData = {},
  units = []
}) {
  const previewRef = useRef(null);
  const [guestCount, setGuestCount] = useState({ adults: 2, children: 0 });
  const [isGenerating, setIsGenerating] = useState(false);

  // Get selected unit
  const selectedUnit = useMemo(() => {
    return units.find(u => u.id === prefilledData.unit_id) || null;
  }, [units, prefilledData.unit_id]);

  // Helper to check if a date is a Brazilian holiday
  const isHoliday = useMemo(() => {
    const holidayMap = {};
    const years = new Set();
    if (prefilledData.check_in) years.add(new Date(prefilledData.check_in).getFullYear());
    if (prefilledData.check_out) years.add(new Date(prefilledData.check_out).getFullYear());
    
    years.forEach(year => {
      getBrazilianHolidays(year).forEach(holiday => {
        holidayMap[holiday.date] = holiday.name;
      });
    });
    
    return (dateStr) => holidayMap[dateStr] || null;
  }, [prefilledData.check_in, prefilledData.check_out]);

  // Calculate price breakdown
  const priceBreakdown = useMemo(() => {
    if (!prefilledData.check_in || !prefilledData.check_out || !selectedUnit) {
      return { total: 0, nights: 0, avgPerNight: 0, breakdown: [] };
    }
    
    const checkIn = parseISO(prefilledData.check_in);
    const checkOut = parseISO(prefilledData.check_out);
    const nights = differenceInDays(checkOut, checkIn);
    
    if (nights <= 0) return { total: 0, nights: 0, avgPerNight: 0, breakdown: [] };
    
    let total = 0;
    const breakdown = [];
    const priceTypes = {
      base: { count: 0, total: 0, price: parseFloat(selectedUnit.base_price) },
      weekend: { count: 0, total: 0, price: parseFloat(selectedUnit.weekend_price || selectedUnit.base_price) },
      holiday: { count: 0, total: 0, price: parseFloat(selectedUnit.holiday_price || selectedUnit.base_price) }
    };
    
    for (let i = 0; i < nights; i++) {
      const currentDate = addDays(checkIn, i);
      const dateStr = format(currentDate, 'yyyy-MM-dd');
      const holidayName = isHoliday(dateStr);
      
      let priceForNight = 0;
      let priceType = 'base';
      
      if (holidayName && selectedUnit.holiday_price) {
        priceForNight = parseFloat(selectedUnit.holiday_price);
        priceType = 'holiday';
      } else if ((isWeekend(currentDate) || isFriday(currentDate)) && selectedUnit.weekend_price) {
        priceForNight = parseFloat(selectedUnit.weekend_price);
        priceType = 'weekend';
      } else {
        priceForNight = parseFloat(selectedUnit.base_price || 0);
        priceType = 'base';
      }
      
      priceTypes[priceType].count++;
      priceTypes[priceType].total += priceForNight;
      total += priceForNight;
    }
    
    // Build breakdown array
    if (priceTypes.base.count > 0) {
      breakdown.push({
        name: 'Diária (dias úteis)',
        quantity: priceTypes.base.count,
        unitPrice: priceTypes.base.price,
        total: priceTypes.base.total
      });
    }
    if (priceTypes.weekend.count > 0) {
      breakdown.push({
        name: 'Diária (fim de semana)',
        quantity: priceTypes.weekend.count,
        unitPrice: priceTypes.weekend.price,
        total: priceTypes.weekend.total
      });
    }
    if (priceTypes.holiday.count > 0) {
      breakdown.push({
        name: 'Diária (feriado)',
        quantity: priceTypes.holiday.count,
        unitPrice: priceTypes.holiday.price,
        total: priceTypes.holiday.total
      });
    }
    
    return {
      total,
      nights,
      avgPerNight: nights > 0 ? total / nights : 0,
      breakdown
    };
  }, [prefilledData.check_in, prefilledData.check_out, selectedUnit, isHoliday]);

  // Handle image export
  const handleExportImage = async () => {
    if (!previewRef.current) return;
    
    setIsGenerating(true);
    try {
      const dataUrl = await toPng(previewRef.current, {
        quality: 1.0,
        backgroundColor: '#ffffff',
        pixelRatio: 2,
      });
      
      // Create download link
      const link = document.createElement('a');
      link.download = `consulta-${selectedUnit?.name || 'reserva'}-${format(new Date(), 'dd-MM-yyyy')}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('Error generating image:', error);
      alert('Erro ao gerar imagem. Tente novamente.');
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isOpen) return null;

  const checkInDate = prefilledData.check_in ? format(parseISO(prefilledData.check_in), 'dd/MM/yyyy', { locale: ptBR }) : '';
  const checkOutDate = prefilledData.check_out ? format(parseISO(prefilledData.check_out), 'dd/MM/yyyy', { locale: ptBR }) : '';
  const checkInTime = selectedUnit?.default_check_in_time?.substring(0, 5) || '14:00';
  const checkOutTime = selectedUnit?.default_check_out_time?.substring(0, 5) || '12:00';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b bg-primary-50">
          <h2 className="text-lg sm:text-xl font-semibold text-primary-800">
            Consulta de Reserva
          </h2>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleExportImage}
              disabled={isGenerating}
              size="sm"
              className="bg-accent-600 hover:bg-accent-700"
            >
              {isGenerating ? (
                'Gerando...'
              ) : (
                <>
                  <Camera className="w-4 h-4 mr-1" />
                  Exportar Imagem
                </>
              )}
            </Button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Guest Count Inputs */}
        <div className="p-4 border-b bg-gray-50">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Adultos:</label>
              <input
                type="number"
                min="1"
                max={selectedUnit?.max_capacity || 10}
                value={guestCount.adults}
                onChange={(e) => setGuestCount(prev => ({ ...prev, adults: parseInt(e.target.value) || 1 }))}
                className="w-16 px-2 py-1 border border-gray-300 rounded text-center"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Crianças:</label>
              <input
                type="number"
                min="0"
                max={selectedUnit?.max_capacity || 10}
                value={guestCount.children}
                onChange={(e) => setGuestCount(prev => ({ ...prev, children: parseInt(e.target.value) || 0 }))}
                className="w-16 px-2 py-1 border border-gray-300 rounded text-center"
              />
            </div>
          </div>
        </div>

        {/* Preview Content - This will be exported as image */}
        <div ref={previewRef} className="p-6 bg-white">
          {/* Logo and Title */}
          <div className="text-center mb-6">
            <img 
              src={clipboardLogo} 
              alt="Chalés Jasmim" 
              className="h-16 mx-auto mb-2"
            />
            <h3 className="text-2xl font-bold text-primary-700">Chalés Jasmim</h3>
            <p className="text-sm text-gray-500">Consulta de Reserva</p>
          </div>

          {/* Unit Info */}
          {selectedUnit && (
            <div className="mb-6">
              <h4 className="text-xl font-semibold text-primary-800 mb-2 border-b border-primary-200 pb-2">
                {selectedUnit.name}
              </h4>
              {selectedUnit.short_description && (
                <p className="text-gray-600 text-sm whitespace-pre-wrap">
                  {selectedUnit.short_description}
                </p>
              )}
            </div>
          )}

          {/* Dates and Times */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-primary-50 p-4 rounded-lg">
              <p className="text-xs text-primary-600 font-medium uppercase">Check-in</p>
              <p className="text-lg font-bold text-primary-800">{checkInDate}</p>
              <p className="text-sm text-primary-600">às {checkInTime}</p>
            </div>
            <div className="bg-secondary-50 p-4 rounded-lg">
              <p className="text-xs text-secondary-600 font-medium uppercase">Check-out</p>
              <p className="text-lg font-bold text-secondary-800">{checkOutDate}</p>
              <p className="text-sm text-secondary-600">às {checkOutTime}</p>
            </div>
          </div>

          {/* Booking Details */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 uppercase">Noites</p>
                <p className="text-xl font-bold text-gray-800">{priceBreakdown.nights}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">Hóspedes</p>
                <p className="text-xl font-bold text-gray-800">
                  {guestCount.adults} adulto(s){guestCount.children > 0 && `, ${guestCount.children} criança(s)`}
                </p>
              </div>
            </div>
          </div>

          {/* Price Breakdown */}
          <div className="mb-6">
            <h5 className="text-sm font-semibold text-gray-700 mb-3 uppercase">Discriminação de Valores</h5>
            <div className="space-y-2">
              {priceBreakdown.breakdown.map((item, index) => (
                <div key={index} className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">
                    {item.name} ({item.quantity}x R$ {item.unitPrice.toFixed(2)})
                  </span>
                  <span className="font-medium text-gray-800">R$ {item.total.toFixed(2)}</span>
                </div>
              ))}
              <div className="border-t pt-2 mt-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">Média por noite</span>
                  <span className="text-gray-600">R$ {priceBreakdown.avgPerNight.toFixed(2)}</span>
                </div>
              </div>
              <div className="border-t border-primary-300 pt-2 mt-2">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-primary-700">Total</span>
                  <span className="text-2xl font-bold text-primary-700">R$ {priceBreakdown.total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Photo Album Mosaic */}
          {selectedUnit?.album_photos && selectedUnit.album_photos.length > 0 && (
            <div className="mb-4">
              <h5 className="text-sm font-semibold text-gray-700 mb-3 uppercase">Fotos</h5>
              <div className="grid grid-cols-4 gap-2">
                {selectedUnit.album_photos.slice(0, 8).map((url, index) => (
                  <div key={index} className="aspect-square">
                    <img
                      src={url}
                      alt={`Foto ${index + 1}`}
                      className="w-full h-full object-cover rounded"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="text-center pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-400">
              Consulta gerada em {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </p>
            <p className="text-xs text-gray-400">
              Valores sujeitos a confirmação
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
