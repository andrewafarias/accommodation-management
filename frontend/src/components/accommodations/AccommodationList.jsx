import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { Search, Edit, Trash2, GripVertical, Images } from 'lucide-react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Button } from '../ui/Button';

const ItemType = {
  ACCOMMODATION_ROW: 'accommodationRow'
};

/**
 * DraggableRow Component
 * 
 * A draggable table row for accommodations
 */
function DraggableRow({ accommodation, index, moveRow, onEdit, onDelete, onManageImages, formatPrice, isSearching, onDragEnd }) {
  const ref = useRef(null);

  const [{ isDragging }, drag, preview] = useDrag({
    type: ItemType.ACCOMMODATION_ROW,
    item: { id: accommodation.id, index },
    canDrag: !isSearching,
    end: (item, monitor) => {
      // Only call onDragEnd if the drop was successful
      if (monitor.didDrop() && onDragEnd) {
        onDragEnd();
      }
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [{ isOver }, drop] = useDrop({
    accept: ItemType.ACCOMMODATION_ROW,
    canDrop: () => !isSearching,
    hover: (draggedItem) => {
      if (!ref.current) {
        return;
      }
      const dragIndex = draggedItem.index;
      const hoverIndex = index;

      if (dragIndex === hoverIndex) {
        return;
      }

      moveRow(dragIndex, hoverIndex);
      draggedItem.index = hoverIndex;
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });

  // Connect drag and drop refs
  preview(drop(ref));

  return (
    <tr
      ref={ref}
      className={`hover:bg-gray-50 transition-colors ${isDragging ? 'opacity-50' : ''} ${isOver ? 'bg-blue-50' : ''}`}
    >
      <td className="px-4 py-4 whitespace-nowrap">
        <div
          ref={drag}
          className={`cursor-${isSearching ? 'not-allowed' : 'move'} text-gray-400 hover:text-gray-600`}
          title={isSearching ? 'Limpe a busca para reordenar' : 'Arraste para reordenar'}
        >
          <GripVertical className="w-5 h-5" />
        </div>
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
            onClick={() => onManageImages(accommodation)}
            className="text-purple-600 hover:text-purple-900"
            title="Gerenciar Imagens"
          >
            <Images className="w-4 h-4" />
          </Button>
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
  );
}

/**
 * AccommodationList Component
 * 
 * Displays a table of accommodation units with search functionality and drag-and-drop reordering.
 * Features:
 * - Search by name or type
 * - Display all accommodation information with color indicators
 * - Drag-and-drop reordering (disabled during search)
 * - Edit and Delete actions
 */
export function AccommodationList({ accommodations = [], onEdit, onDelete, onManageImages, onReorder, loading }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [localAccommodations, setLocalAccommodations] = useState(accommodations);

  // Update local state when accommodations prop changes
  useEffect(() => {
    setLocalAccommodations(accommodations);
  }, [accommodations]);

  // Filter accommodations based on search term
  const filteredAccommodations = useMemo(() => {
    if (!searchTerm.trim()) return localAccommodations;
    
    const term = searchTerm.toLowerCase();
    return localAccommodations.filter(accommodation => 
      accommodation.name.toLowerCase().includes(term)
    );
  }, [localAccommodations, searchTerm]);

  // Move row handler for drag-and-drop
  const moveRow = useCallback((dragIndex, hoverIndex) => {
    setLocalAccommodations((prevAccommodations) => {
      const newAccommodations = [...prevAccommodations];
      const [removed] = newAccommodations.splice(dragIndex, 1);
      newAccommodations.splice(hoverIndex, 0, removed);
      return newAccommodations;
    });
  }, []);

  // Save new order to backend
  const handleDrop = useCallback(() => {
    const newOrder = localAccommodations.map(acc => acc.id);
    if (onReorder) {
      onReorder(newOrder);
    }
  }, [localAccommodations, onReorder]);

  // Format price in BRL
  const formatPrice = (price) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Carregando acomodações...</div>
      </div>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar por nome..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {searchTerm && (
          <div className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
            ⚠️ Reordenação desabilitada durante a busca. Limpe a busca para reordenar.
          </div>
        )}

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
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {/* Drag handle column */}
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
                {filteredAccommodations.map((accommodation, index) => (
                  <DraggableRow
                    key={accommodation.id}
                    accommodation={accommodation}
                    index={index}
                    moveRow={moveRow}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onManageImages={onManageImages}
                    formatPrice={formatPrice}
                    isSearching={!!searchTerm}
                    onDragEnd={handleDrop}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Results Count */}
        {filteredAccommodations.length > 0 && (
          <div className="text-sm text-gray-500 text-right">
            Mostrando {filteredAccommodations.length} de {accommodations.length} unidade{accommodations.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>
    </DndProvider>
  );
}
