tailwind.config = {
    theme: {
        extend: {
            colors: {
                'brand-green': '#1B7D4A',           // основной акцент (primary)
                'brand-green-dark': '#145D38',      // более глубокая зелёная (для header/footer/bg)
                'brand-green-light': '#5CC68A',     // вторичная/поддерживающая (для графиков, иконок)
                'brand-green-hover': '#176A40',     // hover-состояние primary
                'brand-green-container': '#f8faf9ff', // светлый фон блоков/карточек
            }
        }
    }
}


async function stayHere(e) {
    e.preventDefault();

    const form = e.target;
    const formData = new FormData(form);

    const resp = await fetch(form.action, {
        method: 'POST',
        body: formData
    });

    // после ответа – НИЧЕГО НЕ ДЕЛАЕМ
    // просто остаёмся на странице

    if (!resp.ok) {
        alert("Ошибка сохранения");
        return false;
    }

    alert("Сохранено");
    return false; // ← ключевой момент (нет submit)
}
