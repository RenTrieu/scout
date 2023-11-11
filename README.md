# Scout
Discord app for scheduling, running, and reporting information pulled from web
scrapers

## Environment File
This application requires that the following environment variables are defined:

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

> ``NGROK_DOMAIN``
This bot uses ngrok to receive requests. This environment variable should be
the ngrok domain that is used as bot's interaction endpoint.

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
