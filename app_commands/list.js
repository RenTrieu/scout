import { InteractionResponseType } from "discord-interactions";
import { getUserSpiders } from '../spider_manager.js';

export default async function listCommand(req, res, db) {
  const userId = req.body.member.user.id;
  let userSpiders = await getUserSpiders(db, userId);
  if (userSpiders.length <= 0) {
    return res.send({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: `No scheduled spiders exists for <@${userId}>`,
        allowed_mentions: {
          "users": [userId]
        }
      }
    });
  }
  let returnStr = '';
  for (let i in userSpiders) {
    returnStr += `${JSON.stringify(userSpiders[i])}\n`;
  }
  return res.send({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content: returnStr,
      allowed_mentions: {
        "users": [userId]
      }
    }
  });
}
