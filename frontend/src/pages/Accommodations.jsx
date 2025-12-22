import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ImportExportButtons } from '../components/ui/ImportExportButtons';
import { AccommodationList } from '../components/accommodations/AccommodationList';
import { AccommodationModal } from '../components/accommodations/AccommodationModal';
import { Home, Plus } from 'lucide-react';
import api from '../services/api';

export function Accommodations() {
  const [accommodations, setAccommodations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccommodation, setEditingAccommodation] = useState(null);

  // Fetch accommodations on mount
  useEffect(() => {
    fetchAccommodations();
  }, []);

  const fetchAccommodations = async () => {
    try {
      setLoading(true);
      const response = await api.get('accommodations/');
      const accommodationsData = response.data.results || response.data;
      setAccommodations(accommodationsData);
    } catch (error) {
      console.error('Error fetching accommodations:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle opening modal for new accommodation
  const handleNewAccommodation = () => {
    setEditingAccommodation(null);
    setIsModalOpen(true);
  };

  // Handle opening modal for editing
  const handleEdit = (accommodation) => {
    setEditingAccommodation(accommodation);
    setIsModalOpen(true);
  };

  // Handle saving accommodation (create or update)
  const handleSave = async () => {
    // The modal already saves the data, we just need to refresh and close
    await fetchAccommodations();
    setIsModalOpen(false);
    setEditingAccommodation(null);
  };

  // Handle delete
  const handleDelete = async (accommodation) => {
    if (!window.confirm(`Tem certeza que deseja excluir ${accommodation.name}?`)) {
      return;
    }

    try {
      await api.delete(`accommodations/${accommodation.id}/`);
      // Refresh the list
      await fetchAccommodations();
    } catch (error) {
      console.error('Error deleting accommodation:', error);
      alert('Falha ao excluir unidade. Pode haver reservas associadas.');
    }
  };

  // Handle export
  const handleExport = async (format) => {
    try {
      const response = await api.get(`accommodations/export_data/?export_format=${format}`, {
        responseType: 'blob'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `units.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting units:', error);
      alert('Erro ao exportar unidades.');
    }
  };

  // Handle import
  const handleImport = async (file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await api.post('accommodations/import_data/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      const { imported, errors } = response.data;
      
      if (errors && errors.length > 0) {
        alert(`Importadas: ${imported} unidades.\nErros: ${errors.length} registros não puderam ser importados.`);
      } else {
        alert(`Importadas: ${imported} unidades com sucesso!`);
      }
      
      // Refresh the list
      await fetchAccommodations();
    } catch (error) {
      console.error('Error importing units:', error);
      alert('Erro ao importar unidades. Verifique o formato do arquivo.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Unidades</h1>
        <div className="flex gap-2">
          <ImportExportButtons 
            onExport={handleExport}
            onImport={handleImport}
          />
          <Button onClick={handleNewAccommodation}>
            <Plus className="w-5 h-5 mr-2" />
            Nova Unidade
          </Button>
        </div>
      </div>

      {/* Accommodation List Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Home className="w-6 h-6 mr-2" />
            Gerenciamento de Unidades
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AccommodationList
            accommodations={accommodations}
            onEdit={handleEdit}
            onDelete={handleDelete}
            loading={loading}
          />
        </CardContent>
      </Card>

      {/* Accommodation Modal */}
      <AccommodationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        accommodation={editingAccommodation}
      />
    </div>
  );
}
