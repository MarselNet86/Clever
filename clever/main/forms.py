from django import forms
from django.contrib.auth.models import User

from .models import UserProfile, Group


class RegisterForm(forms.ModelForm):
    username = forms.CharField()
    email = forms.EmailField()
    password = forms.CharField(widget=forms.PasswordInput)
    role = forms.ChoiceField(choices=UserProfile.ROLE_CHOICES)
    group = forms.CharField(required=False)

    class Meta:
        model = User
        fields = ['username', 'email', 'password']


class LoginForm(forms.Form):
    username = forms.CharField()
    password = forms.CharField(widget=forms.PasswordInput)


class GroupCreateForm(forms.ModelForm):
    class Meta:
        model = Group
        fields = ['name']
        widgets = {
            'name': forms.TextInput(attrs={
                'class': 'input input-bordered rounded-xl p-2 w-full',
                'placeholder': 'Название новой группы'
            })
        }

    def clean_name(self):
        name = self.cleaned_data['name'].strip()
        if not name:
            raise forms.ValidationError('Название группы не может быть пустым.')
    
        if Group.objects.filter(name__iexact=name).exists():
            raise forms.ValidationError('Группа с таким названием уже существует.')
        
        return name