import 'dotenv/config';
import {
  InteractionResponseType,
} from 'discord-interactions';
import {
  unixCommandSync,
  getAvailableSpiders,
  DiscordRequest
} from './utils.js';
import * as fs from 'node:fs';


export function smartParse(req, res) {
  const spiderName = req.body.data.options[0].value;
  const activeSpiders = getAvailableSpiders().map((obj) => obj.value);
  let prevOutput;
  if (activeSpiders.includes(spiderName)) {
    // Creating the directory for the spider output
    // if it does not already exist
    const outputDir = 'spider_output/'
    const spiderFile = `${spiderName.slice(0, -3)}.json`
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }
    else if (fs.existsSync(outputDir + spiderFile)) {
      // If the spider output already exists, store the previous output
      prevOutput = fs.readFileSync(
        `${outputDir}${spiderFile}`
      ).toString();
    }

    // Running the spider
    try {
      unixCommandSync(
        `scrapy runspider spiders/${spiderName} `
        + `-O ${outputDir}${spiderFile}:json`
      );
    }
    catch (error) {
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: `While trying to run the spider "${spiderName}", `
                   + `the following error occurred: ${error}`,
        }
      });
    }

    const output = fs.readFileSync(
      `${outputDir}${spiderFile}`
    ).toString();

    if (typeof prevOutput === "undefined" ) {
      // If there was no previous output, return the Spider output
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: `No previous results for spider "${spiderName}". `
                   + `Current results: ${output}`,
        }
      });
    }
    // Otherwise, only report differences between the previous and 
    // current output
    else if (prevOutput === output) {
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: `No change in the output of spider "${spiderName}"`,
        }
      });
    }
    else {
      let prevObj = JSON.parse(prevOutput).map((el) => {
        return JSON.stringify(el);
      });
      let curObj = JSON.parse(output).map((el) => {
        return JSON.stringify(el);
      });
      // Looking for changes between previous and current outputs
      // console.log(`typeof prevObj: ${typeof prevObj}`);
      let removedSet = prevObj.filter((el) => !curObj.includes(el));
      let addedSet = curObj.filter((el) => !prevObj.includes(el));

      let contentStr = 'Removed Keys:\n' 
        + removedSet.map((el) => {
          const elObj = JSON.parse(el);
          return `${Object.values(elObj)}\n`
        }) + '\n'
        + 'Added Keys:\n'
        + addedSet.map((el) => {
          const elObj = JSON.parse(el);
          return `${Object.values(elObj)}\n`
        });
      console.log(`contentStr: ${contentStr}`);

      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: contentStr,
        }
      });
    }
  }
  else {
    return res.send({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: `Spider "${spiderName}" does not exist.`
      }
    });
  }
}
