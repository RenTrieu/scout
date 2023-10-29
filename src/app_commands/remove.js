import { InteractionResponseType } from 'discord-interactions';
import { getUserSpiders } from '../spider_manager.js'

export default async function removeCommand(req, res, pool) {
  const uuid = req.body.data.options[0].value;
  const userId = req.body.member.user.id;
  const userSpiders = await getUserSpiders(pool, userId);
  const matchingSpider = userSpiders.filter((row) => row.uuid == uuid);
  if (matchingSpider.length <= 0) {
    return res.send({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: `No spider for <@${userId}> exists with a uuid of ${uuid}`,
        allowed_mentions: {
          "users": [userId]
        }
      }
    });
  }
  else {
    const client  = await pool.connect();
    client.query(
      'DELETE FROM schedule WHERE uuid=$1',
      [uuid],
      function() {
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: `Deleted Spider with uuid ${uuid} for user `
                     + `<@${userId}>`,
            allowed_mentions: {
              "users": [userId]
            }
          }
        });
      }
    );
    await client.end();
  }
}
