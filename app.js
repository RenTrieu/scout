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
  getRandomEmoji, 
  DiscordRequest, 
  unixCommand,
  unixCommandSync,
  getAvailableSpiders,
} from './utils.js';
import {
  diffParse,
  getActiveUsers,
  getUserSpiders,
  checkSpider,
  checkUUID,
} from './spider_manager.js';
import {
  callCommand,
  testCommand,
  listCommand,
  scheduleCommand,
  removeCommand,
} from './app_commands/index.js';
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
// TODO: Move the Database to disk and make persistent
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database(':memory:');
db.run("CREATE TABLE schedule (uuid VARCHAR NOT NULL, "
       + "user_id VARCHAR NOT NULL, channel_id VARCHAR NOT NULL, "
       + "spider_name TEXT NOT NULL, PRIMARY KEY (uuid))");

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

    // "python call" command
    if (name === 'call') {
      return await callCommand(req, res);
    }

    // List Scheduled Spiders command
    if (name === 'list') {
      return listCommand(req, res, db);
    }

    // "Schedule Spider" command
    if (name === 'schedule') {
      return scheduleCommand(req, res, db);
    }

    // Remove Spider command
    if (name === 'remove') {
      return removeCommand(req, res, db);
    }
  }
});

/*
 * Runs scheduled spiders at a regular interval
 */
const rule = new schedule.RecurrenceRule();
rule.minute = 59;
const job = schedule.scheduleJob(rule, function() {
  let userSetPromise = getActiveUsers(db);
  
  userSetPromise.then((userSet) => {
    // Iterating through each user in the database
    userSet.forEach((userId) => {
      console.log(`Running spiders for user: ${userId}`);
      const userSpidersPromise = getUserSpiders(db, userId);

      userSpidersPromise.then((userSpiders) => {
        // Running spiders for each user
        for (const i in userSpiders) {
          const spider = userSpiders[i];
          const channelId = spider.channel_id;
          const spiderName = spider.spider_name;

          const endpoint = `channels/${channelId}/messages`
          let requestPromise = new Promise((resolve, reject) => {
            const spiderResult = `<@${userId}> ${spiderName} results:\n`
                                 + diffParse(spiderName);
            DiscordRequest(endpoint, { 
              method: 'POST', 
              body: { 
                content: spiderResult,
                allowed_mentions: {
                  "users": [userId]
                }
              }
            })
          });
          requestPromise.then();
        }
      });

    });
  });
  console.log('schedule test');
});

app.listen(PORT, () => {
  console.log('Listening on port', PORT);
});
