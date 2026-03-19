from rest_framework.routers import DefaultRouter

from django.urls import path

from .views import ChangePasswordView, LoginView, LogoutView, MeView, ReferenceDataView, TaskViewSet, UserViewSet

router = DefaultRouter()

# Router principal de recursos REST.
router.register('tasks', TaskViewSet, basename='task')
router.register('users', UserViewSet, basename='user')

urlpatterns = [
	# Endpoints de sesion y bootstrap de datos para la UI.
	path('auth/login/', LoginView.as_view(), name='login'),
	path('auth/logout/', LogoutView.as_view(), name='logout'),
	path('auth/me/', MeView.as_view(), name='me'),
	path('auth/change-password/', ChangePasswordView.as_view(), name='change-password'),
	path('reference-data/', ReferenceDataView.as_view(), name='reference-data'),
] + router.urls