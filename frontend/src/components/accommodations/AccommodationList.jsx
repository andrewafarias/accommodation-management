import { useState, useMemo } from 'react';
import { Search, Edit, Trash2, DollarSign, Package } from 'lucide-react';
import { Button } from '../ui/Button';

/**
 * AccommodationList Component
 * 
 * Displays a table of accommodation units with search and multi-select functionality.
 * Features:
 * - Search by name
 * - Multi-select with checkboxes
 * - Bulk actions (price update, create package)
 * - Edit and Delete actions
 */
export function AccommodationList({ 
  accommodations = [], 
  onEdit, 
  onDelete, 
  loading,
  onBulkPriceUpdate,
  onCreatePackage
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);

  // Filter accommodations based on search term
  const filteredAccommodations = useMemo(() => {
    if (!searchTerm.trim()) return accommodations;
    
    const term = searchTerm.toLowerCase();
    return accommodations.filter(accommodation => 
      accommodation.name.toLowerCase().includes(term)
    );
  }, [accommodations, searchTerm]);

  // Format price in BRL
  const formatPrice = (price) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  // Handle select all checkbox
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(filteredAccommodations.map(a => a.id));
    } else {
      setSelectedIds([]);
    }
  };

  // Handle individual checkbox
  const handleSelectOne = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(selectedId => selectedId !== id)
        : [...prev, id]
    );
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedIds([]);
  };

  // Handle bulk actions
  const handleBulkPriceUpdate = () => {
    if (onBulkPriceUpdate) {
      onBulkPriceUpdate(selectedIds);
    }
  };

  const handleCreatePackage = () => {
    if (onCreatePackage) {
      onCreatePackage(selectedIds);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Carregando acomodações...</div>
      </div>
    );
  }

  const allSelected = filteredAccommodations.length > 0 && selectedIds.length === filteredAccommodations.length;
  const someSelected = selectedIds.length > 0 && selectedIds.length < filteredAccommodations.length;

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar por nome..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        {selectedIds.length > 0 && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkPriceUpdate}
            >
              <DollarSign className="w-4 h-4 mr-2" />
              Atualizar Preços ({selectedIds.length})
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCreatePackage}
            >
              <Package className="w-4 h-4 mr-2" />
              Criar Pacote ({selectedIds.length})
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSelection}
            >
              Limpar
            </Button>
          </div>
        )}
      </div>

      {/* Table */}
      {filteredAccommodations.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <p className="text-gray-500">
            {searchTerm ? 'Nenhuma acomodação encontrada.' : 'Nenhuma acomodação ainda. Adicione sua primeira unidade!'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={input => {
                      if (input) {
                        input.indeterminate = someSelected;
                      }
                    }}
                    onChange={handleSelectAll}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nome
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Preço Base
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Capacidade
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAccommodations.map((accommodation) => (
                <tr 
                  key={accommodation.id} 
                  className={`hover:bg-gray-50 ${selectedIds.includes(accommodation.id) ? 'bg-blue-50' : ''}`}
                >
                  <td className="px-4 py-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(accommodation.id)}
                      onChange={() => handleSelectOne(accommodation.id)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div
                      className="w-6 h-6 rounded-full border-2 border-gray-300"
                      style={{ backgroundColor: accommodation.color_hex }}
                      title={accommodation.color_hex}
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {accommodation.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {formatPrice(accommodation.base_price)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {accommodation.max_capacity} pessoas
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(accommodation)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(accommodation)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Results Count */}
      {filteredAccommodations.length > 0 && (
        <div className="flex justify-between items-center text-sm text-gray-500">
          <div>
            Mostrando {filteredAccommodations.length} de {accommodations.length} unidade{accommodations.length !== 1 ? 's' : ''}
          </div>
          {selectedIds.length > 0 && (
            <div className="text-blue-600 font-medium">
              {selectedIds.length} selecionada{selectedIds.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
