import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { X, User, Baby, PawPrint, Calendar, Clock, Download, Image, Copy } from 'lucide-react';
import { Button } from '../ui/Button';
import { differenceInDays, parseISO, addDays, isWeekend, isFriday, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import html2canvas from 'html2canvas';

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
 * InquiryModal Component
 * 
 * Modal dialog for creating reservation quotes/inquiries.
 * Does NOT save to the database - generates a shareable image instead.
 */
export function InquiryModal({ 
  isOpen, 
  onClose, 
  units = [],
  prefilledData = {},
}) {
  const [formData, setFormData] = useState({
    check_in_date: '',
    check_in_time: '14:00',
    check_out_date: '',
    check_out_time: '12:00',
    accommodation_unit: '',
    guest_count_adults: 1,
    guest_count_children: 0,
    pet_count: 0,
    total_price: '',
    price_breakdown: [],
  });
  
  const [generating, setGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [generatedImageUrl, setGeneratedImageUrl] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const initializedRef = useRef(false);
  const prefilledDataRef = useRef(prefilledData);
  const quoteTemplateRef = useRef(null);

  // Helper function to check if a date is a Brazilian holiday
  const isHoliday = useMemo(() => {
    const holidayMap = {};
    
    const years = new Set();
    if (formData.check_in_date) years.add(new Date(formData.check_in_date).getFullYear());
    if (formData.check_out_date) years.add(new Date(formData.check_out_date).getFullYear());
    
    years.forEach(year => {
      getBrazilianHolidays(year).forEach(holiday => {
        holidayMap[holiday.date] = holiday.name;
      });
    });
    
    return (dateStr) => holidayMap[dateStr] || null;
  }, [formData.check_in_date, formData.check_out_date]);

  // Calculate suggested price based on dates and unit pricing
  const calculateSuggestedPrice = useMemo(() => {
    if (!formData.check_in_date || !formData.check_out_date || !formData.accommodation_unit) {
      return 0;
    }
    
    const selectedUnit = units.find(u => u.id === parseInt(formData.accommodation_unit));
    if (!selectedUnit) return 0;
    
    let total = 0;
    const checkIn = parseISO(formData.check_in_date);
    const checkOut = parseISO(formData.check_out_date);
    const nights = differenceInDays(checkOut, checkIn);
    
    for (let i = 0; i < nights; i++) {
      const currentDate = addDays(checkIn, i);
      const dateStr = format(currentDate, 'yyyy-MM-dd');
      const holidayName = isHoliday(dateStr);
      
      let priceForNight = 0;
      
      if (holidayName && selectedUnit.holiday_price) {
        priceForNight = parseFloat(selectedUnit.holiday_price);
      }
      else if ((isWeekend(currentDate) || isFriday(currentDate)) && selectedUnit.weekend_price) {
        priceForNight = parseFloat(selectedUnit.weekend_price);
      }
      else {
        priceForNight = parseFloat(selectedUnit.base_price || 0);
      }
      
      total += priceForNight;
    }
    
    return total;
  }, [formData.check_in_date, formData.check_out_date, formData.accommodation_unit, units, isHoliday]);

  // Initialize form data when modal opens
  useEffect(() => {
    if (isOpen && !initializedRef.current) {
      initializedRef.current = true;
      prefilledDataRef.current = prefilledData;
      
      let defaultCheckInTime = '14:00';
      let defaultCheckOutTime = '12:00';
      
      if (prefilledDataRef.current.unit_id) {
        const selectedUnit = units.find(u => u.id === prefilledDataRef.current.unit_id);
        if (selectedUnit) {
          defaultCheckInTime = selectedUnit.default_check_in_time?.substring(0, 5) || '14:00';
          defaultCheckOutTime = selectedUnit.default_check_out_time?.substring(0, 5) || '12:00';
        }
      }
      
      setFormData({
        check_in_date: prefilledDataRef.current.check_in || '',
        check_in_time: defaultCheckInTime,
        check_out_date: prefilledDataRef.current.check_out || '',
        check_out_time: defaultCheckOutTime,
        accommodation_unit: prefilledDataRef.current.unit_id || '',
        guest_count_adults: 1,
        guest_count_children: 0,
        pet_count: 0,
        total_price: '',
        price_breakdown: [],
      });
      setErrorMessage(''); // Clear any previous error
    } else if (!isOpen) {
      initializedRef.current = false;
    }
  }, [isOpen, prefilledData, units]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'accommodation_unit' && value) {
      const selectedUnit = units.find(u => u.id === parseInt(value));
      if (selectedUnit) {
        setFormData(prev => ({
          ...prev,
          [name]: value,
          check_in_time: selectedUnit.default_check_in_time?.substring(0, 5) || prev.check_in_time,
          check_out_time: selectedUnit.default_check_out_time?.substring(0, 5) || prev.check_out_time,
        }));
        return;
      }
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const addBreakdownItem = () => {
    setFormData(prev => ({
      ...prev,
      price_breakdown: [...prev.price_breakdown, { name: '', value: '', quantity: 1 }]
    }));
  };

  const removeBreakdownItem = (index) => {
    setFormData(prev => ({
      ...prev,
      price_breakdown: prev.price_breakdown.filter((_, i) => i !== index)
    }));
  };

  const updateBreakdownItem = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      price_breakdown: prev.price_breakdown.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const calculateBreakdownTotal = () => {
    return formData.price_breakdown.reduce((sum, item) => {
      const value = parseFloat(item.value) || 0;
      const quantity = parseFloat(item.quantity) || 1;
      return sum + (value * quantity);
    }, 0);
  };

  const handleInsertBreakdownTotal = () => {
    const total = calculateBreakdownTotal();
    setFormData(prev => ({
      ...prev,
      total_price: total.toFixed(2)
    }));
  };

  // Calculate total nights
  const calculateTotalNights = useMemo(() => {
    if (!formData.check_in_date || !formData.check_out_date) return 0;
    const checkIn = parseISO(formData.check_in_date);
    const checkOut = parseISO(formData.check_out_date);
    const nights = differenceInDays(checkOut, checkIn);
    return nights > 0 ? nights : 0;
  }, [formData.check_in_date, formData.check_out_date]);

  // Get selected unit data
  const selectedUnit = useMemo(() => {
    if (!formData.accommodation_unit) return null;
    return units.find(u => u.id === parseInt(formData.accommodation_unit));
  }, [formData.accommodation_unit, units]);

  // Calculate average per night
  const averagePerNight = useMemo(() => {
    const total = parseFloat(formData.total_price) || calculateSuggestedPrice;
    const nights = calculateTotalNights;
    if (nights <= 0 || total <= 0) return 0;
    return total / nights;
  }, [formData.total_price, calculateSuggestedPrice, calculateTotalNights]);

  // Get total value to display
  const displayTotal = useMemo(() => {
    return parseFloat(formData.total_price) || calculateSuggestedPrice;
  }, [formData.total_price, calculateSuggestedPrice]);

  // Check if has manual breakdown
  const hasManualBreakdown = useMemo(() => {
    return formData.price_breakdown.some(item => item.name && item.value);
  }, [formData.price_breakdown]);

  // Generate image from the quote template
  const handleGenerateImage = useCallback(async () => {
    if (!quoteTemplateRef.current) return;
    
    setGenerating(true);
    
    try {
      // Make the template visible for capture
      const templateEl = quoteTemplateRef.current;
      templateEl.style.position = 'fixed';
      templateEl.style.left = '-9999px';
      templateEl.style.top = '0';
      templateEl.style.display = 'block';
      templateEl.style.opacity = '1';
      templateEl.style.visibility = 'visible';
      
      // Wait for images to load
      const images = templateEl.querySelectorAll('img');
      await Promise.all(
        Array.from(images).map(
          (img) =>
            new Promise((resolve) => {
              if (img.complete) {
                resolve();
              } else {
                img.onload = resolve;
                img.onerror = resolve;
              }
            })
        )
      );
      
      // Generate canvas - let height be determined by content
      const canvas = await html2canvas(templateEl, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: 1080,
      });
      
      // Hide template again
      templateEl.style.display = 'none';
      
      // Store the generated image URL
      const imageUrl = canvas.toDataURL('image/png');
      setGeneratedImageUrl(imageUrl);
      setShowPreview(true);
    } catch (error) {
      console.error('Error generating image:', error);
      setErrorMessage('Erro ao gerar imagem. Tente novamente.');
      setTimeout(() => setErrorMessage(''), 5000); // Clear error after 5 seconds
    } finally {
      setGenerating(false);
    }
  }, []);
  
  // Close preview modal
  const handleClosePreview = useCallback(() => {
    setShowPreview(false);
    setGeneratedImageUrl(null);
  }, []);
  
  // Download generated image
  const handleDownloadImage = useCallback(() => {
    if (!generatedImageUrl) return;
    
    const link = document.createElement('a');
    const unitName = selectedUnit?.name || 'consulta';
    const dateStr = format(new Date(), 'dd-MM-yyyy');
    link.download = `${unitName.replace(/\s+/g, '-').toLowerCase()}-${dateStr}.png`;
    link.href = generatedImageUrl;
    link.click();
  }, [generatedImageUrl, selectedUnit]);
  
  // Copy image to clipboard
  const handleCopyToClipboard = useCallback(async () => {
    if (!generatedImageUrl) return;
    
    try {
      // Convert data URL to blob
      const response = await fetch(generatedImageUrl);
      const blob = await response.blob();
      
      // Copy to clipboard
      await navigator.clipboard.write([
        new ClipboardItem({
          'image/png': blob
        })
      ]);
      
      // Close preview after successful copy
      handleClosePreview();
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      setErrorMessage('Erro ao copiar imagem. Tente fazer o download.');
      setTimeout(() => setErrorMessage(''), 5000);
    }
  }, [generatedImageUrl, handleClosePreview]);

  // Format date for display
  const formatDisplayDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      return format(parseISO(dateStr), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  // Format time for display
  const formatDisplayTime = (timeStr) => {
    if (!timeStr) return '';
    return timeStr.replace(':', 'h');
  };

  if (!isOpen) return null;

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
        <div className="flex items-center justify-between p-4 sm:p-6 border-b bg-gradient-to-r from-primary-50 to-secondary-50">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 flex items-center">
            <Image className="w-5 h-5 mr-2 text-primary-600" />
            Nova Consulta
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <div className="p-4 sm:p-6 space-y-4">
          <p className="text-sm text-gray-600 bg-blue-50 p-3 rounded-md">
            Configure os detalhes da consulta e gere uma imagem profissional para enviar ao cliente.
          </p>

          {/* Check-in Date and Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="check_in_date" className="block text-sm font-medium text-gray-700 mb-1">
                Data Check-in *
              </label>
              <input
                type="date"
                id="check_in_date"
                name="check_in_date"
                value={formData.check_in_date}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="check_in_time" className="block text-sm font-medium text-gray-700 mb-1">
                Hora Check-in *
              </label>
              <input
                type="time"
                id="check_in_time"
                name="check_in_time"
                value={formData.check_in_time}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Check-out Date and Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="check_out_date" className="block text-sm font-medium text-gray-700 mb-1">
                Data Check-out *
              </label>
              <input
                type="date"
                id="check_out_date"
                name="check_out_date"
                value={formData.check_out_date}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="check_out_time" className="block text-sm font-medium text-gray-700 mb-1">
                Hora Check-out *
              </label>
              <input
                type="time"
                id="check_out_time"
                name="check_out_time"
                value={formData.check_out_time}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Total Nights Display */}
          {calculateTotalNights > 0 && (
            <div className="text-sm text-gray-500">
              Total de noites: {calculateTotalNights}
            </div>
          )}

          {/* Accommodation Unit */}
          <div>
            <label htmlFor="accommodation_unit" className="block text-sm font-medium text-gray-700 mb-1">
              Unidade *
            </label>
            <select
              id="accommodation_unit"
              name="accommodation_unit"
              value={formData.accommodation_unit}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Selecione uma unidade</option>
              {units.map(unit => (
                <option key={unit.id} value={unit.id}>
                  {unit.name} - {unit.type} ({unit.max_capacity} pessoas)
                </option>
              ))}
            </select>
          </div>

          {/* Guest Count - Adults and Children */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label htmlFor="guest_count_adults" className="block text-sm font-medium text-gray-700 mb-1">
                Adultos *
              </label>
              <input
                type="number"
                id="guest_count_adults"
                name="guest_count_adults"
                value={formData.guest_count_adults}
                onChange={handleChange}
                min="0"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="guest_count_children" className="block text-sm font-medium text-gray-700 mb-1">
                Crianças
              </label>
              <input
                type="number"
                id="guest_count_children"
                name="guest_count_children"
                value={formData.guest_count_children}
                onChange={handleChange}
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="pet_count" className="block text-sm font-medium text-gray-700 mb-1">
                Animais
              </label>
              <input
                type="number"
                id="pet_count"
                name="pet_count"
                value={formData.pet_count}
                onChange={handleChange}
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Price Breakdown Section */}
          <div className="border border-gray-200 rounded-md p-3 bg-gray-50">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Discriminação de Valores (opcional)
              </label>
              <button
                type="button"
                onClick={addBreakdownItem}
                className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
              >
                + Adicionar Item
              </button>
            </div>
            
            {formData.price_breakdown.length === 0 ? (
              <p className="text-xs text-gray-500 italic">
                Adicione itens para mostrar discriminação de valores na imagem
              </p>
            ) : (
              <div className="space-y-2">
                <div className="flex gap-2 items-center text-xs text-gray-600 font-medium">
                  <span className="flex-1">Nome</span>
                  <span className="w-20 text-center">Qtd</span>
                  <span className="w-28 text-center">Valor Unit.</span>
                  <span className="w-24 text-center">Total</span>
                  <span className="w-4"></span>
                </div>
                {formData.price_breakdown.map((item, index) => {
                  const itemTotal = (parseFloat(item.value) || 0) * (parseFloat(item.quantity) || 1);
                  return (
                    <div key={index} className="flex gap-2 items-center">
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => updateBreakdownItem(index, 'name', e.target.value)}
                        placeholder="Nome (ex: Diária)"
                        className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <input
                        type="number"
                        value={item.quantity || 1}
                        onChange={(e) => updateBreakdownItem(index, 'quantity', e.target.value)}
                        placeholder="Qtd"
                        min="1"
                        step="1"
                        className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-center"
                      />
                      <input
                        type="number"
                        value={item.value}
                        onChange={(e) => updateBreakdownItem(index, 'value', e.target.value)}
                        placeholder="Valor"
                        min="0"
                        step="0.01"
                        className="w-28 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <span className="w-24 text-sm text-gray-700 text-right">
                        R$ {itemTotal.toFixed(2)}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeBreakdownItem(index)}
                        className="text-red-600 hover:text-red-800 text-xs w-4"
                        title="Remover"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
                
                {formData.price_breakdown.length > 0 && (
                  <div className="flex justify-between items-center pt-2 border-t border-gray-300 mt-2">
                    <span className="text-sm font-medium text-gray-700">Subtotal:</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-900">
                        R$ {calculateBreakdownTotal().toFixed(2)}
                      </span>
                      <button
                        type="button"
                        onClick={handleInsertBreakdownTotal}
                        className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 transition-colors"
                        title="Inserir no preço total"
                      >
                        Usar como Total
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Total Price */}
          <div>
            <label htmlFor="total_price" className="block text-sm font-medium text-gray-700 mb-1">
              Preço Total (R$)
            </label>
            <input
              type="number"
              id="total_price"
              name="total_price"
              value={formData.total_price}
              onChange={handleChange}
              min="0"
              step="0.01"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0.00"
            />
            {calculateSuggestedPrice > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                Preço sugerido: <span 
                  className="underline cursor-pointer hover:text-blue-600"
                  onClick={() => setFormData(prev => ({ ...prev, total_price: calculateSuggestedPrice.toFixed(2) }))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setFormData(prev => ({ ...prev, total_price: calculateSuggestedPrice.toFixed(2) }));
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label="Usar preço sugerido no campo total"
                >
                  R$ {calculateSuggestedPrice.toFixed(2)}
                </span>
              </p>
            )}
          </div>

          {/* Price Summary */}
          {displayTotal > 0 && (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-md p-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-600">Média por noite</p>
                  <p className="text-lg font-semibold text-gray-900">
                    R$ {averagePerNight.toFixed(2)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Total</p>
                  <p className="text-2xl font-bold text-green-700">
                    R$ {displayTotal.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {errorMessage}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end pt-4 space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={generating}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleGenerateImage}
              disabled={generating || !formData.accommodation_unit || !formData.check_in_date || !formData.check_out_date}
              className="bg-gradient-to-r from-primary-500 to-secondary-500 hover:from-primary-600 hover:to-secondary-600"
            >
              {generating ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Gerando...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Gerar Imagem
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Hidden Quote Image Template */}
      <div
        ref={quoteTemplateRef}
        style={{
          width: '1080px',
          minHeight: '100px',
          display: 'none',
          position: 'fixed',
          left: '-9999px',
          top: '0',
          backgroundColor: '#ffffff',
          fontFamily: 'Inter, system-ui, sans-serif',
        }}
      >
        {/* Quote Card Design */}
        <div style={{
          width: '100%',
          height: '100%',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          padding: '24px',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
        }}>
          {/* Main Content Section */}
          <div style={{
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            borderRadius: '16px',
            padding: '24px',
            flex: '1',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          }}>
            {/* Dates Row */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '16px',
              marginBottom: '16px',
            }}>
              {/* Check-in */}
              <div style={{
                backgroundColor: '#f3f4f6',
                padding: '18px',
                borderRadius: '12px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{
                    backgroundColor: '#10b981',
                    borderRadius: '8px',
                    padding: '10px',
                    marginRight: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <Calendar style={{ width: '20px', height: '20px', color: 'white' }} />
                  </div>
                  <span style={{ fontSize: '16px', fontWeight: '600', color: '#374151', lineHeight: '1' }}>CHECK-IN</span>
                </div>
                <p style={{ fontSize: '18px', fontWeight: '700', color: '#1f2937', margin: '0 0 4px 0' }}>
                  {formatDisplayDate(formData.check_in_date)}
                </p>
                <p style={{ fontSize: '15px', color: '#6b7280', margin: '0' }}>
                  às {formatDisplayTime(formData.check_in_time)}
                </p>
              </div>

              {/* Check-out */}
              <div style={{
                backgroundColor: '#f3f4f6',
                padding: '18px',
                borderRadius: '12px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{
                    backgroundColor: '#ef4444',
                    borderRadius: '8px',
                    padding: '10px',
                    marginRight: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <Clock style={{ width: '20px', height: '20px', color: 'white' }} />
                  </div>
                  <span style={{ fontSize: '16px', fontWeight: '600', color: '#374151', lineHeight: '1' }}>CHECK-OUT</span>
                </div>
                <p style={{ fontSize: '18px', fontWeight: '700', color: '#1f2937', margin: '0 0 4px 0' }}>
                  {formatDisplayDate(formData.check_out_date)}
                </p>
                <p style={{ fontSize: '15px', color: '#6b7280', margin: '0' }}>
                  às {formatDisplayTime(formData.check_out_time)}
                </p>
              </div>
            </div>

            {/* Guests */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '32px',
              padding: '16px 20px',
              backgroundColor: '#fef3c7',
              borderRadius: '10px',
              marginBottom: '16px',
              minHeight: '56px',
            }}>
              {/* Guest count items - reusable styles */}
              {(() => {
                const guestItemStyle = { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' };
                const iconStyle = { width: '22px', height: '22px', color: '#d97706', flexShrink: 0 };
                const textStyle = { fontSize: '16px', fontWeight: '600', color: '#92400e', lineHeight: '1' };
                return (
                  <>
                    <div style={guestItemStyle}>
                      <User style={iconStyle} />
                      <span style={textStyle}>
                        {formData.guest_count_adults} Adulto{formData.guest_count_adults !== 1 ? 's' : ''}
                      </span>
                    </div>
                    {formData.guest_count_children > 0 && (
                      <div style={guestItemStyle}>
                        <Baby style={iconStyle} />
                        <span style={textStyle}>
                          {formData.guest_count_children} Criança{formData.guest_count_children !== 1 ? 's' : ''}
                        </span>
                      </div>
                    )}
                    {formData.pet_count > 0 && (
                      <div style={guestItemStyle}>
                        <PawPrint style={iconStyle} />
                        <span style={textStyle}>
                          {formData.pet_count} Pet{formData.pet_count !== 1 ? 's' : ''}
                        </span>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>

            {/* Price Breakdown (conditional) */}
            {hasManualBreakdown && (
              <div style={{
                backgroundColor: '#f9fafb',
                borderRadius: '10px',
                padding: '14px',
                marginBottom: '14px',
              }}>
                <p style={{ fontSize: '14px', fontWeight: '600', color: '#6b7280', margin: '0 0 10px 0' }}>
                  DISCRIMINAÇÃO DE VALORES
                </p>
                {formData.price_breakdown.filter(item => item.name && item.value).map((item, index) => {
                  const itemTotal = (parseFloat(item.value) || 0) * (parseFloat(item.quantity) || 1);
                  return (
                    <div key={index} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '6px 0',
                      borderBottom: index < formData.price_breakdown.filter(i => i.name && i.value).length - 1 ? '1px solid #e5e7eb' : 'none',
                    }}>
                      <span style={{ fontSize: '15px', color: '#374151' }}>
                        {item.name} {parseFloat(item.quantity) > 1 ? `(x${item.quantity})` : ''}
                      </span>
                      <span style={{ fontSize: '15px', fontWeight: '600', color: '#374151' }}>
                        R$ {itemTotal.toFixed(2)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Financial Summary */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              paddingTop: '14px',
              borderTop: '2px solid #e5e7eb',
              marginBottom: '16px',
            }}>
              <div>
                <p style={{ fontSize: '15px', color: '#6b7280', margin: '0' }}>
                  {calculateTotalNights} noite{calculateTotalNights !== 1 ? 's' : ''}
                </p>
                <p style={{ fontSize: '16px', color: '#374151', margin: '4px 0 0 0' }}>
                  Média: <span style={{ fontWeight: '600' }}>R$ {averagePerNight.toFixed(2)}</span> /noite
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: '15px', color: '#6b7280', margin: '0' }}>TOTAL</p>
                <p style={{
                  fontSize: '32px',
                  fontWeight: '700',
                  color: '#059669',
                  margin: '0',
                }}>
                  R$ {displayTotal.toFixed(2)}
                </p>
              </div>
            </div>

            {/* Chalet Info Section with Photo Mosaic - Larger footer for better visibility */}
            <div style={{
              marginTop: 'auto',
              backgroundColor: '#f9fafb',
              borderRadius: '12px',
              padding: '20px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '20px',
            }}>
              {/* Photo Mosaic - supports 1-9 photos in various grid layouts */}
              {(() => {
                // Support both album_photos (URLs) and images (uploaded files)
                const photos = selectedUnit?.images && selectedUnit.images.length > 0
                  ? selectedUnit.images.map(img => img.image_url)
                  : (selectedUnit?.album_photos || []);
                
                if (!photos || photos.length === 0) return null;
                
                const photoCount = photos.length;
                // Determine grid layout based on photo count
                // 1 photo: 1x1, 2 photos: 2x1, 3 photos: 3x1, 4 photos: 2x2
                // Photo grid layout configuration based on photo count
                // 1 photo: 1x1, 2 photos: 2x1, 3 photos: 3x1, 4 photos: 2x2, 5-6 photos: 3x2, 7-9 photos: 3x3
                const gridLayouts = {
                  1: { columns: 1, rows: 1, maxPhotos: 1 },
                  2: { columns: 2, rows: 1, maxPhotos: 2 },
                  3: { columns: 3, rows: 1, maxPhotos: 3 },
                  4: { columns: 2, rows: 2, maxPhotos: 4 },
                  5: { columns: 3, rows: 2, maxPhotos: 6 },
                  6: { columns: 3, rows: 2, maxPhotos: 6 },
                };
                const defaultLayout = { columns: 3, rows: 3, maxPhotos: 9 };
                const { columns, rows, maxPhotos } = gridLayouts[photoCount] || defaultLayout;
                
                // Larger mosaic height based on number of rows - increased for better visibility
                const mosaicHeights = { 1: '80px', 2: '160px', 3: '240px' };
                const mosaicHeight = mosaicHeights[rows] || '240px';
                
                return (
                  <div style={{
                    width: '240px',
                    height: mosaicHeight,
                    flexShrink: 0,
                    display: 'grid',
                    gridTemplateColumns: `repeat(${columns}, 1fr)`,
                    gridTemplateRows: `repeat(${rows}, 1fr)`,
                    gap: '4px',
                    borderRadius: '10px',
                    overflow: 'hidden',
                  }}>
                    {photos.slice(0, maxPhotos).map((photo, index) => (
                      <div
                        key={index}
                        style={{
                          width: '100%',
                          height: '100%',
                          overflow: 'hidden',
                          position: 'relative',
                        }}
                      >
                        <img
                          src={photo}
                          alt={`${selectedUnit.name} - Foto ${index + 1}`}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                          }}
                          crossOrigin="anonymous"
                        />
                      </div>
                    ))}
                  </div>
                );
              })()}
              
              {/* Chalet Name and Description - larger text for better visibility */}
              <div style={{ flex: '1', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                <h2 style={{
                  fontSize: '22px',
                  fontWeight: '700',
                  color: '#1f2937',
                  margin: '0 0 8px 0',
                }}>
                  {selectedUnit?.name || 'Acomodação'}
                </h2>
                {selectedUnit?.short_description && (
                  <p style={{
                    fontSize: '16px',
                    color: '#6b7280',
                    margin: '0',
                    lineHeight: '1.6',
                    wordWrap: 'break-word',
                    whiteSpace: 'pre-wrap',
                    overflow: 'visible',
                  }}>
                    {selectedUnit.short_description}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && generatedImageUrl && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black bg-opacity-70"
            onClick={handleClosePreview}
          />
          
          {/* Preview Content */}
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-5xl mx-4 max-h-[90vh] overflow-y-auto p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-4 border-b pb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                Prévia da Imagem de Consulta
              </h2>
              <button
                onClick={handleClosePreview}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Preview Image */}
            <div className="mb-4 bg-gray-100 rounded-lg p-4 flex justify-center">
              <img 
                src={generatedImageUrl} 
                alt="Prévia da consulta" 
                className="max-w-full h-auto rounded shadow-lg"
                style={{ maxHeight: '60vh' }}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleCopyToClipboard}
                className="flex items-center gap-2"
              >
                <Copy className="w-5 h-5" />
                Copiar para Área de Transferência
              </Button>
              <Button
                type="button"
                onClick={handleDownloadImage}
                className="flex items-center gap-2 bg-gradient-to-r from-primary-500 to-secondary-500 hover:from-primary-600 hover:to-secondary-600"
              >
                <Download className="w-5 h-5" />
                Baixar Imagem
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
