import 'dotenv/config';
import express from 'express';
import {
  InteractionType,
  InteractionResponseType,
} from 'discord-interactions';
import { 
  VerifyDiscordRequest, 
} from './utils.js';
import {
  scheduleSpider,
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
import { createRequire } from 'module';

// Create an express app
const app = express();

// Get port, or default to 3000
const PORT = process.env.PORT || 3000;

// Create a scheduler to handle scheduled events
const require = createRequire(import.meta.url);
const schedule = require('node-schedule');

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
   + 'schedule_str VARCHAR NOT NULL, repeat_interval VARCHAR NOT NULL, '
   + 'PRIMARY KEY (uuid))');
initClient.end();

const jobMap = new Map();

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

    /* Application Commands */

    // "Spider Call" command
    if (name === 'call') {
      return await callCommand(req, res);
    }

    // List Scheduled Spiders command
    if (name === 'list') {
      return listCommand(req, res, pool, displayLimit, jobMap);
    }

    // "Schedule Spider" command
    if (name === 'schedule') {
      return scheduleCommand(req, res, pool, jobMap);
    }

    // Remove Spider command
    if (name === 'remove') {
      return removeCommand(req, res, pool, jobMap);
    }

    /* Admin Commands */

    // Admin List command
    if (name === 'admin_list') {
      return adminListCommand(req, res, pool);
    }

    // Admin Remove command
    if (name == 'admin_remove') {
      return adminRemoveCommand(req, res, pool, jobMap);
    }

    // Admin Schedule command
    if (name == 'admin_schedule') {
      return adminScheduleCommand(req, res, pool, jobMap);
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
      await adminListInteraction(req, res, pool, displayLimit);
    }

    // List Interactions
    if ((custom_id === 'list_next')
        || (custom_id === 'list_prev')) {
      await listInteraction(req, res, pool, displayLimit);
    }

  }

});

/*
 * On startup, iterates through the database for scheduled 
 * spiders and creates jobs for each one
 */
pool.query(
  'SELECT * FROM schedule',
  function(_err, res) {
    res.rows.forEach((row) => {
      scheduleSpider(
        jobMap,
        row.uuid,
        JSON.parse(row.schedule_str),
        row.spider_name,
        row.user_id,
        row.channel_id,
      )
    });
  }
)

app.listen(PORT, () => {
  console.log('Listening on port', PORT);
});
