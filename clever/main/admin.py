from django.contrib import admin
from .models import (
    Group, Test, Question, AnswerOption,
    StudentTestAttempt, StudentAnswer, UserProfile
)


@admin.register(Group)
class GroupAdmin(admin.ModelAdmin):
    list_display = ('name', 'created_by', 'created_at')
    search_fields = ('name',)
    list_filter = ('created_by',)


class AnswerOptionInline(admin.TabularInline):
    model = AnswerOption
    extra = 1


class QuestionInline(admin.StackedInline):
    model = Question
    extra = 1


@admin.register(Test)
class TestAdmin(admin.ModelAdmin):
    list_display = ('title', 'group', 'created_by', 'created_at', 'is_active')
    list_filter = ('group', 'created_by', 'is_active')
    search_fields = ('title',)
    inlines = [QuestionInline]     # вопросы редактируются прямо в тесте


@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = ('test', 'order', 'short_text')
    list_filter = ('test',)
    inlines = [AnswerOptionInline]  # варианты ответов прямо в вопросе

    def short_text(self, obj):
        return obj.text[:60]
    short_text.short_description = 'Текст'


@admin.register(AnswerOption)
class AnswerOptionAdmin(admin.ModelAdmin):
    list_display = ('question', 'text', 'is_correct', 'order')
    list_filter = ('question__test', 'is_correct')
    search_fields = ('text',)


@admin.register(StudentTestAttempt)
class StudentTestAttemptAdmin(admin.ModelAdmin):
    list_display = ('student', 'test', 'started_at', 'finished_at', 'score', 'max_score', 'percentage')
    list_filter = ('test', 'student')


@admin.register(StudentAnswer)
class StudentAnswerAdmin(admin.ModelAdmin):
    list_display = ('attempt', 'question', 'selected_option', 'is_correct', 'answered_at')
    list_filter = ('attempt__test', 'is_correct')


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'role', 'group')
    list_filter = ('role', 'group')
    search_fields = ('user__username',)
