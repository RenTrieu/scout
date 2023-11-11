import { InteractionResponseType } from 'discord-interactions';
import { checkSpider, diffParse } from '../spider_manager.js';
import { DiscordRequest, genUUID } from '../utils.js';

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const schedule = require('node-schedule');

export default async function scheduleCommand(req, res, pool) {
  const spider_name = req.body.data.options[0].options.filter((option) => {
    return option.name == 'spider'
  })[0].value;
  const channel_id = req.body.channel_id;
  const user_id = req.body.member.user.id;
  const guild_id = req.body.guild_id;
  let spiderExists = await checkSpider(pool, user_id, channel_id, spider_name);
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

  const uuid = await genUUID(pool);

  const scheduleObj = req.body.data.options[0].options.filter((schedAttr) => {
    return schedAttr.name != 'spider'
  });

  const newSchedObj = {};
  scheduleObj.forEach((schedAttrs) => {
    if (schedAttrs.name != 'day-of-week') {
      Object.assign(newSchedObj, { [schedAttrs.name]: schedAttrs.value });
    }
    else {
      Object.assign(newSchedObj, { 'dayOfWeek': schedAttrs.value });
    }
  });

  Object.assign(newSchedObj, { 'tz': 'PST' });

  const job = schedule.scheduleJob(newSchedObj, function() {
    const diffEmbed = diffParse(spider_name);
    const endpoint = `channels/${channel_id}/messages`;
    const requestPromise = new Promise((_resolve, _reject) => {
      DiscordRequest(endpoint, {
        method: 'POST',
        body: {
          embeds : [diffEmbed],
          allowed_mentions: {
            "users": [user_id]
          }
        }
      });
    });
    requestPromise.then();
    console.log('test!!!');
  });

  const scheduleStr = JSON.stringify(scheduleObj);
  const repeatInterval = req.body.data.options[0].name;

  const client = await pool.connect();
  client.query(
    'INSERT INTO schedule (uuid, user_id, channel_id, guild_id, spider_name, '
    + 'schedule_str, repeat_interval) VALUES ($1, $2, $3, $4, $5, $6, $7)',
    [
      uuid,
      user_id,
      channel_id,
      guild_id,
      spider_name,
      scheduleStr,
      repeatInterval
    ],
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
  await client.end();
}
