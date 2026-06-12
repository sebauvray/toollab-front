# ========== BASE ==========
# Socle commun dev / build / prod
FROM node:20-alpine AS base
WORKDIR /app

# ========== DEPS ==========
# Couche de cache des dépendances (réutilisée par le build)
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# ========== DEV ==========
# Les dépendances et le code sont montés au runtime (bind mount + volume nommé),
# l'entrypoint lance `npm install` puis `nuxt dev`.
FROM base AS dev
ENV NODE_ENV=development
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh
EXPOSE 3000
ENTRYPOINT ["entrypoint.sh"]

# ========== BUILD ==========
# Compile l'application Nuxt en sortie autonome (.output)
FROM deps AS build
COPY . .
RUN npm run build

# ========== PROD ==========
# Runtime minimal : seule la sortie buildée est embarquée (aucune source ni node_modules).
FROM base AS prod
ENV NODE_ENV=production
COPY --from=build /app/.output ./.output
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
