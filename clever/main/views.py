import json
import re

from django.contrib.auth import authenticate, get_user_model, login, logout
from django.contrib.auth.decorators import login_required
from django.db.models import Avg, Count
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.views.decorators.http import require_http_methods

from .forms import LoginForm, RegisterForm
from .models import (
    AnswerOption,
    Group,
    Question,
    Test,
    TestLevel,
    TestResult,
    UserAnswer,
    UserProfile,
)

User = get_user_model()


def get_student_level(test, score_percent):
    """Вспомогательная функция для определения уровня"""
    score_percent = round(score_percent)

    # Пытаемся найти уровень в диапазоне
    level = test.levels.filter(
        min_percent__lte=score_percent, max_percent__gte=score_percent
    ).first()

    # Если не нашли (из-за дырок или если результат 101%), берем ближайший
    if not level:
        if score_percent <= 0:
            return test.levels.order_by("order").first()
        return test.levels.order_by("order").last()

    return level


@login_required
def home_view(request):
    profile = request.user.profile

    if profile.role == "student":
        return redirect("main:student_home")
    elif profile.role == "teacher":
        return redirect("main:teacher_home")


@login_required
def teacher_home(request):
    if request.user.profile.role != "teacher":
        return redirect("main:home")

    groups = Group.objects.filter(created_by=request.user).order_by("name")

    # Получаем все тесты преподавателя с аннотациями
    my_tests = (
        Test.objects.filter(created_by=request.user)
        .prefetch_related("questions", "results", "groups", "levels")
        .annotate(results_count=Count("results"), avg_score=Avg("results__score"))
        .order_by("-created_at")
    )

    levels_map = {}
    for t in my_tests:
        levels_map[t.id] = {lvl.order: lvl for lvl in t.levels.all()}

    # Получаем все результаты студентов для всех тестов преподавателя
    all_results = (
        TestResult.objects.filter(test__created_by=request.user)
        .select_related("test", "student", "student__profile")
        .prefetch_related("answers")
        .order_by("-completed_at")
    )

    # Форматируем результаты для отображения
    results_data = []
    for result in all_results:
        percentage = 0
        if result.total_questions:
            percentage = round((result.score / result.total_questions) * 100, 1)

        results_data.append(
            {
                "id": result.id,
                "test_title": result.test.title,
                "test_id": result.test.id,
                "student_name": result.student.username,
                "student_group": result.student.profile.group or "Без группы",
                "score": result.score,
                "total": result.total_questions,
                "percentage": percentage,
                "time_spent": result.time_spent,
                "time_formatted": f"{result.time_spent // 60:02d}:{result.time_spent % 60:02d}",
                "completed_at": result.completed_at.strftime("%d.%m.%Y %H:%M"),
                "passed": percentage >= 60,
            }
        )

    return render(
        request,
        "main/teach_panel.html",
        {
            "groups": groups,
            "my_tests": my_tests,
            "results_data": results_data,
            "levels_map": levels_map,
        },
    )


@login_required
def test_levels(request, test_id):
    if request.user.profile.role != "teacher":
        return redirect("main:home")

    test = get_object_or_404(Test, id=test_id, created_by=request.user)

    if request.method == "POST":
        TestLevel.objects.filter(test=test).delete()

        try:
            levels_count = int(request.POST.get("levels_count", 0))
        except (TypeError, ValueError):
            levels_count = 0

        prev_max = -1  # чтобы первый min стал 0

        for i in range(1, levels_count + 1):
            # max берём из формы
            raw_max = request.POST.get(f"level_{i}_max")

            # для последнего уровня можно принудительно ставить 100
            if i == levels_count:
                max_percent = 100
            else:
                try:
                    max_percent = int(raw_max)
                except (TypeError, ValueError):
                    max_percent = 0

            # min вычисляем
            min_percent = prev_max + 1
            prev_max = max_percent

            TestLevel.objects.create(
                test=test,
                title=(request.POST.get(f"level_{i}_title") or "").strip(),
                min_percent=min_percent,
                max_percent=max_percent,
                description=(request.POST.get(f"level_{i}_description") or "").strip(),
                recommendations=(
                    request.POST.get(f"level_{i}_recommendations") or ""
                ).strip(),
                order=i,
            )

        return redirect("main:teacher_home")

    return redirect("main:teacher_home")


@login_required
def create_group(request):
    if request.user.profile.role != "teacher":
        return redirect("main:home")

    if request.method == "POST":
        name = request.POST.get("group_name").strip()

        if Group.objects.filter(name=name).exists():
            return render(
                request,
                "main/teach_panel.html",
                {"error": "Группа с таким именем уже существует."},
            )

        Group.objects.create(name=name, created_by=request.user)
        return redirect("main:teacher_home")

    return redirect("main:teacher_home")


