from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.db.models import Avg, Count, Q
import json

from django.contrib.auth.models import User

from .forms import RegisterForm, LoginForm
from .models import UserProfile, Test, Question, AnswerOption, Group, TestResult, UserAnswer


@login_required
def home_view(request):
    profile = request.user.profile

    if profile.role == 'student':
        return redirect('main:student_home')
    elif profile.role == 'teacher':
        return redirect('main:teacher_home')


@login_required
def teacher_home(request):
    if request.user.profile.role != 'teacher':
        return redirect('main:home')

    groups = Group.objects.filter(created_by=request.user).order_by('name')
    
    # Получаем все тесты преподавателя с аннотациями
    my_tests = Test.objects.filter(created_by=request.user).prefetch_related(
        'questions', 'results', 'group'
    ).annotate(
        results_count=Count('results'),
        avg_score=Avg('results__score')
    ).order_by('-created_at')
    
    # Получаем все результаты студентов для всех тестов преподавателя
    all_results = TestResult.objects.filter(
        test__created_by=request.user
    ).select_related(
        'test', 'student', 'student__profile'
    ).prefetch_related(
        'answers'
    ).order_by('-completed_at')
    
    # Форматируем результаты для отображения
    results_data = []
    for result in all_results:
        percentage = 0
        if result.total_questions:
            percentage = round((result.score / result.total_questions) * 100, 1)
        
        results_data.append({
            'id': result.id,
            'test_title': result.test.title,
            'test_id': result.test.id,
            'student_name': result.student.username,
            'student_group': result.student.profile.group or 'Без группы',
            'score': result.score,
            'total': result.total_questions,
            'percentage': percentage,
            'time_spent': result.time_spent,
            'time_formatted': f"{result.time_spent // 60:02d}:{result.time_spent % 60:02d}",
            'completed_at': result.completed_at.strftime("%d.%m.%Y %H:%M"),
            'passed': percentage >= 60
        })

    return render(request, 'main/teach_panel.html', {
        'groups': groups,
        'my_tests': my_tests,
        'results_data': results_data,
    })


@login_required
def create_group(request):
    if request.user.profile.role != 'teacher':
        return redirect('main:home')

    if request.method == 'POST':
        name = request.POST.get('group_name').strip()

        if Group.objects.filter(name=name).exists():
            return render(request, 'main/teach_panel.html', {
                'error': 'Группа с таким именем уже существует.'
            })

        Group.objects.create(name=name, created_by=request.user)
        return redirect('main:teacher_home')

    return redirect('main:teacher_home')


@login_required
def create_test(request):
    if request.user.profile.role != 'teacher':
        return redirect('main:home')

    if request.method == 'POST':
        group_id = request.POST.get('group_id')
        group = get_object_or_404(Group, id=group_id, created_by=request.user)

        test = Test.objects.create(
            created_by=request.user,
            group=group,
            title=request.POST.get('test_title'),
            description=request.POST.get('test_description') or ''
        )

        for key in request.POST.keys():
            if key.startswith('question_') and key.endswith('_text'):
                num = int(key.split('_')[1])

                q = Question.objects.create(
                    test=test,
                    text=request.POST.get(f'question_{num}_text'),
                    image=request.FILES.get(f'question_{num}_image'),
                    order=num
                )

                correct = request.POST.get(f'question_{num}_correct')
                cnt = int(request.POST.get(f'question_{num}_answers_count'))

                for i in range(1, cnt+1):
                    AnswerOption.objects.create(
                        question=q,
                        text=request.POST.get(f'question_{num}_answer_{i}'),
                        order=i,
                        is_correct=(str(i) == str(correct))
                    )

    return redirect('main:teacher_home')


@login_required
@require_http_methods(["POST"])
def delete_test(request, test_id):
    if request.user.profile.role != 'teacher':
        return redirect('main:home')
    
    test = get_object_or_404(Test, id=test_id, created_by=request.user)
    test.delete()
    
    return redirect('main:teacher_home')


@login_required
def student_home(request):
    if request.user.profile.role != 'student':
        return redirect('main:home')
    
    student_group = request.user.profile.group
    tests = Test.objects.filter(group=student_group).prefetch_related('questions').order_by('-created_at')
    
    completed_tests = TestResult.objects.filter(student=request.user).values_list('test_id', flat=True)
    
    tests_data = []
    for test in tests:
        test_info = {
            'test': test,
            'is_completed': test.id in completed_tests,
            'result': None
        }
        
        if test_info['is_completed']:
            r = TestResult.objects.filter(test=test, student=request.user).first()
            test_info['result'] = r
            
            total_q = r.total_questions or 0
            score = r.score or 0
            
            test_info['pass_threshold'] = total_q * 0.6
            test_info['minutes'] = r.time_spent // 60
            test_info['seconds'] = r.time_spent % 60
            test_info['completed_at_fmt'] = r.completed_at.strftime("%d.%m.%Y %H:%M")
            test_info['time_fmt'] = f"{r.time_spent // 60:02d}:{r.time_spent % 60:02d}"
        
        tests_data.append(test_info)
    
    return render(request, 'main/student_panel.html', {
        'tests_data': tests_data
    })


