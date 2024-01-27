# Scout
Discord app for scheduling, running, and reporting information pulled from web
scrapers

## Setup Guide

### Environment File
This application requires that the following environment variables are
defined in a `.env` file in the root directory:

> ``APP_ID``
This is the bot's application ID

> ``DISCORD_TOKEN``
This is the bot's discord token

> ``PUBLIC_KEY``
This is the bot's public key

> ``ADMIN_GUILD_ID``
This bot has administration commands that can be used to manage the database.
These commands will only be available on the server whose guild id is
specified in this environment variable.

> ``DATABASE_ALIAS``
This is the hostname of the postgres database

> ``POSTGRES_PASSWORD``
This is the password of the postgres user that will own the database

> ``POSTGRES_USER``
This is the username of the postgres user that will own the database

> ``POSTGRES_DB``
This is the name of the database that will be created and used by postgres

> ``POSTGRES_PORT``
This is the port that is used by the postgres container

> ``APP_PORT``
This is the port that the app will be hosted on.

> ``DOMAIN``
This is the domain that the app will use as the interactions endpoint URL.

### SSL
Discord Interactions Endpoint URLs must use HTTPS. Prior to building the docker
container, the SSL keys must be added for the application to access. To add SSL
keys to the application in the ``nginx/``, create a directory labeled with the
domain name. This is where the SSL certificate and SSL certificate key will
need to be placed. The SSL certificate should be named ``fullchain1.pem`` and
the SSL certificate key should be named ``privkey1.pem``. For example, if the
domain is ``www.example.com``, you will need to add the ``fullchain1.pem`` and
``privkey1.pem`` files to the ``nginx/www.example.com`` directory.

### Startup
The application can be built and run by running the following command in the
root directory:
```
docker compose up -d --build .
```

After being built, the application services can be stopped and started by
``docker compose down`` and ``docker compose up -d`` respectively.
