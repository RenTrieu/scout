import { InteractionResponseType } from "discord-interactions";
import { getUserSpiders } from '../spider_manager.js';

export default async function listCommand(
  req, res, db, displayLimit=2
) {
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

  const displayRows = userSpiders.slice(0, displayLimit);
  let row_embeds = [];
  row_embeds.push(
    {
      title: `Result Page [1/${Math.ceil(userSpiders.length/displayLimit)}]`,
      type: 'rich',
      description: `<@${userId}>'s Active Spiders`,
    }
  )
  let resultNum = 1;
  displayRows.forEach((row) => {
    row_embeds.push(
      {
        title: `Result [${resultNum}/${displayLimit}]`,
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
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      embeds: row_embeds,
      allowed_mentions: {
        "users": [userId]
      }
    }
  });
}
