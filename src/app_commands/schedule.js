import { InteractionResponseType } from 'discord-interactions';
import { checkSpider } from '../spider_manager.js';
import { genUUID } from '../utils.js';

export default async function scheduleCommand(req, res, db) {
  const spider_name = req.body.data.options[0].value;
  const channel_id = req.body.channel_id;
  const user_id = req.body.member.user.id;
  const guild_id = req.body.guild_id;
  let spiderExists = await checkSpider(db, user_id, channel_id, spider_name);
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

  const uuid = await genUUID(db);

  db.run(
    'INSERT INTO schedule (uuid, user_id, channel_id, guild_id, spider_name) '
    + 'VALUES ($uuid, $user_id, $channel_id, $guild_id, $spider_name)',
    {
      $uuid: uuid,
      $user_id: user_id,
      $channel_id: channel_id,
      $guild_id: guild_id,
      $spider_name: spider_name
    },
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
}