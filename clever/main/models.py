from django.db import models
from django.contrib.auth.models import User


class Group(models.Model):
    """Учебная группа"""
    name = models.CharField(max_length=50, unique=True, verbose_name='Название группы')
    created_by = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='groups_created', verbose_name='Создана преподавателем'
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Дата создания')

    class Meta:
        verbose_name = 'Группа'
        verbose_name_plural = 'Группы'
        ordering = ['name']

    def __str__(self):
        return self.name


class Test(models.Model):
    """Модель теста/контрольной работы"""
    title = models.CharField(max_length=200, verbose_name='Название теста')
    description = models.TextField(blank=True, null=True, verbose_name='Описание')
    created_by = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='created_tests',
        verbose_name='Создатель'
    )
    group = models.ForeignKey('Group', on_delete=models.PROTECT, related_name='tests', verbose_name='Группа')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Дата создания')
    is_active = models.BooleanField(default=True, verbose_name='Активен')

    class Meta:
        verbose_name = 'Тест'
        verbose_name_plural = 'Тесты'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} ({self.group})"


class Question(models.Model):
    """Модель вопроса в тесте"""
    test = models.ForeignKey(
        Test, 
        on_delete=models.CASCADE, 
        related_name='questions',
        verbose_name='Тест'
    )
    text = models.TextField(verbose_name='Текст вопроса')
    image = models.ImageField(
        upload_to='question_images/', 
        blank=True, 
        null=True,
        verbose_name='Изображение'
    )
    order = models.IntegerField(default=0, verbose_name='Порядковый номер')

    class Meta:
        verbose_name = 'Вопрос'
        verbose_name_plural = 'Вопросы'
        ordering = ['order']

    def __str__(self):
        return f"Вопрос {self.order}: {self.text[:50]}..."


class AnswerOption(models.Model):
    """Модель варианта ответа на вопрос"""
    question = models.ForeignKey(
        Question, 
        on_delete=models.CASCADE, 
        related_name='options',
        verbose_name='Вопрос'
    )
    text = models.CharField(max_length=500, verbose_name='Текст ответа')
    is_correct = models.BooleanField(default=False, verbose_name='Правильный ответ')
    order = models.IntegerField(default=0, verbose_name='Порядковый номер')

    class Meta:
        verbose_name = 'Вариант ответа'
        verbose_name_plural = 'Варианты ответов'
        ordering = ['order']

    def __str__(self):
        return f"{self.text} {'✓' if self.is_correct else ''}"


class StudentTestAttempt(models.Model):
    """Модель попытки прохождения теста студентом"""
    test = models.ForeignKey(
        Test, 
        on_delete=models.CASCADE, 
        related_name='attempts',
        verbose_name='Тест'
    )
    student = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='test_attempts',
        verbose_name='Студент'
    )
    started_at = models.DateTimeField(auto_now_add=True, verbose_name='Начало прохождения')
    finished_at = models.DateTimeField(null=True, blank=True, verbose_name='Окончание прохождения')
    score = models.IntegerField(null=True, blank=True, verbose_name='Баллы')
    max_score = models.IntegerField(null=True, blank=True, verbose_name='Максимум баллов')

    class Meta:
        verbose_name = 'Попытка прохождения теста'
        verbose_name_plural = 'Попытки прохождения тестов'
        ordering = ['-started_at']

    def __str__(self):
        return f"{self.student.username} → {self.test.title}"

    @property
    def percentage(self):
        """Процент правильных ответов"""
        if self.max_score and self.score is not None:
            return round((self.score / self.max_score) * 100, 1)
        return 0

    @property
    def is_finished(self):
        """Завершен ли тест"""
        return self.finished_at is not None


class StudentAnswer(models.Model):
    """Модель ответа студента на вопрос"""
    attempt = models.ForeignKey(
        StudentTestAttempt, 
        on_delete=models.CASCADE, 
        related_name='answers',
        verbose_name='Попытка'
    )
    question = models.ForeignKey(
        Question, 
        on_delete=models.CASCADE,
        verbose_name='Вопрос'
    )
    selected_option = models.ForeignKey(
        AnswerOption, 
        on_delete=models.CASCADE,
        verbose_name='Выбранный вариант'
    )
    is_correct = models.BooleanField(default=False, verbose_name='Правильно')
    answered_at = models.DateTimeField(auto_now_add=True, verbose_name='Время ответа')

    class Meta:
        verbose_name = 'Ответ студента'
        verbose_name_plural = 'Ответы студентов'
        unique_together = ['attempt', 'question']  # Один ответ на вопрос в попытке

    def __str__(self):
        return f"{self.attempt.student.username} → Q{self.question.order}"
    


class UserProfile(models.Model):
    """Профиль пользователя"""
    ROLE_CHOICES = (
        ('teacher', 'Преподаватель'),
        ('student', 'Студент'),
    )

    user = models.OneToOneField(
        User, 
        on_delete=models.CASCADE, 
        related_name='profile',
        verbose_name='Пользователь'
    )
    role = models.CharField(
        max_length=10, 
        choices=ROLE_CHOICES, 
        default='student',
        verbose_name='Роль'
    )
    group = models.ForeignKey('Group', null=True, blank=True, on_delete=models.SET_NULL,
                              related_name='students', verbose_name='Группа')

    class Meta:
        verbose_name = 'Профиль пользователя'
        verbose_name_plural = 'Профили пользователей'

    def __str__(self):
        tag = 'преподаватель' if self.role == 'teacher' else f'студент [{self.group or "без группы"}]'
        return f"{self.user.username} ({tag})"