from django.http import HttpResponse
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.decorators import parser_classes
from rest_framework import status
import json
import csv
from io import StringIO

from clients.models import Client
from clients.serializers import ClientSerializer
from accommodations.models import AccommodationUnit
from accommodations.serializers import AccommodationUnitSerializer
from reservations.models import Reservation
from reservations.serializers import ReservationSerializer
from financials.models import Transaction
from financials.serializers import TransactionSerializer


@api_view(['GET'])
def export_all_data(request):
    """
    Export all data (clients, units, reservations, financials) to JSON format.
    Query param: format (json only for combined export)
    """
    # Get all clients
    clients = Client.objects.all()
    clients_serializer = ClientSerializer(clients, many=True)
    clients_data = []
    for client in clients_serializer.data:
        clients_data.append({
            'full_name': client.get('full_name', ''),
            'cpf': client.get('cpf', ''),
            'phone': client.get('phone', ''),
            'email': client.get('email', ''),
            'address': client.get('address', ''),
            'notes': client.get('notes', ''),
            'tags': client.get('tags', []),
        })
    
    # Get all units
    units = AccommodationUnit.objects.all()
    units_serializer = AccommodationUnitSerializer(units, many=True)
    units_data = []
    for unit in units_serializer.data:
        units_data.append({
            'name': unit.get('name', ''),
            'max_capacity': unit.get('max_capacity', 0),
            'base_price': unit.get('base_price', '0.00'),
            'weekend_price': unit.get('weekend_price', ''),
            'holiday_price': unit.get('holiday_price', ''),
            'color_hex': unit.get('color_hex', '#4A90E2'),
            'status': unit.get('status', 'CLEAN'),
            'auto_dirty_days': unit.get('auto_dirty_days', 3),
            'default_check_in_time': unit.get('default_check_in_time', '14:00:00'),
            'default_check_out_time': unit.get('default_check_out_time', '12:00:00'),
        })
    
    # Get all reservations
    reservations = Reservation.objects.all()
    reservations_serializer = ReservationSerializer(reservations, many=True)
    reservations_data = []
    for res in reservations_serializer.data:
        client_cpf = res.get('client', {}).get('cpf', '') if isinstance(res.get('client'), dict) else ''
        unit_name = res.get('accommodation_unit', {}).get('name', '') if isinstance(res.get('accommodation_unit'), dict) else ''
        reservations_data.append({
            'client_cpf': client_cpf,
            'unit_name': unit_name,
            'check_in': res.get('check_in', ''),
            'check_out': res.get('check_out', ''),
            'guest_count_adults': res.get('guest_count_adults', 1),
            'guest_count_children': res.get('guest_count_children', 0),
            'total_price': res.get('total_price', ''),
            'amount_paid': res.get('amount_paid', '0.00'),
            'status': res.get('status', 'PENDING'),
            'notes': res.get('notes', ''),
            'price_breakdown': res.get('price_breakdown', []),
            'payment_history': res.get('payment_history', []),
        })
    
    # Get all transactions
    transactions = Transaction.objects.all()
    transactions_serializer = TransactionSerializer(transactions, many=True)
    transactions_data = []
    for trans in transactions_serializer.data:
        transactions_data.append({
            'amount': trans.get('amount', '0.00'),
            'transaction_type': trans.get('transaction_type', 'INCOME'),
            'category': trans.get('category', 'LODGING'),
            'payment_method': trans.get('payment_method', 'PIX'),
            'due_date': trans.get('due_date', ''),
            'paid_date': trans.get('paid_date', ''),
            'description': trans.get('description', ''),
            'notes': trans.get('notes', ''),
        })
    
    export_data = {
        'clients': clients_data,
        'units': units_data,
        'reservations': reservations_data,
        'financials': transactions_data,
    }
    
    response = HttpResponse(
        json.dumps(export_data, ensure_ascii=False, indent=2),
        content_type='application/json'
    )
    response['Content-Disposition'] = 'attachment; filename="all_data.json"'
    return response


