FROM debian:latest
WORKDIR /src
COPY . .
SHELL ["/bin/bash", "-c"]

RUN apt-get update
RUN apt-get -y install npm python3-pip python3.11-venv python3-full

ENV VIRTUAL_ENV=/opt/venv
RUN python3 -m venv $VIRTUAL_ENV
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

RUN pip install scrapy

RUN npm install
CMD ["node", "app.js"]
