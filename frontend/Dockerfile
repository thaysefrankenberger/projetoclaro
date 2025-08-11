FROM node:16

WORKDIR /app
COPY package.json .
RUN npm install

COPY public ./public
COPY src ./src

ENV REACT_APP_API_URL=http://localhost:5000

CMD ["npm", "start"]