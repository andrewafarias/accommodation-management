from rest_framework import serializers
from django.core.exceptions import ValidationError as DjangoValidationError
from .models import Reservation
from accommodations.serializers import AccommodationUnitSerializer
from clients.serializers import ClientSerializer


class ReservationSerializer(serializers.ModelSerializer):
    """
    Serializador para modelo Reservation.
    
    Lógica de Leitura (GET): Retorna objetos client e accommodation_unit aninhados.
    Lógica de Escrita (POST/PUT/PATCH): Aceita IDs de client e accommodation_unit.
    Validação: Chama método clean() do modelo para garantir validação de sobreposição.
    """
    # Representações aninhadas somente leitura para requisições GET
    client_details = ClientSerializer(source='client', read_only=True)
    accommodation_unit_details = AccommodationUnitSerializer(source='accommodation_unit', read_only=True)
    
    # Campos somente escrita para requisições POST/PUT/PATCH
    client = serializers.PrimaryKeyRelatedField(
        queryset=__import__('clients.models', fromlist=['Client']).Client.objects.all(),
        write_only=True
    )
    accommodation_unit = serializers.PrimaryKeyRelatedField(
        queryset=__import__('accommodations.models', fromlist=['AccommodationUnit']).AccommodationUnit.objects.all(),
        write_only=True
    )
    
    # Campos computados somente leitura
    amount_remaining = serializers.ReadOnlyField()
    is_fully_paid = serializers.ReadOnlyField()
    
    class Meta:
        model = Reservation
        fields = [
            'id',
            'accommodation_unit',
            'accommodation_unit_details',
            'client',
            'client_details',
            'check_in',
            'check_out',
            'guest_count_adults',
            'guest_count_children',
            'total_price',
            'price_breakdown',
            'amount_paid',
            'amount_remaining',
            'is_fully_paid',
            'payment_history',
            'status',
            'notes',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'accommodation_unit_details', 'client_details', 'amount_remaining', 'is_fully_paid', 'created_at', 'updated_at']
    
    def to_representation(self, instance):
        """
        Personaliza a representação de saída para incluir objetos aninhados.
        """
        representation = super().to_representation(instance)
        # Move detalhes aninhados para substituir campos de ID para saída mais limpa
        representation['client'] = representation.pop('client_details')
        representation['accommodation_unit'] = representation.pop('accommodation_unit_details')
        return representation
    
    def check_tight_turnaround(self, accommodation_unit, check_in, check_out=None):
        """
        Verifica se há um checkout dentro de 2 horas antes do check-in,
        ou se há um check-in dentro de 2 horas após o check-out.
        Retorna uma mensagem de aviso se for detectado um intervalo curto.
        """
        from datetime import timedelta
        from django.utils import timezone
        
        warnings = []
        
        # Garante que check_in está ciente de fuso horário
        if check_in and timezone.is_naive(check_in):
            check_in = timezone.make_aware(check_in)
        
        # Verifica reserva anterior com check-out próximo a este check-in
        if check_in and accommodation_unit:
            two_hours_before = check_in - timedelta(hours=2)
            previous_reservation = Reservation.objects.filter(
                accommodation_unit=accommodation_unit,
                check_out__gt=two_hours_before,
                check_out__lte=check_in
            ).exclude(
                status=Reservation.CANCELLED
            ).exclude(
                pk=self.instance.pk if self.instance else None
            ).order_by('-check_out').first()
            
            if previous_reservation:
                time_diff = check_in - previous_reservation.check_out
                total_minutes = int(time_diff.total_seconds() / 60)
                hours = total_minutes // 60
                remaining_minutes = total_minutes % 60
                
                warnings.append(
                    f"A reserva anterior de {previous_reservation.client.full_name} "
                    f"tem check-out em {previous_reservation.check_out.strftime('%d/%m/%Y %H:%M')}, "
                    f"apenas {hours}h{remaining_minutes:02d}min antes do check-in desta reserva."
                )
        
        # Verifica próxima reserva com check-in próximo a este check-out
        if check_out and accommodation_unit:
            # Garante que check_out está ciente de fuso horário
            if timezone.is_naive(check_out):
                check_out = timezone.make_aware(check_out)
                
            two_hours_after = check_out + timedelta(hours=2)
            next_reservation = Reservation.objects.filter(
                accommodation_unit=accommodation_unit,
                check_in__gte=check_out,
                check_in__lt=two_hours_after
            ).exclude(
                status=Reservation.CANCELLED
            ).exclude(
                pk=self.instance.pk if self.instance else None
            ).order_by('check_in').first()
            
            if next_reservation:
                time_diff = next_reservation.check_in - check_out
                total_minutes = int(time_diff.total_seconds() / 60)
                hours = total_minutes // 60
                remaining_minutes = total_minutes % 60
                
                warnings.append(
                    f"A próxima reserva de {next_reservation.client.full_name} "
                    f"tem check-in em {next_reservation.check_in.strftime('%d/%m/%Y %H:%M')}, "
                    f"apenas {hours}h{remaining_minutes:02d}min depois do check-out desta reserva."
                )
        
        if warnings:
            return "AVISO: Pouco tempo entre reservas! " + " ".join(warnings)
        
        return None
    
    def validate(self, attrs):
        """
        Chama o método clean() do modelo para forçar validação de sobreposição.
        Isso garante que a API respeita a regra de negócio prevenindo reservas duplicadas.
        """
        # Para atualizações (PATCH/PUT), mescla novos attrs com valores de instância existentes
        if self.instance:
            # Começa com dados de instância existentes
            instance = self.instance
            # Atualiza com novos attrs
            for key, value in attrs.items():
                setattr(instance, key, value)
        else:
            # Para criação, cria uma nova instância temporária
            instance = Reservation(**attrs)
        
        try:
            instance.clean()
        except DjangoValidationError as e:
            # Converte Django ValidationError para DRF ValidationError
            raise serializers.ValidationError(e.message_dict)
        
        # Verifica intervalo curto (aviso, não erro)
        warning = self.check_tight_turnaround(
            attrs.get('accommodation_unit', getattr(self.instance, 'accommodation_unit', None)),
            attrs.get('check_in', getattr(self.instance, 'check_in', None)),
            attrs.get('check_out', getattr(self.instance, 'check_out', None))
        )
        if warning:
            # Armazena aviso para ser retornado na resposta (não bloqueará o salvamento)
            self.context['tight_turnaround_warning'] = warning
        
        return attrs
