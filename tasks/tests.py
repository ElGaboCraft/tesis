from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from .models import Category, Tag, Task, UserSecurity

User = get_user_model()


class TaskApiTests(TestCase):
	# Tests del dominio principal de tareas.
	def setUp(self):
		self.client = APIClient()
		self.user = User.objects.create_user(username='analista', password='T3stPass!234', first_name='Ana')
		self.token = Token.objects.create(user=self.user)
		self.category = Category.objects.get(slug='infraestructura-cloud')
		self.tag = Tag.objects.get(slug='vpn')

	def authenticate(self):
		self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')

	def test_requires_authentication(self):
		response = self.client.get('/api/tasks/')
		self.assertIn(response.status_code, [401, 403])

	def test_create_task(self):
		self.authenticate()
		response = self.client.post(
			'/api/tasks/',
			{
				'title': 'Preparar mantenimiento de VPN',
				'status': Task.STATUS_TODO,
				'priority': Task.PRIORITY_HIGH,
				'progress': 20,
				'assignee_ids': [self.user.id],
				'category_id': self.category.id,
				'tag_ids': [self.tag.id],
			},
			format='json',
		)

		self.assertEqual(response.status_code, 201)
		self.assertEqual(Task.objects.count(), 1)
		self.assertTrue(Task.objects.first().assignees.filter(id=self.user.id).exists())

	def test_summary_endpoint(self):
		# Validamos que "total" represente activas y no todo el universo.
		self.authenticate()
		task_done = Task.objects.create(title='A', status=Task.STATUS_DONE, created_by=self.user, category=self.category)
		task_blocked = Task.objects.create(title='B', status=Task.STATUS_BLOCKED, created_by=self.user, category=self.category)
		task_done.assignees.add(self.user)
		task_blocked.assignees.add(self.user)

		response = self.client.get('/api/tasks/summary/')

		self.assertEqual(response.status_code, 200)
		self.assertEqual(response.data['total'], 1)
		self.assertEqual(response.data['completed'], 1)


class UserAdminApiTests(TestCase):
	# Cobertura de permisos admin para gestion de usuarios.
	def setUp(self):
		self.client = APIClient()
		self.admin = User.objects.create_superuser(username='root_test', password='AdminPass!234', email='root@test.local')
		self.user = User.objects.create_user(username='operador', password='UserPass!234')
		self.admin_token = Token.objects.create(user=self.admin)
		self.user_token = Token.objects.create(user=self.user)

	def test_only_admin_can_create_users(self):
		self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.user_token.key}')
		forbidden = self.client.post('/api/users/', {'username': 'nuevo', 'password': 'SafePass!234'}, format='json')
		self.assertEqual(forbidden.status_code, 403)

		self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.admin_token.key}')
		allowed = self.client.post(
			'/api/users/',
			{
				'username': 'nuevo',
				'first_name': 'Nuevo',
				'last_name': 'Usuario',
				'email': 'nuevo@example.com',
				'password': 'SafePass!234',
			},
			format='json',
		)
		self.assertEqual(allowed.status_code, 201)

	def test_admin_can_reset_temporary_password(self):
		self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.admin_token.key}')
		response = self.client.post(f'/api/users/{self.user.id}/reset_password/', {}, format='json')

		self.assertEqual(response.status_code, 200)
		self.assertIn('temporary_password', response.data)

		self.user.refresh_from_db()
		security = UserSecurity.objects.get(user=self.user)
		self.assertTrue(security.must_change_password)


class PasswordFlowTests(TestCase):
	# Flujo de cambio de clave obligatorio cuando hay contraseña temporal.
	def setUp(self):
		self.client = APIClient()
		self.user = User.objects.create_user(username='temporal', password='TempPass!234')
		self.token = Token.objects.create(user=self.user)

		security, _created = UserSecurity.objects.get_or_create(user=self.user)
		security.must_change_password = True
		security.save(update_fields=['must_change_password'])

		self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')

	def test_change_password_clears_force_flag(self):
		response = self.client.post(
			'/api/auth/change-password/',
			{
				'current_password': 'TempPass!234',
				'new_password': 'NuevaPass!234',
			},
			format='json',
		)

		self.assertEqual(response.status_code, 200)
		self.assertIn('token', response.data)

		self.user.refresh_from_db()
		security = UserSecurity.objects.get(user=self.user)
		self.assertFalse(security.must_change_password)
