# Base stage
FROM node:18-alpine AS base
WORKDIR /app

# Copy only the entrypoint script
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# Development stage
FROM base AS dev
COPY . .
EXPOSE 3000
ENTRYPOINT ["entrypoint.sh"]

# Production stage
FROM base AS prod
COPY . .
RUN npm ci --omit=dev && npm run build
ENV NODE_ENV=production
EXPOSE 3000
CMD ["npm", "run", "start"]