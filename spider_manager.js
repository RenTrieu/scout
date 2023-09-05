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


/*
 * Runs a given spider and only reports the changes between the current and 
 * previous output
 *
 * Returns results as a String containing either spider results or error
 * message
 */
export function diffParse(spiderName) {
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
      return `While trying to run the spider "${spiderName}", `
             + `the following error occurred: ${error}`;
    }

    const output = fs.readFileSync(
      `${outputDir}${spiderFile}`
    ).toString();

    if (typeof prevOutput === "undefined" ) {
      // If there was no previous output, return the Spider output
      return `No previous results for spider "${spiderName}". `
             + `Current results: ${output}`
    }
    // Otherwise, only report differences between the previous and 
    // current output
    else if (prevOutput === output) {
      return `No change in the output of spider "${spiderName}"`;
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
      return contentStr;
    }
  }
  else {
    return `Spider "${spiderName}" does not exist.`;
  }
}

/*
 * Iterates through the database and returns a Promise that resolves to a 
 * Set() containing all users that have active spiders
 */
export async function getActiveUsers(db) {
  let getUserSet = new Promise((resolve, reject) => {
    db.all(
      'SELECT user_id FROM schedule',
      function(_err, rows) {
        const userSet = new Set();
        for (const i in rows) {
          userSet.add(rows[i].user_id);
        }
        resolve(userSet)
      })
    }
  );
  return getUserSet;
}

/*
 * Queries the database for all spiders owned by a user
 * and returns a Promise that resolves to an array of the results
 */
export async function getUserSpiders(db, userId) {
  let getUserSpiders = new Promise((resolve, reject) => {
    db.all(
      `SELECT * FROM schedule WHERE user_id=$user_id`,
      { $user_id: userId },
      function(_err, rows) {
        let userSpiders = rows.filter((row) => row.user_id == userId);
        resolve(userSpiders);
      }
    )
  });
  return getUserSpiders;
}

/*
 * Queries the database for a specific Spider Schedule and returns a Promise 
 * that resolves to true if it exists in the database
 */
export async function checkSpider(db, userId, channelId, spiderName) {
  let getSpiderRow = new Promise((resolve, reject) => {
    db.all(
      `SELECT * FROM schedule WHERE user_id=$user_id AND `
      + `channel_id=$channel_id AND spider_name=$spider_name`,
      { $user_id: userId, $channel_id: channelId, $spider_name: spiderName },
      function(_err, rows) {
        if (rows.length > 0) {
          resolve(true);
        }
        else {
          resolve(false);
        }
      }
    )
  });
  return getSpiderRow;
}

