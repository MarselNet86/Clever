from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required


from django.contrib.auth.models import User

from .forms import RegisterForm, LoginForm
from .models import UserProfile, Test, Question, AnswerOption, Group


@login_required
def home_view(request):
    profile = request.user.profile

    if profile.role == 'student':
        return redirect('main:student_home')
    elif profile.role == 'teacher':
        return redirect('main:teacher_home')


@login_required
def teacher_home(request):
    # только преподаватель
    if request.user.profile.role != 'teacher':
        return redirect('main:home')

    groups = Group.objects.filter(created_by=request.user).order_by('name')

    return render(request, 'main/teach_panel.html', {
        'groups': groups
    })


@login_required
def create_group(request):
    if request.user.profile.role != 'teacher':
        return redirect('main:home')

    if request.method == 'POST':
        name = request.POST.get('group_name').strip()

        # atomic бизнес-правило:
        # группа уникальна в системе
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

        # цикл по вопросам
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
def student_home(request):
    return redirect(request, 'main/student_panel.html')

def register_view(request):
    if request.method == 'POST':
        form = RegisterForm(request.POST)
        if form.is_valid():
            username = form.cleaned_data['username']
            email = form.cleaned_data['email']
            password = form.cleaned_data['password']
            role = form.cleaned_data['role']
            group = form.cleaned_data['group']

            user = User.objects.create_user(username=username, email=email, password=password)
            profile = UserProfile.objects.create(user=user, role=role)

            # если студент — сохраняем группу
            if role == "student":
                profile.group = group
                profile.save()

            return redirect('main:login')
    else:
        form = RegisterForm()

    return render(request, 'main/register.html', {'form': form})


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
