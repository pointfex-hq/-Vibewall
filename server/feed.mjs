export async function items(sql, type, room, user, hidden = false, id = null) {
  const photo = type === "post";
  const detail = photo
    ? sql`x.image_url,x.frame_id,u.avatar_url as author_avatar,x.visibility`
    : sql`x.body,x.is_pinned,x.moderation_status`;
  const state = sql(photo ? "visibility" : "moderation_status");
  return sql`select x.id,x.created_at,u.display_name as author_name,${detail},
    (select count(*)::int from likes l where l.target_type=${type} and l.target_id=x.id) as like_count,
    exists(select from likes l where l.target_type=${type} and l.target_id=x.id and l.user_id=${user}) as liked_by_me
    from ${sql(photo ? "posts" : "notes")} x join users u on u.id=x.author_user_id
    where x.room_id=${room} and (${id}::uuid is null or x.id=${id}) and
    (${state}='approved' or (${hidden} and ${state}='hidden')) order by x.created_at desc`.then(
    (rows) =>
      rows.map((row) => {
        if (row.author_avatar === null) delete row.author_avatar;
        return row;
      }),
  );
}
export async function pollDTO(sql, poll, user) {
  if (!poll) return null;
  const options =
    await sql`select o.id,o.option_text,count(v.user_id)::int vote_count from poll_options o left join poll_votes v on v.option_id=o.id where o.poll_id=${poll.id} group by o.id order by o.position`;
  const [vote] =
    await sql`select option_id from poll_votes where poll_id=${poll.id} and user_id=${user}`;
  return {
    id: poll.id,
    question: poll.question,
    is_open: poll.is_open,
    options,
    total_votes: options.reduce((n, o) => n + o.vote_count, 0),
    user_voted_option_id: vote?.option_id ?? null,
  };
}
export async function storyDTO(sql, story, hidden = false) {
  if (!story) return null;
  const entries =
    await sql`select e.id,e.image_url,u.display_name author_name,e.sequence_order,e.created_at from story_entries e join users u on u.id=e.author_user_id where story_id=${story.id} and (visibility='approved' or (${hidden} and visibility='hidden')) order by sequence_order`;
  return {
    id: story.id,
    prompt: story.prompt,
    is_active: story.is_active,
    entries,
  };
}
export async function feed(sql, room, user, hidden, screen) {
  const posts = await items(sql, "post", room, user, hidden);
  const notes = await items(sql, "note", room, user, hidden);
  const [poll] =
    await sql`select * from polls where room_id=${room} and is_open`;
  const result = {
    posts,
    pinned_notes: notes.filter((n) => n.is_pinned),
    notes: notes.filter((n) => !n.is_pinned),
    active_poll: await pollDTO(sql, poll, user),
  };
  if (!screen) {
    const [story] =
      await sql`select * from stories where room_id=${room} and is_active`;
    result.active_story = await storyDTO(sql, story, hidden);
  }
  return result;
}
