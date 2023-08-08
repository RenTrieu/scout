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
  getAvailableSpiders
} from './utils.js';
import * as fs from 'node:fs';
import { Buffer, constants } from 'node:buffer';

// Create an express app
const app = express();
// Get port, or default to 3000
const PORT = process.env.PORT || 3000;
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
  }
});

app.listen(PORT, () => {
  console.log('Listening on port', PORT);
});
