from django.contrib import admin

from .models import Category, Tag, Task


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
	# Admin simple para mantener catalogo oficial de categorias.
	list_display = ('name', 'domain', 'is_active')
	list_filter = ('domain', 'is_active')
	search_fields = ('name', 'slug', 'description')


@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
	# Mismo criterio que categorias: pocas columnas, busqueda rapida.
	list_display = ('name', 'domain', 'is_active')
	list_filter = ('domain', 'is_active')
	search_fields = ('name', 'slug', 'description')


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
	# Vista de operaciones: lo justo para gestionar sin perderse en ruido.
	list_display = ('title', 'status', 'priority', 'category', 'due_date', 'progress', 'is_archived')
	list_filter = ('status', 'priority', 'is_archived', 'category')
	search_fields = ('title', 'description', 'assignees__username', 'category__name')
	ordering = ('is_archived', 'due_date', '-updated_at')
	autocomplete_fields = ('assignees', 'created_by', 'category', 'tags')
