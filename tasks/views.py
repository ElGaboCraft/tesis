from datetime import timedelta
import secrets

from django.contrib.auth import authenticate, get_user_model
from django.db.models import Count
from django.utils import timezone
from rest_framework import mixins, status, viewsets
from rest_framework.authtoken.models import Token
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.views import APIView
from rest_framework.response import Response

from .models import Category, Tag, Task, UserSecurity
from .serializers import (
	BasicUserSerializer,
	ChangePasswordSerializer,
	CategorySerializer,
	LoginSerializer,
	TagSerializer,
	TaskSerializer,
	UserCreateSerializer,
	UserResetPasswordSerializer,
	UserUpdateSerializer,
)

User = get_user_model()


class LoginView(APIView):
	permission_classes = [AllowAny]

	def post(self, request):
		# Login directo por usuario/clave. Si sale mal, devolvemos mensaje simple.
		serializer = LoginSerializer(data=request.data)
		serializer.is_valid(raise_exception=True)

		user = authenticate(
			request=request,
			username=serializer.validated_data['username'],
			password=serializer.validated_data['password'],
		)

		if user is None or not user.is_active:
			return Response({'detail': 'Credenciales invalidas.'}, status=status.HTTP_400_BAD_REQUEST)

		UserSecurity.objects.get_or_create(user=user)
		# Token activo de sesion. No tocar a la ligera: frontend depende de esto.
		token, _created = Token.objects.get_or_create(user=user)
		return Response({'token': token.key, 'user': BasicUserSerializer(user).data}, status=status.HTTP_200_OK)


class LogoutView(APIView):
	def post(self, request):
		Token.objects.filter(user=request.user).delete()
		return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(APIView):
	def get(self, request):
		UserSecurity.objects.get_or_create(user=request.user)
		return Response(BasicUserSerializer(request.user).data, status=status.HTTP_200_OK)


class ChangePasswordView(APIView):
	def post(self, request):
		# Punto delicado: si lo rompes, dejas gente bloqueada en el login.
		serializer = ChangePasswordSerializer(data=request.data)
		serializer.is_valid(raise_exception=True)

		user = request.user
		if not user.check_password(serializer.validated_data['current_password']):
			return Response({'detail': 'La contraseña actual es incorrecta.'}, status=status.HTTP_400_BAD_REQUEST)

		user.set_password(serializer.validated_data['new_password'])
		user.save(update_fields=['password'])

		security, _created = UserSecurity.objects.get_or_create(user=user)
		security.must_change_password = False
		security.temp_password_issued_at = None
		security.save(update_fields=['must_change_password', 'temp_password_issued_at'])

		Token.objects.filter(user=user).delete()
		# Renovamos token para que la sesion siga viva tras cambio de clave.
		token = Token.objects.create(user=user)
		return Response({'token': token.key, 'user': BasicUserSerializer(user).data}, status=status.HTTP_200_OK)


class ReferenceDataView(APIView):
	def get(self, request):
		# Payload consolidado para evitar 3 llamadas separadas desde el frontend.
		payload = {
			'users': BasicUserSerializer(User.objects.filter(is_active=True).order_by('first_name', 'username'), many=True).data,
			'categories': CategorySerializer(Category.objects.filter(is_active=True), many=True).data,
			'tags': TagSerializer(Tag.objects.filter(is_active=True), many=True).data,
			'can_manage_users': request.user.is_superuser,
		}
		return Response(payload, status=status.HTTP_200_OK)


class UserViewSet(mixins.ListModelMixin, mixins.CreateModelMixin, mixins.UpdateModelMixin, mixins.DestroyModelMixin, viewsets.GenericViewSet):
	queryset = User.objects.exclude(username='root').order_by('first_name', 'username')
	permission_classes = [IsAdminUser]

	def get_serializer_class(self):
		if self.action == 'create':
			return UserCreateSerializer
		if self.action in ['update', 'partial_update']:
			return UserUpdateSerializer
		return BasicUserSerializer

	def get_queryset(self):
		queryset = super().get_queryset()
		if self.request.query_params.get('include_inactive') == 'true':
			return queryset
		return queryset.filter(is_active=True)

	def update(self, request, *args, **kwargs):
		kwargs['partial'] = True
		return super().update(request, *args, **kwargs)

	def destroy(self, request, *args, **kwargs):
		# Baja logica: no borramos registros para no perder historial operativo.
		user = self.get_object()
		if user.username == 'root':
			return Response({'detail': 'No se puede eliminar el usuario root.'}, status=status.HTTP_400_BAD_REQUEST)
		if request.user.id == user.id:
			return Response({'detail': 'No puedes eliminar tu propio usuario.'}, status=status.HTTP_400_BAD_REQUEST)

		user.is_active = False
		user.save(update_fields=['is_active'])
		Token.objects.filter(user=user).delete()
		return Response(status=status.HTTP_204_NO_CONTENT)

	@action(detail=True, methods=['post'])
	def reset_password(self, request, pk=None):
		# Reset temporal con bandera de cambio obligatorio.
		user = self.get_object()
		if user.username == 'root':
			return Response({'detail': 'No se permite resetear root desde esta accion.'}, status=status.HTTP_400_BAD_REQUEST)

		serializer = UserResetPasswordSerializer(data=request.data)
		serializer.is_valid(raise_exception=True)

		temporary_password = serializer.validated_data.get('temporary_password')
		if not temporary_password:
			temporary_password = self._generate_temporary_password()

		user.set_password(temporary_password)
		user.save(update_fields=['password'])

		security, _created = UserSecurity.objects.get_or_create(user=user)
		security.must_change_password = True
		security.temp_password_issued_at = timezone.now()
		security.save(update_fields=['must_change_password', 'temp_password_issued_at'])

		Token.objects.filter(user=user).delete()
		return Response({'temporary_password': temporary_password}, status=status.HTTP_200_OK)

	def _generate_temporary_password(self):
		# Password aleatoria legible. No tocar o se rompe la magia del "copiar y pegar" humano.
		alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%*'
		return ''.join(secrets.choice(alphabet) for _ in range(14))


