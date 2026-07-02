FROM node:24-alpine

WORKDIR /app

COPY server.js index.html styles.css app.js ./

ENV PORT=80
ENV DATA_FILE=/app/data/data.json

RUN mkdir -p /app/data

EXPOSE 80

CMD ["node", "server.js"]
