import { InteractionResponseType } from "discord-interactions";
import { checkSpider } from '../spider_manager.js';
import { genUUID } from '../utils.js';

export default async function adminScheduleCommand(req, res, pool) {
  // Building the SQL query based off of the passed arguments
  const spiderName = req.body.data.options.filter((arg) => {
    return arg.name == 'spider-name';
  })[0].value;
  const userId = req.body.data.options.filter((arg) => {
    return arg.name == 'user-id';
  })[0].value;
  const channelId = req.body.data.options.filter((arg) => {
    return arg.name == 'channel-id';
  })[0].value;
  const guildId = req.body.data.options.filter((arg) => {
    return arg.name == 'guild-id';
  })[0].value;

  let spiderExists = await checkSpider(pool, userId, channelId, spiderName);
  if (spiderExists) {
    return res.send({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: `Spider ${spiderName} already exists with the following `
                 + 'properties:\n'
                 + `User ID: ${userId}\n`
                 + `Channel ID: ${channelId}\n`
                 + `Server ID: ${guildId}`
      }
    });
  }

  const uuid = await genUUID(pool);

  const client = await pool.connect();
  client.query(
    'INSERT INTO schedule (uuid, user_id, channel_id, guild_id, spider_name) '
    + 'VALUES ($1, $2, $3, $4, $5)',
    [uuid, userId, channelId, guildId, spiderName],
    function() {
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: `Scheduled spider ${spiderName} with uuid ${uuid}\n`
                   + `User ID: ${userId}\n`
                   + `Channel ID: ${channelId}\n`
                   + `Server ID: ${guildId}`
        }
      });
    }
  );
  await client.end();
}
