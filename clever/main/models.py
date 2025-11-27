from django.db import models
from django.contrib.auth.models import User, AbstractUser
from django.conf import settings


class CustomUser(AbstractUser):
    # Email будет использоваться для входа
    email = models.EmailField(
        unique=True,
        verbose_name="Email"
    )
    
    # Username теперь хранит ФИО (не используется для входа)
    username = models.CharField(
        max_length=150,
        unique=False,  # Теперь не должно быть уникальным
        verbose_name="ФИО",
        blank=True,  # Можно оставить пустым при создании
    )
    
    # Отключаем стандартные поля
    first_name = None
    last_name = None
    
    # Указываем, что для входа используется email
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']  # Поля, которые запрашиваются при createsuperuser (кроме email и password)
    
    class Meta:
        verbose_name = 'Пользователь'
        verbose_name_plural = 'Пользователи'
    
    def __str__(self):
        return f"{self.username or self.email}"


class Group(models.Model):
    """Учебная группа"""
    name = models.CharField(max_length=50, unique=True, verbose_name='Название группы')
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='groups_created', verbose_name='Создана преподавателем'
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
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='created_tests',
        verbose_name='Создатель'
    )
    groups = models.ManyToManyField(
        'Group',
        related_name='tests',
        verbose_name='Группы'
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Дата создания')
    is_active = models.BooleanField(default=True, verbose_name='Активен')

    class Meta:
        verbose_name = 'Тест'
        verbose_name_plural = 'Тесты'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} ({self.group})"


class Question(models.Model):

    QUESTION_TYPES = (
        ('choice', 'Вариант ответа'),    # текущий тип
        ('open', 'Открытый вопрос'),     # новый тип
    )

    test = models.ForeignKey(
        Test, on_delete=models.CASCADE,
        related_name='questions',
        verbose_name='Тест'
    )
    text = models.TextField(verbose_name='Текст вопроса')
    image = models.ImageField(upload_to='question_images/', blank=True, null=True)

    order = models.IntegerField(default=0)
    question_type = models.CharField(
        max_length=10, choices=QUESTION_TYPES, default='choice',
        verbose_name='Тип вопроса'
    )

    def __str__(self):
        return f"Q{self.order} ({self.question_type})"


class AnswerOption(models.Model):
    """Модель варианта ответа на вопрос"""
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name='answers')

    text = models.CharField(max_length=500, verbose_name='Текст ответа')
    is_correct = models.BooleanField(default=False, verbose_name='Правильный ответ')
    order = models.IntegerField(default=0, verbose_name='Порядковый номер')

    class Meta:
        verbose_name = 'Вариант ответа'
        verbose_name_plural = 'Варианты ответов'
        ordering = ['order']

    def __str__(self):
        return f"{self.text} {'✓' if self.is_correct else ''}"
    

class PerformanceLevel(models.Model):
    name = models.CharField("Название уровня", max_length=100)
    min_percentage = models.PositiveIntegerField("Минимальный %")
    max_percentage = models.PositiveIntegerField("Максимальный %")
    description = models.TextField("Описание уровня", blank=True)
    recommendations = models.TextField("Рекомендации", blank=True)

    class Meta:
        verbose_name = "Уровень выполнения"
        verbose_name_plural = "Уровни выполнения"
        ordering = ['min_percentage']

    def __str__(self):
        return f"{self.name} ({self.min_percentage}-{self.max_percentage}%)"
    

class TestResult(models.Model):
    test = models.ForeignKey(Test, on_delete=models.CASCADE, related_name='results')
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    score = models.IntegerField(default=0)
    performance_level = models.ForeignKey(
        PerformanceLevel,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name="Уровень"
    )
    total_questions = models.IntegerField(default=0)
    time_spent = models.IntegerField(default=0)  # в секундах
    completed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-completed_at']


class UserAnswer(models.Model):
    test_result = models.ForeignKey(TestResult, on_delete=models.CASCADE, related_name='answers')
    text_answer = models.TextField(blank=True, null=True)
    question = models.ForeignKey(Question, on_delete=models.CASCADE)
    selected_answer = models.ForeignKey(
        AnswerOption,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='user_answers'
    )

    
    class Meta:
        unique_together = ('test_result', 'question')


class StudentTestAttempt(models.Model):
    """Модель попытки прохождения теста студентом"""
    test = models.ForeignKey(
        Test, 
        on_delete=models.CASCADE, 
        related_name='attempts',
        verbose_name='Тест'
    )
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
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
        AnswerOption, on_delete=models.CASCADE,
        null=True, blank=True
    )

    open_answer = models.TextField(
        blank=True, null=True,
        verbose_name="Ответ на открытый вопрос"
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
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='profile'
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