@api_view(['POST'])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def import_all_data(request):
    """
    Import all data (clients, units, reservations, financials) from JSON format.
    Accepts file upload or JSON body.
    Order of import: clients, units, reservations, financials (to maintain references)
    """
    results = {
        'clients': {'imported': 0, 'errors': []},
        'units': {'imported': 0, 'errors': []},
        'reservations': {'imported': 0, 'errors': []},
        'financials': {'imported': 0, 'errors': []},
    }
    
    # Check if file was uploaded
    file = request.FILES.get('file')
    
    if file:
        file_content = file.read().decode('utf-8')
        try:
            data = json.loads(file_content)
        except json.JSONDecodeError:
            return Response(
                {'error': 'Invalid JSON file'},
                status=status.HTTP_400_BAD_REQUEST
            )
    else:
        data = request.data
    
    if not isinstance(data, dict):
        return Response(
            {'error': 'Data must be an object with clients, units, reservations, and financials arrays'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Import clients first
    for idx, client_data in enumerate(data.get('clients', [])):
        try:
            cpf = client_data.get('cpf', '')
            existing = Client.objects.filter(cpf=cpf).first()
            
            if existing:
                serializer = ClientSerializer(existing, data=client_data, partial=True)
            else:
                serializer = ClientSerializer(data=client_data)
            
            if serializer.is_valid():
                serializer.save()
                results['clients']['imported'] += 1
            else:
                results['clients']['errors'].append({
                    'index': idx,
                    'data': client_data,
                    'errors': serializer.errors
                })
        except Exception as e:
            results['clients']['errors'].append({
                'index': idx,
                'data': client_data,
                'errors': str(e)
            })
    
    # Import units
    for idx, unit_data in enumerate(data.get('units', [])):
        try:
            name = unit_data.get('name', '')
            existing = AccommodationUnit.objects.filter(name=name).first()
            
            if existing:
                serializer = AccommodationUnitSerializer(existing, data=unit_data, partial=True)
            else:
                serializer = AccommodationUnitSerializer(data=unit_data)
            
            if serializer.is_valid():
                serializer.save()
                results['units']['imported'] += 1
            else:
                results['units']['errors'].append({
                    'index': idx,
                    'data': unit_data,
                    'errors': serializer.errors
                })
        except Exception as e:
            results['units']['errors'].append({
                'index': idx,
                'data': unit_data,
                'errors': str(e)
            })
    
    # Import reservations
    for idx, res_data in enumerate(data.get('reservations', [])):
        try:
            client_cpf = res_data.get('client_cpf', '')
            client = Client.objects.filter(cpf=client_cpf).first()
            
            if not client:
                results['reservations']['errors'].append({
                    'index': idx,
                    'data': res_data,
                    'errors': f"Client with CPF '{client_cpf}' not found"
                })
                continue
            
            unit_name = res_data.get('unit_name', '')
            unit = AccommodationUnit.objects.filter(name=unit_name).first()
            
            if not unit:
                results['reservations']['errors'].append({
                    'index': idx,
                    'data': res_data,
                    'errors': f"Unit with name '{unit_name}' not found"
                })
                continue
            
            serializer_data = {
                'client': client.id,
                'accommodation_unit': unit.id,
                'check_in': res_data.get('check_in'),
                'check_out': res_data.get('check_out'),
                'guest_count_adults': res_data.get('guest_count_adults', 1),
                'guest_count_children': res_data.get('guest_count_children', 0),
                'total_price': res_data.get('total_price') if res_data.get('total_price') != '' else None,
                'amount_paid': res_data.get('amount_paid', '0.00'),
                'status': res_data.get('status', 'PENDING'),
                'notes': res_data.get('notes', ''),
                'price_breakdown': res_data.get('price_breakdown', []),
                'payment_history': res_data.get('payment_history', []),
            }
            
            serializer = ReservationSerializer(data=serializer_data)
            
            if serializer.is_valid():
                serializer.save()
                results['reservations']['imported'] += 1
            else:
                results['reservations']['errors'].append({
                    'index': idx,
                    'data': res_data,
                    'errors': serializer.errors
                })
        except Exception as e:
            results['reservations']['errors'].append({
                'index': idx,
                'data': res_data,
                'errors': str(e)
            })
    
    # Import financials
    for idx, trans_data in enumerate(data.get('financials', [])):
        try:
            if trans_data.get('paid_date') == '':
                trans_data['paid_date'] = None
            
            serializer = TransactionSerializer(data=trans_data)
            
            if serializer.is_valid():
                serializer.save()
                results['financials']['imported'] += 1
            else:
                results['financials']['errors'].append({
                    'index': idx,
                    'data': trans_data,
                    'errors': serializer.errors
                })
        except Exception as e:
            results['financials']['errors'].append({
                'index': idx,
                'data': trans_data,
                'errors': str(e)
            })
    
    total_imported = (
        results['clients']['imported'] +
        results['units']['imported'] +
        results['reservations']['imported'] +
        results['financials']['imported']
    )
    
    return Response(
        results,
        status=status.HTTP_200_OK if total_imported > 0 else status.HTTP_400_BAD_REQUEST
    )
