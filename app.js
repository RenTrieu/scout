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
  DiscordRequest, 
} from './utils.js';
import {
  diffParse,
  getActiveUsers,
  getUserSpiders,
} from './spider_manager.js';
import {
  callCommand,
  testCommand,
  listCommand,
  scheduleCommand,
  removeCommand,
} from './app_commands/index.js';
import {
  adminListCommand,
  adminRemoveCommand,
  adminScheduleCommand
} from './admin_commands/index.js';
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
const sqlite3 = require('sqlite3').verbose();
const dbFile = 'scout.sqlite'
const db = new sqlite3.Database(dbFile);
const dbExists = fs.existsSync(dbFile);
if (!dbExists) {
  db.run("CREATE TABLE schedule (uuid VARCHAR NOT NULL, "
         + "guild_id VARCHAR NOT NULL, user_id VARCHAR NOT NULL, "
         + "channel_id VARCHAR NOT NULL, spider_name TEXT NOT NULL, "
         + "PRIMARY KEY (uuid))");
}

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

    // "test" command
    if (name === 'test') {
      // Send a message into the channel where command was triggered from
      return testCommand(req, res);
    }

    /* Application Commands */

    // "Spider Call" command
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

    /* Admin Commands */

    // Admin List command
    if (name === 'admin_list') {
      return adminListCommand(req, res, db);
    }

    // Admin Remove command
    if (name == 'admin_remove') {
      return adminRemoveCommand(req, res, db);
    }

    // Admin Schedule command
    if (name == 'admin_schedule') {
      return adminScheduleCommand(req, res, db);
    }
  }

  /*
   * Handle message component interactions
   */
  if (type === InteractionType.MESSAGE_COMPONENT) {
    const custom_id = req.body.data.custom_id;
    console.log(`custom_id: ${custom_id}`);

    // Admin List Actions
    if ((custom_id === 'admin_list_next') 
        || (custom_id === 'admin_list_prev')) {

      let headerEmbed = req.body.message.embeds[0];
      const queryOptions = JSON.parse(headerEmbed.description.split('\n')[1]);

      let sqlQuery = 'SELECT * FROM schedule';
      const initial_len = sqlQuery.length;
      Object.keys(queryOptions).forEach((option) => {
        if (sqlQuery.length === initial_len) {
          sqlQuery += ` WHERE ${option} = ${queryOptions[option]}`;
        }
        else {
          sqlQuery += ` AND ${option} = ${queryOptions[option]}`;
        }
      });

      const getSpiderRows = new Promise((resolve, reject) => {
        db.all(sqlQuery,
          function(_err, rows) {
            resolve(rows);
          }
        );
      });

      getSpiderRows.then((rows) => {
        let rowEmbeds = [];
        let curPage = parseInt(
          headerEmbed.title.split(' ')[2].split('/')[0].slice(1)
        );

        let displayRows;
        if (custom_id === 'admin_list_next') {
          curPage += 1;
        }
        else {
          curPage -= 1;
        }

        displayRows = rows.slice(
          Math.max((curPage - 1) * displayLimit, 0),
          Math.min(curPage * displayLimit, rows.length)
        );

        let buttons = req.body.message.components[0].components;

        let prevButton = buttons.find((button) => button.label == 'PREV');
        let nextButton = buttons.find((button) => button.label == 'NEXT');
        prevButton.disabled = curPage == 1 ? true : false;
        nextButton.disabled = curPage == displayLimit ? true : false;

        headerEmbed.title = 'Result Page '
          + `[${curPage}/${Math.ceil(rows.length/displayLimit)}]`;
        rowEmbeds.push(headerEmbed);

        let resultNum = 1;
        displayRows.forEach((row) => {
          rowEmbeds.push(
            {
              title: `Result [${resultNum}/${displayRows.length}]`,
              type: 'rich',
              fields: [
                { name: 'UUID', 'value': row.uuid },
                { name: 'Spider', 'value': row.spider_name },
                { name: 'Guild', 'value': row.guild_id },
                { name: 'Channel', 'value': row.channel_id },
                { name: 'User', 'value': row.user_id }
              ]
            }
          );
          resultNum += 1;
        });

        return res.send({
          type: InteractionResponseType.UPDATE_MESSAGE,
          data: {
            content: `update: ${sqlQuery}`,
            embeds: rowEmbeds,
            components: [
              {
                type: 1,
                components: buttons 
              }
            ],
          }
        });
      });
    }

    // return res.send({ 
    //   type: InteractionResponseType.UPDATE_MESSAGE,
    //   data: {
    //     content: `custom_id: ${custom_id}`,
    //   }
    // });
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
