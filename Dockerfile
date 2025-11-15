# Этап сборки фронта
FROM node:20-alpine AS build

WORKDIR /app

# Ставим зависимости
COPY package*.json ./
RUN npm ci

# Копируем исходники и собираем
COPY . .
RUN npm run build

# Этап прод-сервера: отдаём статику через nginx
FROM nginx:alpine

# Кладём собранный фронт в стандартную папку nginx
COPY --from=build /app/dist /usr/share/nginx/html

# Конфиг nginx по умолчанию уже умеет раздавать .js с правильным MIME
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
