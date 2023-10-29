import { InteractionResponseType } from "discord-interactions";

export default async function adminRemoveCommand(req, res, pool) {
  const uuid = req.body.data.options[0].value;
  let getRow = new Promise((resolve, reject) => {
    pool.query(
      'SELECT * FROM schedule WHERE uuid=$1',
      [uuid],
      function(err, result) {
        resolve(result.rows[0]);
      }
    );
  });
  const row = await getRow;
  console.log('row');
  console.log(row)
  if (typeof row === 'undefined') {
    return res.send({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: `No Spider with uuid ${uuid} found.`
      }
    });
  }
  const client = await pool.connect();
  client.query(
    'DELETE FROM schedule WHERE uuid=$1',
    [uuid],
    function(result) {
      console.log('result');
      console.log(result);
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: `Deleted Spider ${row.spider_name} with uuid ${uuid} `
                   + `for user ${row.user_id} in server ${row.guild_id}`,
        }
      });
    }
  );
  await client.end();
}
