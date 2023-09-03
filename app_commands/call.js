import { InteractionResponseType } from 'discord-interactions';
import {
  getAvailableSpiders,
  unixCommand,
} from '../utils.js'
import * as fs from 'node:fs';

export default async function callCommand(req, res) {
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
