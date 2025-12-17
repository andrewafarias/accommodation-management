from django.db import models


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
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Unidade de Acomodação"
        verbose_name_plural = "Unidades de Acomodação"
        ordering = ['name']
    
    def __str__(self):
        return self.name