class TaskViewSet(viewsets.ModelViewSet):
	serializer_class = TaskSerializer
	queryset = Task.objects.select_related('created_by', 'category').prefetch_related('tags', 'assignees')
	filterset_fields = ['status', 'priority', 'assignees', 'category', 'is_archived']
	search_fields = ['title', 'description', 'assignees__username', 'category__name', 'tags__name']
	ordering_fields = ['created_at', 'updated_at', 'due_date', 'priority', 'progress']
	ordering = ['is_archived', 'due_date', '-updated_at']

	def get_queryset(self):
		# Regla central de visibilidad: admin ve todo, usuario normal solo lo suyo.
		queryset = super().get_queryset().distinct()
		due_bucket = self.request.query_params.get('due_bucket')
		today = timezone.localdate()

		if not self.request.user.is_superuser:
			queryset = queryset.filter(assignees=self.request.user)

		if due_bucket == 'today':
			queryset = queryset.filter(due_date=today)
		elif due_bucket == 'overdue':
			queryset = queryset.filter(due_date__lt=today).exclude(status=Task.STATUS_DONE)
		elif due_bucket == 'upcoming':
			queryset = queryset.filter(due_date__gt=today, due_date__lte=today + timedelta(days=7))

		return queryset

	def perform_create(self, serializer):
		serializer.save(created_by=self.request.user)

	@action(detail=False, methods=['get'])
	def summary(self, request):
		# Resumen ejecutivo del tablero. Se usa arriba en los KPI cards.
		today = timezone.localdate()
		base_queryset = self.get_queryset()
		active_queryset = base_queryset.exclude(status=Task.STATUS_DONE)
		# Ojo: total activo excluye done por definicion de negocio.
		counts = {item['status']: item['total'] for item in base_queryset.values('status').annotate(total=Count('id'))}

		payload = {
			'total': active_queryset.count(),
			'total_all': base_queryset.count(),
			'completed': counts.get(Task.STATUS_DONE, 0),
			'in_progress': counts.get(Task.STATUS_IN_PROGRESS, 0),
			'blocked': counts.get(Task.STATUS_BLOCKED, 0),
			'todo': counts.get(Task.STATUS_TODO, 0),
			'overdue': base_queryset.filter(due_date__lt=today).exclude(status=Task.STATUS_DONE).count(),
			'due_today': base_queryset.filter(due_date=today).exclude(status=Task.STATUS_DONE).count(),
			'high_priority': base_queryset.filter(priority__in=[Task.PRIORITY_HIGH, Task.PRIORITY_URGENT]).count(),
			'archived': base_queryset.filter(is_archived=True).count(),
			'by_priority': {item['priority']: item['total'] for item in base_queryset.values('priority').annotate(total=Count('id'))},
			'by_category': list(
				base_queryset.exclude(category__isnull=True)
				.values('category__name')
				.annotate(total=Count('id'))
				.order_by('-total', 'category__name')[:6]
			),
			'completion_rate': round((base_queryset.filter(status=Task.STATUS_DONE).count() / base_queryset.count()) * 100, 1) if base_queryset.exists() else 0,
		}
		return Response(payload, status=status.HTTP_200_OK)

	@action(detail=False, methods=['get'])
	def board(self, request):
		# Armamos columnas por estado para pintar directo en frontend.
		columns = {}
		queryset = self.filter_queryset(self.get_queryset())
		for key, _label in Task.STATUS_CHOICES:
			columns[key] = TaskSerializer(queryset.filter(status=key), many=True).data
		return Response(columns, status=status.HTTP_200_OK)