@login_required
@require_http_methods(["GET"])
def start_test(request, test_id):
    if request.user.profile.role != 'student':
        return JsonResponse({'error': 'Access denied'}, status=403)
    
    test = get_object_or_404(Test, id=test_id, group=request.user.profile.group)
    
    # Проверяем, не прошел ли студент уже этот тест
    if TestResult.objects.filter(test=test, student=request.user).exists():
        return JsonResponse({'error': 'Тест уже пройден'}, status=400)
    
    questions = test.questions.all().order_by('order')
    
    data = {
        'id': test.id,
        'title': test.title,
        'description': test.description,
        'questions': [
            {
                'id': q.id,
                'text': q.text,
                'image': q.image.url if q.image else None,
                'answers': [
                    {
                        'id': a.id,
                        'text': a.text
                    } for a in q.answers.all().order_by('order')
                ]
            } for q in questions
        ]
    }
    
    return JsonResponse(data)


@login_required
@require_http_methods(["POST"])
def submit_test(request, test_id):
    if request.user.profile.role != 'student':
        return JsonResponse({'error': 'Access denied'}, status=403)
    
    test = get_object_or_404(Test, id=test_id, group=request.user.profile.group)
    
    # Проверяем, не прошел ли студент уже этот тест
    if TestResult.objects.filter(test=test, student=request.user).exists():
        return JsonResponse({'error': 'Тест уже пройден'}, status=400)
    
    data = json.loads(request.body)
    
    test_result = TestResult.objects.create(
        test=test,
        student=request.user,
        time_spent=data.get('time_spent', 0)
    )
    
    correct_count = 0
    total_count = 0
    details = []
    
    for question in test.questions.all().order_by('order'):
        total_count += 1
        user_answer_id = data['answers'].get(str(question.id))
        
        if user_answer_id:
            answer = get_object_or_404(AnswerOption, id=user_answer_id, question=question)
            
            UserAnswer.objects.create(
                test_result=test_result,
                question=question,
                selected_answer=answer
            )
            
            is_correct = answer.is_correct
            if is_correct:
                correct_count += 1
            
            correct_answer = question.answers.filter(is_correct=True).first()
            
            details.append({
                'question_text': question.text,
                'user_answer': answer.text,
                'correct_answer': correct_answer.text if correct_answer else '',
                'is_correct': is_correct
            })
        else:
            correct_answer = question.answers.filter(is_correct=True).first()
            details.append({
                'question_text': question.text,
                'user_answer': 'Нет ответа',
                'correct_answer': correct_answer.text if correct_answer else '',
                'is_correct': False
            })
    
    test_result.score = correct_count
    test_result.total_questions = total_count
    test_result.save()
    
    return JsonResponse({
        'correct': correct_count,
        'total': total_count,
        'details': details
    })





def register_view(request):
    groups = Group.objects.all().order_by('name')

    if request.method == 'POST':
        form = RegisterForm(request.POST)
        if form.is_valid():
            user = User.objects.create_user(
                username=form.cleaned_data['username'],
                email=form.cleaned_data['email'],
                password=form.cleaned_data['password']
            )

            profile = UserProfile.objects.create(
                user=user,
                role=form.cleaned_data['role']
            )

            if profile.role == "student":
                profile.group = Group.objects.get(id=request.POST.get('group'))
                profile.save()

            return redirect('main:login')
    else:
        form = RegisterForm()

    return render(request, 'main/register.html', {
        'form': form,
        'groups': groups,
    })


def login_view(request):
    if request.method == 'POST':
        form = LoginForm(request.POST)
        if form.is_valid():
            user = authenticate(
                username=form.cleaned_data['username'],
                password=form.cleaned_data['password'],
            )
            if user:
                login(request, user)
                return redirect('main:home')
            else:
                return render(request, 'main/login.html', {'form': form, 'error': 'неверные данные'})
    else:
        form = LoginForm()

    return render(request, 'main/login.html', {'form': form})


def logout_view(request):
    logout(request)
    return redirect('main:login')