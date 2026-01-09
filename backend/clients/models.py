from django.db import models


class Client(models.Model):
    """
    Modelo de Cliente para gerenciar informações de hóspedes.
    CPF (Cadastro de Pessoa Física) é opcional.
    """
    full_name = models.CharField(max_length=255, verbose_name="Nome Completo")
    cpf = models.CharField(
        max_length=14,
        unique=True,
        blank=True,
        null=True,
        verbose_name="CPF",
        help_text="Formato: XXX.XXX.XXX-XX"
    )
    phone = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        verbose_name="Telefone",
        help_text="Formato: +55 (XX) XXXXX-XXXX"
    )
    email = models.EmailField(blank=True, null=True, verbose_name="E-mail")
    address = models.TextField(blank=True, null=True, verbose_name="Endereço")
    notes = models.TextField(blank=True, null=True, verbose_name="Observações")
    tags = models.JSONField(
        default=list,
        blank=True,
        verbose_name="Etiquetas",
        help_text="Lista de etiquetas como 'VIP', 'Hóspede Frequente', etc."
    )
    profile_picture = models.ImageField(
        upload_to='clients/photos/',
        blank=True,
        null=True,
        verbose_name="Foto de Perfil"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Cliente"
        verbose_name_plural = "Clientes"
        ordering = ['full_name']
    
    def __str__(self):
        if self.cpf:
            return f"{self.full_name} (CPF: {self.cpf})"
        return self.full_name


class DocumentAttachment(models.Model):
    """
    Modelo para armazenar múltiplos anexos de documentos para um cliente.
    """
    client = models.ForeignKey(
        Client,
        on_delete=models.CASCADE,
        related_name='document_attachments',
        verbose_name="Cliente"
    )
    file = models.FileField(
        upload_to='clients/docs/',
        verbose_name="Arquivo de Documento"
    )
    filename = models.CharField(
        max_length=255,
        verbose_name="Nome do Arquivo",
        help_text="Nome original do documento enviado"
    )
    uploaded_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = "Anexo de Documento"
        verbose_name_plural = "Anexos de Documentos"
        ordering = ['-uploaded_at']
    
    def __str__(self):
        return f"{self.filename} - {self.client.full_name}"

