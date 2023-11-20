FROM alpine:latest
WORKDIR /src
COPY . .

RUN apk add --no-cache bash
RUN apk add --no-cache npm python3 py3-pip

SHELL ["/bin/bash", "-c"]
ENV VIRTUAL_ENV=/opt/venv
RUN python3 -m venv $VIRTUAL_ENV
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

RUN pip install scrapy

RUN npm install
CMD ["node", "app.js"]