@login_required
def create_test(request):
    if request.user.profile.role != "teacher":
        return redirect("main:home")

    if request.method == "POST":
        group_ids = request.POST.getlist("group_ids")

        test = Test.objects.create(
            created_by=request.user,
            title=request.POST.get("test_title"),
            description=request.POST.get("test_description") or "",
        )
        test.groups.set(group_ids)

        # Собираем только настоящие поля "текст вопроса": question_1_text, question_2_text ...
        question_nums = []
        for key in request.POST.keys():
            m = re.match(r"^question_(\d+)_text$", key)
            if m:
                question_nums.append(int(m.group(1)))

        for num in sorted(set(question_nums)):
            question_type = request.POST.get(f"question_{num}_type")

            q = Question.objects.create(
                test=test,
                text=request.POST.get(f"question_{num}_text"),
                image=request.FILES.get(f"question_{num}_image"),
                order=num,
                question_type=question_type,
            )

            if question_type == "open":
                correct_text = request.POST.get(
                    f"question_{num}_correct_text", ""
                ).strip()
                q.correct_text_answer = correct_text
                q.save()

            elif question_type == "choice":
                correct = request.POST.get(f"question_{num}_correct")

                try:
                    cnt = int(request.POST.get(f"question_{num}_answers_count", 0))
                except ValueError:
                    cnt = 0

                for i in range(1, cnt + 1):
                    answer_text = request.POST.get(f"question_{num}_answer_{i}")
                    if answer_text:
                        AnswerOption.objects.create(
                            question=q,
                            text=answer_text,
                            order=i,
                            is_correct=(str(i) == str(correct)),
                        )

        return redirect("main:teacher_home")

    return redirect("main:teacher_home")


@login_required
def test_detail_results(request, test_id):
    if request.user.profile.role != "teacher":
        return JsonResponse({"error": "Access denied"}, status=403)

    test = get_object_or_404(Test, id=test_id, created_by=request.user)

    # Получаем все результаты для этого теста
    results = (
        TestResult.objects.filter(test=test)
        .select_related("student", "student__profile")
        .order_by("-completed_at")
    )

    # Форматируем данные
    results_data = []
    for result in results:
        percentage = 0
        if result.total_questions:
            percentage = round((result.score / result.total_questions) * 100, 1)

        results_data.append(
            {
                "id": result.id,
                "student_name": result.student.get_full_name()
                or result.student.username,
                "student_username": result.student.username,
                "student_group": result.student.profile.group.name
                if result.student.profile.group
                else "Без группы",
                "score": result.score,
                "total": result.total_questions,
                "percentage": percentage,
                "time_spent": result.time_spent,
                "time_formatted": f"{result.time_spent // 60:02d}:{result.time_spent % 60:02d}",
                "completed_at": result.completed_at.strftime("%d.%m.%Y %H:%M"),
                "passed": percentage >= 60,
            }
        )

    return JsonResponse(
        {
            "test_title": test.title,
            "test_description": test.description,
            "group_name": test.group.name,
            "questions_count": test.questions.count(),
            "created_at": test.created_at.strftime("%d.%m.%Y"),
            "results": results_data,
            "total_completed": len(results_data),
        }
    )


@login_required
@require_http_methods(["POST"])
def delete_test(request, test_id):
    if request.user.profile.role != "teacher":
        return redirect("main:home")

    test = get_object_or_404(Test, id=test_id, created_by=request.user)
    test.delete()

    return redirect("main:teacher_home")


@login_required
def student_home(request):
    if request.user.profile.role != "student":
        return redirect("main:home")

    student_group = request.user.profile.group
    tests = (
        Test.objects.filter(groups=student_group)
        .prefetch_related("questions")
        .order_by("-created_at")
    )
    completed_tests = TestResult.objects.filter(student=request.user).values_list(
        "test_id", flat=True
    )

    tests_data = []
    for test in tests:
        test_info = {
            "test": test,
            "is_completed": test.id in completed_tests,
            "result": None,
        }

        if test_info["is_completed"]:
            r = TestResult.objects.filter(test=test, student=request.user).first()
            test_info["result"] = r

            total_q = r.total_questions or 0
            score = r.score or 0
            percentage = (score / total_q * 100) if total_q > 0 else 0

            # --- ПОЛУЧАЕМ УРОВЕНЬ ---
            level = get_student_level(test, percentage)
            test_info["level"] = level

            test_info["pass_threshold"] = total_q * 0.6
            test_info["minutes"] = r.time_spent // 60
            test_info["seconds"] = r.time_spent % 60
            test_info["completed_at_fmt"] = r.completed_at.strftime("%d.%m.%Y %H:%M")
            test_info["time_fmt"] = f"{r.time_spent // 60:02d}:{r.time_spent % 60:02d}"

        tests_data.append(test_info)

    return render(request, "main/student_panel.html", {"tests_data": tests_data})


