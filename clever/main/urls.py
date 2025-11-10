from django.urls import path
from . import views

app_name = 'main'

urlpatterns = [
    path('', views.home_view, name='home'),
    path('teacher/', views.teacher_home, name='teacher_home'),
    path('teacher/create-test/', views.create_test, name='create_test'),
    path('teacher/create-group/', views.create_group, name='create_group'),
    path('teacher/test/<int:test_id>/delete/', views.delete_test, name='delete_test'),
    path('teacher/test/<int:test_id>/results/', views.test_detail_results, name='test_detail_results'),
    path('student/', views.student_home, name='student_home'),
    path('student/test/<int:test_id>/start/', views.start_test, name='start_test'),
    path('student/test/<int:test_id>/submit/', views.submit_test, name='submit_test'),
    path('register/', views.register_view, name='register'),
    path('login/',  views.login_view, name='login'),
    path('logout/',  views.logout_view, name='logout'),
]