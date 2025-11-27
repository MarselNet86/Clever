from django.contrib import admin
from .models import (
    Group, Test, Question, AnswerOption,
    StudentTestAttempt, StudentAnswer, UserProfile, PerformanceLevel
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
    list_display = ('title', 'get_groups', 'created_by', 'created_at', 'is_active')
    list_filter = ('groups', 'created_by', 'is_active')
    search_fields = ('title',)
    inlines = [QuestionInline]

    def get_groups(self, obj):
        return ", ".join(g.name for g in obj.groups.all())
    get_groups.short_description = "Группы"


@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = ('test', 'order', 'short_text', 'question_type')
    list_filter = ('test', 'question_type')

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


@admin.register(PerformanceLevel)
class PerformanceLevelAdmin(admin.ModelAdmin):
    list_display = ("name", "min_percentage", "max_percentage")
    list_editable = ("min_percentage", "max_percentage")
    search_fields = ("name",)
