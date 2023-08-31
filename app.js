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
  checkSpider
} from './spider_manager.js';
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
db.run("CREATE TABLE schedule (user_id VARCHAR, channel_id VARCHAR, spider_name TEXT)");

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
      let output = '';
      let userSet = await getActiveUsers(db);
      userSet.forEach((value) => {
        output += value
      });
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: output
        },
      });
    }

    // "python call" command
    if (name === 'call') {
      const objectName = req.body.data.options[0].value;
      const activeSpiders = getAvailableSpiders().map((obj) => obj.value);
      if (activeSpiders.includes(objectName)) {
        // Creating the directory for the spider output
        // if it does not already exist
        const outputDir = 'spider_output/'
        const spiderFile = `${objectName.slice(0, -3)}.json`
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir);
        }

        try {
          await unixCommand(`scrapy runspider spiders/${objectName} `
                            + `-O ${outputDir}${spiderFile}:json 2>/dev/null`);
        }
        catch (error) {
          return res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: 'While trying to run the spider, '
                       + `the following error occurred: ${error}`,
            }
          });
        }

        const output = fs.readFileSync(`${outputDir}${spiderFile}`).toString();

        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: output,
          }
        });
      }
      else {
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: `Error: spider "${objectName}" not found`,
          }
        });
      }
    }

    // List Scheduled Spiders command
    if (name === 'list') {
      const userId = req.body.member.user.id;
      let userSpiders = await getUserSpiders(db, userId);
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
      db.run(
        'INSERT INTO schedule (user_id, channel_id, spider_name) VALUES '
        + '($user_id, $channel_id, $spider_name)',
        {
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
