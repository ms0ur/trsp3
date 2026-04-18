# TRSP3

## Технологии

- **[Bun](https://bun.com/)**
- **[ElysiaJS](https://elysiajs.com/)**
- **SQLite (`bun:sqlite`)**
- **TypeScript**
- **JWT (`@elysiajs/jwt`) & bcrypt**
- **Swagger (`@elysiajs/openapi`)**

---

## 🚀 Установка и запуск

1. **Убедитесь, что у вас установлен Bun.** 
   Если нет, установите его командой терминала:  
   `curl -fsSL https://bun.com/install | bash` (Windows: `powershell -c "irm bun.com/install.ps1 | iex"`)

2. **Клонируйте репозиторий и перейдите в папку проекта:**
   ```bash
   git clone https://github.com/ms0ur/trsp3.git
   cd trsp3
   ```

3. **Установите зависимости:**
   ```bash
   bun install
   ```

4. **Настройте окружение:**
   Скопируйте файл с примерами ключей `.env.example` в `.env`:
   ```bash
   cp .env.example .env
   ```

5. **Запустите сервер в режиме разработчика:**
   ```bash
   bun run dev
   ```
   Сервер запустится на `http://localhost:3000`. Вы также можете открыть документацию всех эндпоинтов по ссылке `http://localhost:3000/openapi` (логин и пароль по умолчанию: `admin` / `adminpass`).

---

## Как тестировать ключевые эндпоинты

### 1. Регистрация нового пользователя
Создайте аккаунт, чтобы получить логин в системе (сохраните `access_token` из ответа).
```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser", "password": "password123", "role": "user"}'
```

### 2. Логин
Если вы уже зарегистрировались, этот запрос вернет вам ваш JWT токен.
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser", "password": "password123"}'
```

### 3. Получение информации о себе
*Вставьте токен, полученный в предыдущих шагах, вместо `<YOUR_TOKEN>`.*
```bash
curl -X GET http://localhost:3000/auth/me \
  -H "Authorization: Bearer <YOUR_TOKEN>"
```

### 4. Создание новой задачи (Todo)
```bash
curl -X POST http://localhost:3000/todos \
  -H "Authorization: Bearer <YOUR_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"title": "Помыть посуду", "description": "помыть посуду до вечера"}'
```

### 5. Просмотр своих задач
Пользователь `user` увидит только свои задачи. `admin` увидит задачи всех пользователей.
```bash
curl -X GET http://localhost:3000/todos \
  -H "Authorization: Bearer <YOUR_TOKEN>"
```