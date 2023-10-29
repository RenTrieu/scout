import { InteractionResponseType } from 'discord-interactions';
import { checkSpider } from '../spider_manager.js';
import { genUUID } from '../utils.js';

export default async function scheduleCommand(req, res, pool) {
  const spider_name = req.body.data.options[0].value;
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

  const client = await pool.connect();
  await client.query('BEGIN');
  client.query(
    'INSERT INTO schedule (uuid, user_id, channel_id, guild_id, spider_name) '
    + 'VALUES ($1, $2, $3, $4, $5)',
    [uuid, user_id, channel_id, guild_id, spider_name],
    function() {
      client.release();
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
}
