FROM debian:latest
WORKDIR /scout
COPY . .
RUN apt-get update
RUN apt-get -y install npm
RUN npm install
CMD ["node", "app.js"]
EXPOSE 3000
