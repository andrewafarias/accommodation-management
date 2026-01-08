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
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import path, include, re_path
from django.shortcuts import render
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework.routers import DefaultRouter
from accommodations.views import AccommodationUnitViewSet, DatePriceOverrideViewSet, DatePackageViewSet, UnitImageViewSet
from clients.views import ClientViewSet
from reservations.views import ReservationViewSet
from financials.views import TransactionViewSet
from core.views import export_all_data, import_all_data, login_view, logout_view, user_info_view, robots_txt_view


@ensure_csrf_cookie
def spa_view(request):
    """
    Catch-all view to serve the React SPA.
    This allows the React Router to handle client-side routing.
    """
    return render(request, 'index.html')

# Create a router and register our viewsets
router = DefaultRouter()
router.register(r'accommodations', AccommodationUnitViewSet, basename='accommodationunit')
router.register(r'date-price-overrides', DatePriceOverrideViewSet, basename='datepriceoverride')
router.register(r'date-packages', DatePackageViewSet, basename='datepackage')
router.register(r'unit-images', UnitImageViewSet, basename='unitimage')
router.register(r'clients', ClientViewSet, basename='client')
router.register(r'reservations', ReservationViewSet, basename='reservation')
router.register(r'financials', TransactionViewSet, basename='transaction')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('robots.txt', robots_txt_view, name='robots-txt'),
    path('api/', include(router.urls)),
    path('api/auth/login/', login_view, name='login'),
    path('api/auth/logout/', logout_view, name='logout'),
    path('api/auth/user/', user_info_view, name='user-info'),
    path('api/export-all/', export_all_data, name='export-all'),
    path('api/import-all/', import_all_data, name='import-all'),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

# Catch-all pattern for SPA routing - must be last
urlpatterns += [
    re_path(r'^.*$', spa_view, name='spa'),
]
