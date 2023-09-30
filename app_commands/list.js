import { InteractionResponseType } from "discord-interactions";
import {
  getUserSpiders,
  genPagedList,
} from '../spider_manager.js';

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
      },
      components: [
        {
          type: 1,
          components: [
            {
              type: 2,
              label: 'PREV',
              style: 1,
              custom_id: 'list_prev',
              disabled: true
            },
            {
              type: 2,
              label: 'NEXT',
              style: 1,
              custom_id: 'list_next',
              disabled: false
            }
          ]
        }
      ]
    }
  });
}

export async function listInteraction(
  req, res, db, displayLimit=2
) {
  const headerEmbed = req.body.message.embeds[0];
  const userId = req.body.member.user.id;

  const sqlQuery = 'SELECT * FROM schedule WHERE user_id = $userId';
  const getSpiderRows = new Promise((resolve, reject) => {
    db.all(sqlQuery, { $userId: userId },
      function(_err, rows) {
        resolve(rows);
      }
    );
  });

  getSpiderRows.then((rows) => {
    let rowEmbeds = [];
    const {curPage, buttons, displayRows} = genPagedList(
      req, rows, displayLimit, 'list_prev', 'list_next'
    );
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