@login_required
@require_http_methods(["GET"])
def start_test(request, test_id):
    if request.user.profile.role != "student":
        return JsonResponse({"error": "Access denied"}, status=403)

    test = get_object_or_404(Test, id=test_id, groups=request.user.profile.group)

    if TestResult.objects.filter(test=test, student=request.user).exists():
        return JsonResponse({"error": "Тест уже пройден"}, status=400)

    questions = test.questions.all().order_by("order")

    data = {
        "id": test.id,
        "title": test.title,
        "description": test.description,
        "questions": [
            {
                "id": q.id,
                "text": q.text,
                "image": q.image.url if q.image else None,
                "question_type": q.question_type,  # ✅ ВОТ ЭТО
                "answers": [
                    {"id": a.id, "text": a.text}
                    for a in q.answers.all().order_by("order")
                ],
            }
            for q in questions
        ],
    }
    return JsonResponse(data)


@login_required
@require_http_methods(["POST"])
def submit_test(request, test_id):
    if request.user.profile.role != "student":
        return JsonResponse({"error": "Access denied"}, status=403)

    test = get_object_or_404(Test, id=test_id, groups=request.user.profile.group)

    # Нельзя проходить один тест дважды
    if TestResult.objects.filter(test=test, student=request.user).exists():
        return JsonResponse({"error": "Тест уже пройден"}, status=400)

    data = json.loads(request.body)

    # Создаем запись результата
    test_result = TestResult.objects.create(
        test=test, student=request.user, time_spent=data.get("time_spent", 0)
    )

    correct_count = 0
    total_count = 0
    details = []

    # Основной цикл по вопросам
    for question in test.questions.all().order_by("order"):
        total_count += 1
        q_id = str(question.id)

        # Ответ пользователя (для открытого = текст, для тестового = айди варианта)
        user_raw_answer = data["answers"].get(q_id)

        # --- ОТКРЫТЫЕ ВОПРОСЫ ---
        if question.question_type == "open":
            user_text_answer = (user_raw_answer or "").strip().lower()
            correct_text = (question.correct_text_answer or "").strip().lower()

            # Проверяем совпадение (без учета регистра)
            is_correct = user_text_answer == correct_text

            if is_correct:
                correct_count += 1

            UserAnswer.objects.create(
                test_result=test_result,
                question=question,
                selected_answer=None,
                text_answer=user_raw_answer or "",
            )

            details.append(
                {
                    "question_text": question.text,
                    "user_answer": user_raw_answer or "Нет ответа",
                    "correct_answer": question.correct_text_answer or "",
                    "is_correct": is_correct,
                }
            )

            continue

        # --- ТЕСТОВЫЕ ВОПРОСЫ (CHOICE) ---
        if question.question_type == "choice":
            if user_raw_answer:
                try:
                    answer_obj = AnswerOption.objects.get(
                        id=user_raw_answer, question=question
                    )
                except AnswerOption.DoesNotExist:
                    answer_obj = None
            else:
                answer_obj = None

            # Сохраняем ответ
            UserAnswer.objects.create(
                test_result=test_result,
                question=question,
                selected_answer=answer_obj,
                text_answer=None,
            )

            # Определяем корректность
            correct_option = question.answers.filter(is_correct=True).first()
            is_correct = answer_obj.is_correct if answer_obj else False

            if is_correct:
                correct_count += 1

            details.append(
                {
                    "question_text": question.text,
                    "user_answer": answer_obj.text if answer_obj else "Нет ответа",
                    "correct_answer": correct_option.text if correct_option else "",
                    "is_correct": is_correct,
                }
            )

    # Сохраняем результат
    test_result.score = correct_count
    test_result.total_questions = total_count
    test_result.save()

    return JsonResponse(
        {
            "correct": correct_count,
            "total": total_count,
            "details": details,
            "level_title": level.title if level else "Завершено",
            "level_description": level.description if level else "",
            "level_recommendations": level.recommendations if level else "",
        }
    )


def register_view(request):
    if request.user.is_authenticated:
        return redirect("main:home")

    groups = Group.objects.all().order_by("name")

    if request.method == "POST":
        form = RegisterForm(request.POST)
        if form.is_valid():
            user = User.objects.create_user(
                username=form.cleaned_data["username"],
                email=form.cleaned_data["email"],
                password=form.cleaned_data["password"],
            )

            profile = UserProfile.objects.create(
                user=user, role=form.cleaned_data["role"]
            )

            if profile.role == "student":
                profile.group = Group.objects.get(id=request.POST.get("group"))
                profile.save()

            return redirect("main:login")
    else:
        form = RegisterForm()

    return render(
        request,
        "main/register.html",
        {
            "form": form,
            "groups": groups,
        },
    )


def login_view(request):
    if request.user.is_authenticated:
        return redirect("main:home")

    if request.method == "POST":
        form = LoginForm(request.POST)
        if form.is_valid():
            user = authenticate(
                email=form.cleaned_data["email"],
                password=form.cleaned_data["password"],
            )
            if user:
                login(request, user)
                return redirect("main:home")
            else:
                return render(
                    request,
                    "main/login.html",
                    {"form": form, "error": "Неверные данные"},
                )
    else:
        form = LoginForm()

    return render(request, "main/login.html", {"form": form})


def logout_view(request):
    logout(request)
    return redirect("main:login")
