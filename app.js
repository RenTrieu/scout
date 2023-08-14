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
  getAvailableSpiders
} from './utils.js';
import {
  smartParse,
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
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          // Fetches a random emoji to send from a helper function
          content: 'hello world ' + getRandomEmoji(),
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
                            + `-O ${outputDir}${spiderFile}:json`);
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

    // "Schedule Spider" command
    if (name === 'schedule') {
      return smartParse(req, res);
    }
  }
});

/*
 * Manages scheduled reports
 */
const rule = new schedule.RecurrenceRule();
rule.minute = 10;
const job = schedule.scheduleJob(rule, function() {
  console.log('schedule test');
});

const channelId = '967038778524966915';
const endpoint = `channels/${channelId}/messages`
try {
  await DiscordRequest(endpoint, { 
    method: 'POST', 
    body: { 
      content: 'test message',
    }
  });
}
catch (err) {
  console.error(err);
}

app.listen(PORT, () => {
  console.log('Listening on port', PORT);
});
