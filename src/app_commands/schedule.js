import { InteractionResponseType } from 'discord-interactions';
import { checkSpider, scheduleSpider } from '../spider_manager.js';
import { genUUID } from '../utils.js';


export default async function scheduleCommand(req, res, pool, jobMap) {
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

      /* Scheduling spider as a scheduled job */
      scheduleSpider(
        jobMap, 
        uuid,
        scheduleObj, 
        spider_name, 
        user_id, 
        channel_id,
      );

      /* Sending success response */
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
