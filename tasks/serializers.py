from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.utils import timezone
from rest_framework import serializers

from .models import Category, Tag, Task, UserSecurity

User = get_user_model()


class BasicUserSerializer(serializers.ModelSerializer):
	# Serializer liviano para listas y cabeceras de UI.
    full_name = serializers.SerializerMethodField()
    must_change_password = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'email', 'is_superuser', 'is_active', 'full_name', 'must_change_password']

    def get_full_name(self, obj):
        full_name = obj.get_full_name().strip()
        return full_name or obj.username

    def get_must_change_password(self, obj):
        security = getattr(obj, 'security', None)
        return bool(security and security.must_change_password)


class UserCreateSerializer(serializers.ModelSerializer):
	# Alta de usuarios por admin. Se marca cambio de clave obligatorio desde el dia 1.
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'email', 'password']

    def validate_password(self, value):
        validate_password(value)
        return value

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        UserSecurity.objects.update_or_create(
            user=user,
            defaults={'must_change_password': True, 'temp_password_issued_at': timezone.now()},
        )
        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'email', 'is_active']


class UserResetPasswordSerializer(serializers.Serializer):
    temporary_password = serializers.CharField(required=False, allow_blank=False)

    def validate_temporary_password(self, value):
        validate_password(value)
        return value


class ChangePasswordSerializer(serializers.Serializer):
	# Cambio de clave del propio usuario (flujo normal + primer ingreso forzado).
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True)

    def validate_new_password(self, value):
        validate_password(value)
        return value


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'domain', 'description']


class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = ['id', 'name', 'slug', 'domain', 'description']


class TaskSerializer(serializers.ModelSerializer):
	# Serializer principal de tareas para board + formulario de edicion.
    days_remaining = serializers.SerializerMethodField()
    assignees = BasicUserSerializer(read_only=True, many=True)
    assignee_ids = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(is_active=True),
        source='assignees',
        many=True,
        write_only=True,
        required=False,
    )
    created_by = BasicUserSerializer(read_only=True)
    category = CategorySerializer(read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.filter(is_active=True),
        source='category',
        write_only=True,
        allow_null=True,
        required=False,
    )
    tags = TagSerializer(read_only=True, many=True)
    tag_ids = serializers.PrimaryKeyRelatedField(
        queryset=Tag.objects.filter(is_active=True),
        source='tags',
        many=True,
        write_only=True,
        required=False,
    )

    class Meta:
        model = Task
        fields = [
            'id',
            'title',
            'description',
            'status',
            'priority',
            'assignees',
            'assignee_ids',
            'created_by',
            'category',
            'category_id',
            'due_date',
            'estimated_hours',
            'progress',
            'tags',
            'tag_ids',
            'is_archived',
            'completed_at',
            'created_at',
            'updated_at',
            'days_remaining',
        ]
        read_only_fields = ['completed_at', 'created_at', 'updated_at', 'days_remaining', 'created_by']

    def validate_progress(self, value):
        if value < 0 or value > 100:
            raise serializers.ValidationError('El progreso debe estar entre 0 y 100.')
        return value

    def validate(self, attrs):
		# Regla de negocio: una tarea nueva sin responsables no tiene sentido operativo.
        assignees = attrs.get('assignees')
        if self.instance is None and not assignees:
            raise serializers.ValidationError({'assignee_ids': 'Debes asignar al menos un usuario.'})
        return attrs

    def get_days_remaining(self, obj):
        if not obj.due_date:
            return None
        return (obj.due_date - timezone.localdate()).days


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)