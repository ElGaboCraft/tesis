from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone


class Category(models.Model):
	# Diccionario cerrado de categorias para que no haya nombres inventados por cada usuario.
	DOMAIN_SYSTEMS = 'sistemas'
	DOMAIN_INFRASTRUCTURE = 'infraestructura'
	DOMAIN_SUPPORT = 'soporte'

	DOMAIN_CHOICES = [
		(DOMAIN_SYSTEMS, 'Sistemas'),
		(DOMAIN_INFRASTRUCTURE, 'Infraestructura'),
		(DOMAIN_SUPPORT, 'Soporte tecnico'),
	]

	name = models.CharField(max_length=120, unique=True)
	slug = models.SlugField(max_length=140, unique=True)
	domain = models.CharField(max_length=20, choices=DOMAIN_CHOICES, db_index=True)
	description = models.CharField(max_length=255, blank=True)
	is_active = models.BooleanField(default=True)

	class Meta:
		ordering = ['domain', 'name']

	def __str__(self):
		return self.name


class Tag(models.Model):
	# Etiquetas reutilizables para clasificar tareas sin texto libre caotico.
	name = models.CharField(max_length=80, unique=True)
	slug = models.SlugField(max_length=100, unique=True)
	description = models.CharField(max_length=255, blank=True)
	domain = models.CharField(max_length=20, choices=Category.DOMAIN_CHOICES, db_index=True)
	is_active = models.BooleanField(default=True)

	class Meta:
		ordering = ['domain', 'name']

	def __str__(self):
		return self.name


class UserSecurity(models.Model):
	# Estado de seguridad del usuario: por ahora se usa para forzar cambio de clave.
	user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='security')
	must_change_password = models.BooleanField(default=False)
	temp_password_issued_at = models.DateTimeField(null=True, blank=True)

	class Meta:
		verbose_name = 'Seguridad de usuario'
		verbose_name_plural = 'Seguridad de usuarios'

	def __str__(self):
		return f'Seguridad de {self.user.username}'


class Task(models.Model):
	# Entidad principal del proyecto. Si esta se rompe, el tablero entero sufre.
	STATUS_TODO = 'todo'
	STATUS_IN_PROGRESS = 'in_progress'
	STATUS_BLOCKED = 'blocked'
	STATUS_DONE = 'done'

	PRIORITY_LOW = 'low'
	PRIORITY_MEDIUM = 'medium'
	PRIORITY_HIGH = 'high'
	PRIORITY_URGENT = 'urgent'

	STATUS_CHOICES = [
		(STATUS_TODO, 'Pendiente'),
		(STATUS_IN_PROGRESS, 'En progreso'),
		(STATUS_BLOCKED, 'Bloqueada'),
		(STATUS_DONE, 'Completada'),
	]

	PRIORITY_CHOICES = [
		(PRIORITY_LOW, 'Baja'),
		(PRIORITY_MEDIUM, 'Media'),
		(PRIORITY_HIGH, 'Alta'),
		(PRIORITY_URGENT, 'Urgente'),
	]

	title = models.CharField(max_length=160)
	description = models.TextField(blank=True)
	status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_TODO, db_index=True)
	priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default=PRIORITY_MEDIUM, db_index=True)
	assignees = models.ManyToManyField(
		settings.AUTH_USER_MODEL,
		blank=True,
		related_name='assigned_tasks',
	)
	created_by = models.ForeignKey(
		settings.AUTH_USER_MODEL,
		on_delete=models.PROTECT,
		related_name='created_tasks',
		null=True,
		blank=True,
	)
	category = models.ForeignKey(
		Category,
		on_delete=models.PROTECT,
		related_name='tasks',
		null=True,
		blank=True,
	)
	due_date = models.DateField(null=True, blank=True, db_index=True)
	estimated_hours = models.PositiveIntegerField(null=True, blank=True)
	progress = models.PositiveSmallIntegerField(default=0)
	tags = models.ManyToManyField(Tag, blank=True, related_name='tasks')
	is_archived = models.BooleanField(default=False, db_index=True)
	completed_at = models.DateTimeField(null=True, blank=True)
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		ordering = ['is_archived', 'due_date', '-updated_at']

	def __str__(self):
		return self.title

	def clean(self):
		if self.progress > 100:
			raise ValidationError({'progress': 'El progreso no puede ser mayor a 100.'})

	def save(self, *args, **kwargs):
		# No tocar esta parte sin cuidado: mantiene coherencia entre estado, progreso y fecha de cierre.
		self.full_clean()

		if self.status == self.STATUS_DONE:
			self.progress = 100
			if self.completed_at is None:
				self.completed_at = timezone.now()
		elif self.completed_at is not None:
			self.completed_at = None

		super().save(*args, **kwargs)
