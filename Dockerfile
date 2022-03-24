FROM node:16

WORKDIR /app

ADD ./package.json /app/package.json

ADD ./package-lock.json /app/package-lock.json

RUN npm ci

ADD . /app

RUN npm run build && chmod +x ./bin/* && ln -sv $(pwd)/bin/get-tokens-created-by.js /usr/local/bin/get-tokens-created-by

VOLUME /app/data
