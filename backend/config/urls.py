"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from accommodations.views import AccommodationUnitViewSet
from clients.views import ClientViewSet
from reservations.views import ReservationViewSet
from financials.views import TransactionViewSet

# Create a router and register our viewsets
router = DefaultRouter()
router.register(r'accommodations', AccommodationUnitViewSet, basename='accommodationunit')
router.register(r'clients', ClientViewSet, basename='client')
router.register(r'reservations', ReservationViewSet, basename='reservation')
router.register(r'financials', TransactionViewSet, basename='transaction')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
]
