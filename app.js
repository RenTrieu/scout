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
} from './app_commands/index.js';
import * as fs from 'node:fs';
import { createRequire } from 'module';
import { Buffer, constants } from 'node:buffer';
import crypto from 'node:crypto';

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
      const userId = req.body.member.user.id;
      let userSpiders = await getUserSpiders(db, userId);
      if (userSpiders.length <= 0) {
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: `No scheduled spiders exists for <@${userId}>`,
            allowed_mentions: {
              "users": [userId]
            }
          }
        });
      }
      let returnStr = '';
      for (let i in userSpiders) {
        returnStr += `${JSON.stringify(userSpiders[i])}\n`;
      }
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: returnStr,
          allowed_mentions: {
            "users": [userId]
          }
        }
      });
    }

    // "Schedule Spider" command
    if (name === 'schedule') {
      const spider_name = req.body.data.options[0].value;
      const channel_id = req.body.channel_id;
      const user_id = req.body.member.user.id;
      let spiderExists = await checkSpider(db, user_id, channel_id, spider_name);
      if (spiderExists) {
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: `Spider ${spider_name} already exists for user `
                     + `<@${user_id}> for channel <#${channel_id}>.`,
            allowed_mentions: {
              "users": [user_id]
            }
          }
        });
      }

      // Regenerates uuid if it already exists in the database
      let uuidExists = true;
      let uuid;
      do {
        uuid = crypto.randomUUID();
        uuidExists = await checkUUID(db, uuid);
      }
      while (uuidExists);

      db.run(
        'INSERT INTO schedule (uuid, user_id, channel_id, spider_name) VALUES '
        + '($uuid, $user_id, $channel_id, $spider_name)',
        {
          $uuid: uuid,
          $user_id: user_id,
          $channel_id: channel_id,
          $spider_name: spider_name
        },
        function() {
          return res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: `Updates from Spider ${spider_name} scheduled by `
                       + `<@${user_id}> for channel <#${channel_id}>`,
              allowed_mentions: {
                "users": [user_id]
              }
            }
          });
        }
      );
    }

    if (name === 'remove') {
      const uuid = req.body.data.options[0].value;
      const userId = req.body.member.user.id;
      const userSpiders = await getUserSpiders(db, userId);
      const matchingSpider = userSpiders.filter((row) => row.uuid == uuid);
      if (matchingSpider.length <= 0) {
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: `No spider for <@${userId}> exists with a uuid of ${uuid}`,
            allowed_mentions: {
              "users": [userId]
            }
          }
        });
      }
      else {
        db.run(
          'DELETE FROM schedule WHERE uuid=$uuid',
          { $uuid: uuid },
          function() {
            return res.send({
              type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
              data: {
                content: `Deleted Spider with uuid ${uuid} for user `
                         + `<@${userId}>`,
                allowed_mentions: {
                  "users": [userId]
                }
              }
            });
          }
        );
      }
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
