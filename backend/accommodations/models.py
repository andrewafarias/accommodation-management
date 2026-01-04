from django.db import models
from django.core.exceptions import ValidationError


class AccommodationUnit(models.Model):
    """
    Modelo de Unidade de Acomodação para gerenciar espaços de aluguel físicos.
    """
    
    # Opções de status
    CLEAN = 'CLEAN'
    DIRTY = 'DIRTY'
    INSPECTING = 'INSPECTING'
    
    STATUS_CHOICES = [
        (CLEAN, 'Limpo'),
        (DIRTY, 'Sujo'),
        (INSPECTING, 'Inspecionando'),
    ]
    
    name = models.CharField(max_length=100, unique=True, verbose_name="Nome")
    max_capacity = models.PositiveIntegerField(
        verbose_name="Capacidade Máxima",
        help_text="Número máximo de hóspedes"
    )
    base_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        verbose_name="Preço Base (BRL)",
        help_text="Diária base em Reais"
    )
    weekend_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="Preço Final de Semana (BRL)",
        help_text="Diária para finais de semana (Sex, Sáb, Dom) em Reais"
    )
    holiday_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="Preço Feriado (BRL)",
        help_text="Diária para feriados em Reais"
    )
    color_hex = models.CharField(
        max_length=7,
        default='#4A90E2',
        verbose_name="Cor do Calendário",
        help_text="Código de cor hex para exibição no calendário (ex: #FF5733)"
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=CLEAN,
        verbose_name="Status"
    )
    auto_dirty_days = models.PositiveIntegerField(
        default=3,
        verbose_name="Dias Auto-Sujo",
        help_text="Número de dias após os quais uma unidade limpa automaticamente fica suja"
    )
    last_cleaned_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Última Limpeza",
        help_text="Data e hora em que a unidade foi limpa pela última vez"
    )
    
    # Horários personalizados de check-in/out por unidade
    default_check_in_time = models.TimeField(
        default='14:00',
        verbose_name="Horário Padrão de Check-in",
        help_text="Horário padrão de check-in para esta unidade (ex: 14:00)"
    )
    default_check_out_time = models.TimeField(
        default='12:00',
        verbose_name="Horário Padrão de Check-out",
        help_text="Horário padrão de check-out para esta unidade (ex: 12:00)"
    )
    
    display_order = models.IntegerField(
        default=0,
        verbose_name="Ordem de Exibição",
        help_text="Ordem em que a unidade aparece na lista e no calendário (menor = primeiro)"
    )
    
    # New fields for descriptions, rules, and photos
    short_description = models.TextField(
        blank=True,
        default='',
        verbose_name="Descrição Curta",
        help_text="Breve descrição da unidade (formato markdown)"
    )
    long_description = models.TextField(
        blank=True,
        default='',
        verbose_name="Descrição Longa",
        help_text="Descrição completa da unidade (formato markdown)"
    )
    rules = models.TextField(
        blank=True,
        default='',
        verbose_name="Regras",
        help_text="Regras da unidade (formato markdown)"
    )
    album_photos = models.JSONField(
        blank=True,
        default=list,
        verbose_name="Álbum de Fotos",
        help_text="Lista de URLs de fotos da unidade"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Unidade de Acomodação"
        verbose_name_plural = "Unidades de Acomodação"
        ordering = ['display_order', 'name']
    
    def __str__(self):
        return self.name


class DatePriceOverride(models.Model):
    """
    Model for storing custom prices for specific dates and accommodation units.
    This allows bulk setting of prices across multiple dates and units.
    """
    accommodation_unit = models.ForeignKey(
        AccommodationUnit,
        on_delete=models.CASCADE,
        related_name='date_price_overrides',
        verbose_name="Unidade de Acomodação"
    )
    date = models.DateField(
        verbose_name="Data",
        help_text="Data específica para aplicar o preço customizado"
    )
    price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        verbose_name="Preço (BRL)",
        help_text="Preço customizado para esta data"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Preço Customizado por Data"
        verbose_name_plural = "Preços Customizados por Data"
        # Ensure only one price override per unit per date
        unique_together = [['accommodation_unit', 'date']]
        ordering = ['date', 'accommodation_unit']
        indexes = [
            models.Index(fields=['accommodation_unit', 'date']),
            models.Index(fields=['date']),
        ]
    
    def __str__(self):
        return f"{self.accommodation_unit.name} - {self.date.strftime('%d/%m/%Y')} - R$ {self.price}"
    
    def clean(self):
        """Validate that the price is positive."""
        super().clean()
        if self.price <= 0:
            raise ValidationError({
                'price': 'O preço deve ser maior que zero.'
            })


class DatePackage(models.Model):
    """
    Model for storing packages (named date ranges) for accommodation units.
    This allows visual grouping and labeling of date ranges in the calendar.
    """
    accommodation_unit = models.ForeignKey(
        AccommodationUnit,
        on_delete=models.CASCADE,
        related_name='date_packages',
        verbose_name="Unidade de Acomodação"
    )
    name = models.CharField(
        max_length=100,
        verbose_name="Nome do Pacote",
        help_text="Nome descritivo do pacote (ex: Natal 2025, Carnaval)"
    )
    start_date = models.DateField(
        verbose_name="Data Inicial"
    )
    end_date = models.DateField(
        verbose_name="Data Final"
    )
    color = models.CharField(
        max_length=7,
        default='#4A90E2',
        verbose_name="Cor",
        help_text="Código de cor hex para exibição no calendário (ex: #FF5733)"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Pacote de Datas"
        verbose_name_plural = "Pacotes de Datas"
        ordering = ['-created_at', 'start_date', 'accommodation_unit']
        indexes = [
            models.Index(fields=['accommodation_unit', 'start_date', 'end_date']),
            models.Index(fields=['start_date', 'end_date']),
        ]
    
    def __str__(self):
        return f"{self.name} - {self.accommodation_unit.name} ({self.start_date.strftime('%d/%m/%Y')} - {self.end_date.strftime('%d/%m/%Y')})"
    
    def clean(self):
        """Validate that end_date is after start_date."""
        super().clean()
        if self.end_date < self.start_date:
            raise ValidationError({
                'end_date': 'A data final deve ser posterior à data inicial.'
            })
