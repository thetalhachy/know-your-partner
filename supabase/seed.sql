-- Know Your Partner · question bank seed (v1)
-- Run after schema.sql. Inserts the 8 current categories / 32 questions
-- with metadata for the phase-3 question engine.

insert into public.questions (category, question, depth, relationship_stage, intimacy_level, ordering) values
  ('Us',          'What is one thing you think makes our relationship different from most?',           1, 'any',    1, 1),
  ('Us',          'What is something small I do that makes you feel loved?',                           1, 'any',    2, 2),
  ('Us',          'What do you hope never changes about us?',                                          1, 'any',    2, 3),
  ('Us',          'When do you feel most like we''re a team?',                                         1, 'any',    1, 4),

  ('Feelings',    'When you''re having a terrible day, what do you secretly want from me?',            2, 'any',    2, 1),
  ('Feelings',    'What is something you find difficult to ask for?',                                  2, 'any',    2, 2),
  ('Feelings',    'What makes you feel most emotionally safe with someone?',                           2, 'any',    2, 3),
  ('Feelings',    'What is a feeling you wish you expressed more often?',                              2, 'any',    2, 4),

  ('Future',      'What kind of life would make you genuinely happy ten years from now?',              2, 'long',   2, 1),
  ('Future',      'Where would you want us to wake up on an ordinary Sunday someday?',                 1, 'any',    1, 2),
  ('Future',      'What is one dream you''re afraid you might never achieve?',                         2, 'long',   2, 3),
  ('Future',      'What matters more to you: stability, freedom, or adventure?',                       1, 'any',    1, 4),

  ('Memories',    'What childhood memory still feels warm when you think about it?',                   1, 'any',    1, 1),
  ('Memories',    'What is a moment in your life that changed who you became?',                        2, 'any',    2, 2),
  ('Memories',    'What is something from your past you wish I could have witnessed?',                 2, 'long',   2, 3),
  ('Memories',    'What smell, song, or place instantly takes you back somewhere?',                    1, 'any',    1, 4),

  ('Fun',         'If we had to disappear for 48 hours tomorrow, where would we go?',                  1, 'new',    1, 1),
  ('Fun',         'What ridiculous thing would you happily do with me?',                               1, 'new',    1, 2),
  ('Fun',         'If our relationship were a movie, what genre would it be?',                         1, 'any',    1, 3),
  ('Fun',         'What weird opinion could you probably convince me to adopt?',                       1, 'any',    1, 4),

  ('Deep stuff',  'What is something you''re still figuring out about yourself?',                     3, 'long',   3, 1),
  ('Deep stuff',  'What do you think people misunderstand about you?',                                 2, 'any',    2, 2),
  ('Deep stuff',  'What would you want me to remember if you were having a very difficult year?',      3, 'long',   3, 3),
  ('Deep stuff',  'What does a good life actually mean to you?',                                      2, 'any',    2, 4),

  ('Intimacy',    'When do you feel closest to me?',                                                   2, 'long',   3, 1),
  ('Intimacy',    'What kind of affection makes you feel most wanted?',                                2, 'long',   3, 2),
  ('Intimacy',    'What is something romantic you''d love us to do more often?',                       1, 'any',    2, 3),
  ('Intimacy',    'What helps you feel comfortable being completely vulnerable?',                      3, 'long',   3, 4),

  ('Me',          'What is a part of yourself you''re proud of but rarely talk about?',                2, 'any',    2, 1),
  ('Me',          'What is one habit you wish you could change?',                                     1, 'any',    1, 2),
  ('Me',          'What kind of compliment actually stays with you?',                                  1, 'any',    1, 3),
  ('Me',          'What do you think you need more of in your life right now?',                        2, 'any',    2, 4)
on conflict do nothing;
