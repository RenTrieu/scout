import { InteractionResponseType } from "discord-interactions";
import {
  getUserSpiders,
  genPagedList,
  genSpiderEmbed,
} from '../spider_manager.js';

export default async function listCommand(
  req, res, pool, displayLimit=2
) {
  const userId = req.body.member.user.id;
  let userSpiders = await getUserSpiders(pool, userId);
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
    const pageTotal = Math.min(displayLimit, userSpiders.length);

    let scheduleStr = '';
    const repeatInterval = row.repeat_interval;
    scheduleStr += `Repeats ${repeatInterval}\n`;
    Object.values(JSON.parse(row.schedule_str)).forEach((schedAttr) => {
      scheduleStr += `${schedAttr.name}: ${schedAttr.value}\n`;
    });
    row_embeds.push(
      {
        title: `Result [${resultNum}/${pageTotal}]`,
        type: 'rich',
        fields: [
          { name: 'UUID', 'value': row.uuid },
          { name: 'Spider', 'value': row.spider_name },
          { name: 'Guild', 'value': row.guild_id },
          { name: 'Channel', 'value': row.channel_id },
          { name: 'User', 'value': row.user_id },
          { name: 'Scheduled', 'value': scheduleStr }
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
              disabled: userSpiders.length <= displayLimit ? true : false
            }
          ]
        }
      ]
    }
  });
}

export async function listInteraction(
  req, res, pool, displayLimit=2
) {
  const headerEmbed = req.body.message.embeds[0];
  const userId = req.body.member.user.id;

  const sqlQuery = 'SELECT * FROM schedule WHERE user_id = $1';
  const getSpiderRows = new Promise((resolve, reject) => {
    pool.query(sqlQuery, [userId],
      function(_err, result) {
        resolve(result.rows);
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
        genSpiderEmbed(row, `Result [${resultNum}/${displayRows.length}]`)
      );
      resultNum += 1;
    });

    return res.send({
      type: InteractionResponseType.UPDATE_MESSAGE,
      data: {
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
