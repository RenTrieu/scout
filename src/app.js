import 'dotenv/config';
import express from 'express';
import {
  InteractionType,
  InteractionResponseType,
  InteractionResponseFlags,
  MessageComponentTypes,
  ButtonStyleTypes,
} from 'discord-interactions';
import { 
  VerifyDiscordRequest, 
  DiscordRequest, 
} from './utils.js';
import {
  diffParse,
  getActiveUsers,
  getActiveSpiders,
  getUserSpiders,
} from './spider_manager.js';
import {
  callCommand,
  testCommand,
  listCommand,
  listInteraction,
  scheduleCommand,
  removeCommand,
} from './app_commands/index.js';
import {
  adminListCommand,
  adminListInteraction,
  adminRemoveCommand,
  adminScheduleCommand
} from './admin_commands/index.js';
import * as fs from 'node:fs';
import { createRequire } from 'module';
import { Buffer, constants } from 'node:buffer';

// Create an express app
const app = express();

// Get port, or default to 3000
const PORT = process.env.PORT || 3000;

// Create a scheduler to handle scheduled events
const require = createRequire(import.meta.url);
const schedule = require('node-schedule');

// Initializing Schedule Database
const sqlite3 = require('sqlite3').verbose();
const dbFile = 'scout.sqlite'
const db = new sqlite3.Database(dbFile);
const dbExists = fs.existsSync(dbFile);
if (!dbExists) {
  db.run("CREATE TABLE schedule (uuid VARCHAR NOT NULL, "
         + "guild_id VARCHAR NOT NULL, user_id VARCHAR NOT NULL, "
         + "channel_id VARCHAR NOT NULL, spider_name TEXT NOT NULL, "
         + "PRIMARY KEY (uuid))");
}

/* Initializing Postgres */

import pg from 'pg';
const pool = new pg.Pool({
  user: process.env.POSTGRES_USER,
  host: process.env.DATABASE_ALIAS,
  database: process.env.POSTGRES_DB,
  password: process.env.POSTGRES_PASSWORD,
  port: process.env.POSTGRES_PORT,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

const initClient = await pool.connect();
await initClient.query('CREATE TABLE IF NOT EXISTS schedule '
   + '(uuid VARCHAR NOT NULL, '
   + 'guild_id VARCHAR NOT NULL, user_id VARCHAR NOT NULL, '
   + 'channel_id VARCHAR NOT NULL, spider_name TEXT NOT NULL, '
   + 'PRIMARY KEY (uuid))');
initClient.end();

/* Application Constants */

// The maximum number of items to display when a list is called
const displayLimit = 2;

// Parse request body and verifies incoming requests using discord-interactions package
app.use(express.json({ verify: VerifyDiscordRequest(process.env.PUBLIC_KEY) }));

/**
 * Interactions endpoint URL where Discord will send HTTP requests
 */
app.post('/interactions', async function (req, res) {
  // Interaction type and data
  const { type, id, data } = req.body;

  /**
   * Handle verification requests
   */
  if (type === InteractionType.PING) {
    return res.send({ type: InteractionResponseType.PONG });
  }

  /**
   * Handle slash command requests
   * See https://discord.com/developers/docs/interactions/application-commands#slash-commands
   */
  if (type === InteractionType.APPLICATION_COMMAND) {
    const { name } = data;

    // "test" command
    if (name === 'test') {
      // Send a message into the channel where command was triggered from
      return testCommand(req, res);
    }

    /* Application Commands */

    // "Spider Call" command
    if (name === 'call') {
      return await callCommand(req, res);
    }

    // List Scheduled Spiders command
    if (name === 'list') {
      return listCommand(req, res, pool, displayLimit);
    }

    // "Schedule Spider" command
    if (name === 'schedule') {
      return scheduleCommand(req, res, pool);
    }

    // Remove Spider command
    if (name === 'remove') {
      return removeCommand(req, res, db);
    }

    /* Admin Commands */

    // Admin List command
    if (name === 'admin_list') {
      return adminListCommand(req, res, db);
    }

    // Admin Remove command
    if (name == 'admin_remove') {
      return adminRemoveCommand(req, res, db);
    }

    // Admin Schedule command
    if (name == 'admin_schedule') {
      return adminScheduleCommand(req, res, db);
    }
  }

  /*
   * Handle message component interactions
   */
  if (type === InteractionType.MESSAGE_COMPONENT) {
    const custom_id = req.body.data.custom_id;

    // Admin List Interactions
    if ((custom_id === 'admin_list_next') 
        || (custom_id === 'admin_list_prev')) {
      await adminListInteraction(req, res, db, displayLimit);
    }

    // List Interactions
    if ((custom_id === 'list_next')
        || (custom_id === 'list_prev')) {
      await listInteraction(req, res, pool, displayLimit);
    }

    // return res.send({ 
    //   type: InteractionResponseType.UPDATE_MESSAGE,
    //   data: {
    //     content: `custom_id: ${custom_id}`,
    //   }
    // });
  }

});

/*
 * Runs scheduled spiders at a regular interval
 */
const rule = new schedule.RecurrenceRule();
rule.minute = 46;
const job = schedule.scheduleJob(rule, function() {
  const activeSpidersPromise = getActiveSpiders(db);
  activeSpidersPromise.then((spidersSet) => {
    spidersSet.forEach((spider) => {
      const diffEmbed = diffParse(spider);
      const allRowsPromise = new Promise((resolve, reject) => {
        db.all(
          'SELECT * FROM schedule',
          function(_err, rows) {
            resolve(rows)
          }
        );
      });
      allRowsPromise.then((rows) => {
        rows.forEach((row) => {
          const userId = row.user_id;
          const channelId = row.channel_id;

          const endpoint = `channels/${channelId}/messages`;
          diffEmbed.description = `<@${userId}>`;
          const requestPromise = new Promise((_resolve, _reject) => {
            DiscordRequest(endpoint, {
              method: 'POST',
              body: {
                embeds : [diffEmbed],
                allowed_mentions: {
                  "users": [userId]
                }
              }
            });
          });
          requestPromise.then();
        });
      });
    });
  });
});

app.listen(PORT, () => {
  console.log('Listening on port', PORT);
});
