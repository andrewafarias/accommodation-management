import { useState, useEffect } from 'react';
import { X, Trash2, FileText, Upload } from 'lucide-react';
import { Button } from '../ui/Button';
import api from '../../services/api';

/**
 * ClientModal Component
 * 
 * Modal form for adding or editing a client.
 * Features:
 * - CPF mask (XXX.XXX.XXX-XX)
 * - Form validation
 * - Tag management
 * - Address and notes fields
 * - Multiple document attachments
 */
export function ClientModal({ isOpen, onClose, onSave, client, existingCpfs = [] }) {
  const [formData, setFormData] = useState({
    full_name: '',
    cpf: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
    tags: [],
  });
  const [tagInput, setTagInput] = useState('');
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [documentsToUpload, setDocumentsToUpload] = useState([]);
  const [existingDocuments, setExistingDocuments] = useState([]);
  const [profilePicture, setProfilePicture] = useState(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState(null);

  // Initialize form with client data when editing
  useEffect(() => {
    if (client) {
      setFormData({
        full_name: client.full_name || '',
        cpf: client.cpf || '',
        // Convert international format to display format for editing
        phone: client.phone ? formatPhoneDisplay(client.phone) : '',
        email: client.email || '',
        address: client.address || '',
        notes: client.notes || '',
        tags: client.tags || [],
      });
      setExistingDocuments(client.document_attachments || []);
      setProfilePicturePreview(client.profile_picture || null);
    } else {
      setFormData({
        full_name: '',
        cpf: '',
        phone: '',
        email: '',
        address: '',
        notes: '',
        tags: [],
      });
      setExistingDocuments([]);
      setProfilePicturePreview(null);
    }
    setDocumentsToUpload([]);
    setProfilePicture(null);
    setErrors({});
  }, [client, isOpen]);

  // Format CPF - store only digits (numbers only as per requirement)
  const formatCPF = (value) => {
    // Remove all non-digits and limit to 11 characters
    const digits = value.replace(/\D/g, '');
    return digits.slice(0, 11);
  };

  // Format phone - store only digits (numbers only as per requirement)
  // Format: [international code] [ddd] [number] - e.g., 5511999998888
  const formatPhoneDisplay = (value) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');
    // Limit to 13 digits (55 + 2 DDD + 9 number)
    return digits.slice(0, 13);
  };

  // Convert phone from display format to international format (+5511999998888)
  const formatPhoneInternational = (value) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');
    
    // If already has country code, return as is
    if (digits.startsWith('55')) {
      return `+${digits}`;
    }
    
    // Add country code
    return `+55${digits}`;
  };

  // Validate CPF format (must be only numbers, 11 digits)
  const isValidCPF = (cpf) => {
    const digits = cpf.replace(/\D/g, '');
    return digits.length === 11;
  };

  // Validate phone format (must be valid Brazilian phone: +55 DDD XXXXXXXX or XXXXXXXXX)
  const isValidPhone = (phone) => {
    const digits = phone.replace(/\D/g, '');
    // Brazilian phone: country code (55) + DDD (2) + number (8 or 9)
    // Total: 12-13 digits with country code, or 10-11 without
    return (digits.length >= 10 && digits.length <= 13);
  };

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'cpf') {
      const formatted = formatCPF(value);
      setFormData(prev => ({ ...prev, [name]: formatted }));
    } else if (name === 'phone') {
      const formatted = formatPhoneDisplay(value);
      setFormData(prev => ({ ...prev, [name]: formatted }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Handle multiple document files selection
  const handleDocumentFilesChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setDocumentsToUpload(prev => [...prev, ...files]);
    }
  };

  // Remove document from upload queue
  const handleRemoveDocumentToUpload = (index) => {
    setDocumentsToUpload(prev => prev.filter((_, i) => i !== index));
  };

  // Remove existing document attachment
  const handleRemoveExistingDocument = async (documentId) => {
    if (!client) return;
    
    if (!window.confirm('Tem certeza que deseja remover este documento?')) {
      return;
    }
    
    try {
      await api.delete(`clients/${client.id}/remove_document/${documentId}/`);
      setExistingDocuments(prev => prev.filter(doc => doc.id !== documentId));
    } catch (error) {
      console.error('Error removing document:', error);
      alert('Falha ao remover documento. Tente novamente.');
    }
  };

  // Add tag
  const handleAddTag = (e) => {
    e.preventDefault();
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()],
      }));
      setTagInput('');
    }
  };

  // Remove tag
  const handleRemoveTag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove),
    }));
  };

  // Handle profile picture selection
  const handleProfilePictureChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfilePicture(file);
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicturePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Remove profile picture
  const handleRemoveProfilePicture = () => {
    setProfilePicture(null);
    setProfilePicturePreview(null);
  };

  // Validate form
  const validate = () => {
    const newErrors = {};

    if (!formData.full_name.trim()) {
      newErrors.full_name = 'Nome completo é obrigatório';
    }

    if (!formData.cpf.trim()) {
      newErrors.cpf = 'CPF é obrigatório';
    } else if (!isValidCPF(formData.cpf)) {
      newErrors.cpf = 'CPF inválido';
    } else {
      // Check if CPF is unique (exclude current client when editing)
      const cpfExists = existingCpfs.some(
        existingCpf => existingCpf === formData.cpf && (!client || client.cpf !== formData.cpf)
      );
      if (cpfExists) {
        newErrors.cpf = 'CPF já cadastrado';
      }
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Telefone é obrigatório';
    } else if (!isValidPhone(formData.phone)) {
      newErrors.phone = 'Número inválido';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'E-mail inválido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) return;

    setSaving(true);
    try {
      // Convert to FormData for file upload support
      const submitData = new FormData();
      
      // Append all text fields
      submitData.append('full_name', formData.full_name);
      submitData.append('cpf', formData.cpf);
      // Convert phone to international format before sending
      submitData.append('phone', formatPhoneInternational(formData.phone));
      if (formData.email) submitData.append('email', formData.email);
      if (formData.address) submitData.append('address', formData.address);
      if (formData.notes) submitData.append('notes', formData.notes);
      submitData.append('tags', JSON.stringify(formData.tags));
      
      // Append profile picture if selected
      if (profilePicture) {
        submitData.append('profile_picture', profilePicture);
      }
      
      // Save the client first and get the saved client data
      const savedClient = await onSave(submitData);
      
      // Upload new document attachments if any
      if (documentsToUpload.length > 0) {
        const clientId = savedClient?.id || client?.id;
        if (clientId) {
          for (const file of documentsToUpload) {
            const docData = new FormData();
            docData.append('file', file);
            
            try {
              await api.post(
                `clients/${clientId}/add_document/`,
                docData,
                {
                  headers: {
                    'Content-Type': 'multipart/form-data',
                  },
                }
              );
            } catch (docError) {
              console.error('Error uploading document:', docError);
              // Continue with other documents even if one fails
            }
          }
        }
      }
      
      onClose();
    } catch (error) {
      console.error('Error saving client:', error);
      setErrors({ submit: 'Falha ao salvar cliente. Por favor, tente novamente.' });
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900">
              {client ? 'Editar Cliente' : 'Novo Cliente'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Profile Picture */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Foto de Perfil
              </label>
              <div className="flex items-start space-x-4">
                {/* Preview */}
                {profilePicturePreview ? (
                  <div className="relative">
                    <img
                      src={profilePicturePreview}
                      alt="Pré-visualização do perfil"
                      className="w-24 h-24 rounded-full object-cover border-2 border-gray-300"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveProfilePicture}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      title="Remover foto de perfil"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center border-2 border-gray-300">
                    <Upload className="w-8 h-8 text-gray-400" />
                  </div>
                )}
                
                {/* Upload button */}
                <div className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleProfilePictureChange}
                    className="block w-full text-sm text-gray-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-md file:border-0
                      file:text-sm file:font-medium
                      file:bg-primary-50 file:text-primary-700
                      hover:file:bg-primary-100"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Recomendado: Imagem quadrada, no mínimo 200x200px
                  </p>
                </div>
              </div>
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome Completo <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                  errors.full_name ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Digite o nome completo"
              />
              {errors.full_name && (
                <p className="mt-1 text-sm text-red-500">{errors.full_name}</p>
              )}
            </div>

            {/* CPF */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                CPF <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="cpf"
                value={formData.cpf}
                onChange={handleChange}
                maxLength={11}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                  errors.cpf ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Somente números (11 dígitos)"
              />
              {errors.cpf && (
                <p className="mt-1 text-sm text-red-500">{errors.cpf}</p>
              )}
            </div>

            {/* Phone and Email - Side by side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telefone <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                    errors.phone ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="5511999998888"
                />
                {errors.phone && (
                  <p className="mt-1 text-sm text-red-500">{errors.phone}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                    errors.email ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="email@example.com"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-500">{errors.email}</p>
                )}
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Endereço
              </label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleChange}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Digite o endereço"
              />
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Etiquetas
              </label>
              <div className="space-y-2">
                {/* Tag Input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleAddTag(e);
                      }
                    }}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Adicionar etiqueta (ex: VIP, Hóspede Frequente)"
                  />
                  <Button
                    type="button"
                    onClick={handleAddTag}
                    variant="outline"
                    size="default"
                  >
                    Adicionar
                  </Button>
                </div>

                {/* Tag List */}
                {formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-secondary-100 text-secondary-800"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="ml-2 text-secondary-600 hover:text-secondary-800"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Multiple Document Attachments */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Anexos de Documentos
              </label>
              
              {/* File input for adding multiple documents */}
              <input
                type="file"
                multiple
                onChange={handleDocumentFilesChange}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-medium
                  file:bg-accent-50 file:text-accent-700
                  hover:file:bg-accent-100"
              />
              
              {/* List of existing documents */}
              {existingDocuments.length > 0 && (
                <div className="mt-3 space-y-2">
                  <p className="text-xs text-gray-500 font-medium">Documentos Existentes:</p>
                  {existingDocuments.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-200"
                    >
                      <div className="flex items-center space-x-2 flex-1 min-w-0">
                        <FileText className="w-4 h-4 text-gray-500 flex-shrink-0" />
                        <a
                          href={doc.file}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary-600 hover:text-primary-800 truncate"
                        >
                          {doc.filename}
                        </a>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveExistingDocument(doc.id)}
                        className="ml-2 text-red-600 hover:text-red-800 flex-shrink-0"
                        title="Remover documento"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              {/* List of documents to upload */}
              {documentsToUpload.length > 0 && (
                <div className="mt-3 space-y-2">
                  <p className="text-xs text-gray-500 font-medium">A serem enviados:</p>
                  {documentsToUpload.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-accent-50 rounded border border-accent-200"
                    >
                      <div className="flex items-center space-x-2 flex-1 min-w-0">
                        <FileText className="w-4 h-4 text-accent-600 flex-shrink-0" />
                        <span className="text-sm text-gray-700 truncate">
                          {file.name}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveDocumentToUpload(index)}
                        className="ml-2 text-red-600 hover:text-red-800 flex-shrink-0"
                        title="Remover da fila de envio"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Observações adicionais sobre o cliente"
              />
            </div>

            {/* Submit Error */}
            {errors.submit && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{errors.submit}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={saving}
              >
                {saving ? 'Salvando...' : (client ? 'Atualizar Cliente' : 'Criar Cliente')}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
