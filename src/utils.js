import 'dotenv/config';
import fetch from 'node-fetch';
import { verifyKey } from 'discord-interactions';
import { createRequire } from 'module';
import crypto from 'node:crypto';
const require = createRequire(import.meta.url);

export function VerifyDiscordRequest(clientKey) {
  return function (req, res, buf, encoding) {
    const signature = req.get('X-Signature-Ed25519');
    const timestamp = req.get('X-Signature-Timestamp');

    const isValidRequest = verifyKey(buf, signature, timestamp, clientKey);
    if (!isValidRequest) {
      res.status(401).send('Bad request signature');
      throw new Error('Bad request signature');
    }
  };
}

export async function DiscordRequest(endpoint, options) {
  // append endpoint to root API URL
  const url = 'https://discord.com/api/v10/' + endpoint;
  // Stringify payloads
  if (options.body) options.body = JSON.stringify(options.body);
  // Use node-fetch to make requests
  const res = await fetch(url, {
    headers: {
      Authorization: `Bot ${process.env.DISCORD_TOKEN}`,
      'Content-Type': 'application/json; charset=UTF-8',
      'User-Agent': 'DiscordBot (https://github.com/discord/discord-example-app, 1.0.0)',
    },
    ...options
  });
  // throw API errors
  if (!res.ok) {
    const data = await res.json();
    console.log(res.status);
    throw new Error(JSON.stringify(data));
  }
  // return original response
  return res;
}

export async function InstallGlobalCommands(appId, commands) {
  // API endpoint to overwrite global commands
  const endpoint = `applications/${appId}/commands`;

  try {
    // This is calling the bulk overwrite endpoint: https://discord.com/developers/docs/interactions/application-commands#bulk-overwrite-global-application-commands
    await DiscordRequest(endpoint, { method: 'PUT', body: commands });
  } catch (err) {
    console.error(err);
  }
}

export async function InstallGuildCommands(appId, guildId, commands) {
  // API endpoint to overwrite guild commands
  const endpoint = `/applications/${appId}/guilds/${guildId}/commands`
  try {
    await DiscordRequest(endpoint, { method: 'PUT', body: commands });
  } catch (err) {
    console.error(err);
  }
}

// Simple method that returns a random emoji from list
export function getRandomEmoji() {
  const emojiList = ['😭','😄','😌','🤓','😎','😤','🤖','😶‍🌫️','🌏','📸','💿','👋','🌊','✨'];
  return emojiList[Math.floor(Math.random() * emojiList.length)];
}

export function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/*
 * Helper method to send a UNIX command and returns a Promse that resolves 
 * to the stdout
 */
export async function unixCommand(cmd) {
  return new Promise((resolve) => {
    var exec = require('child_process').exec;
    var result = '';
    var child = exec(cmd);
    child.stdout.on('data', function(data) {
      result += data;
    });
    child.on('close', function() {
      resolve(result);
    });
  });
}

export function unixCommandSync(cmd) {
  return require('child_process').execSync(cmd);
}

/*
 * Get an array of available spiders
 */
export function getAvailableSpiders() {
  const spiderQuery = unixCommandSync('ls spiders/');
  const activeSpiders = spiderQuery.toString('utf8')
                                    .trim()
                                    .split('\n');
  const spiderChoices = activeSpiders.map((spider) => {
    return { name: spider.slice(0, -3), value: spider }
  });
  return spiderChoices;
}

/*
 * Queries the database to check to see if a row with a given 
 * UUID exists and returns a Promise that resolves to true if it exists in
 * the database
 */
export async function checkUUID(pool, uuid) {
  let row = new Promise((resolve, reject) => {
    pool.query(
      `SELECT * FROM schedule WHERE uuid=$1`,
      [uuid],
      function(_err, res) {
        if (res.rows.length > 0) {
          resolve(true);
        }
        else {
          resolve(false);
        }
      }
    )
  });
  return row;
}

/*
 * Helper method that generates a UUID that does not exist in the database
 */
export async function genUUID(pool) {
  let uuidExists = true;
  let uuid;
  do {
    uuid = crypto.randomUUID();
    uuidExists = await checkUUID(pool, uuid);
  }
  while (uuidExists);
  return uuid;
}

