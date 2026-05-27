create table if not exists media_items (
  uuid text primary key,
  user_id text not null,
  imdb_id text not null,
  title text not null,
  year integer not null,
  end_year integer,
  poster_url jsonb,
  watched boolean not null,
  rating double precision,
  comment text,
  date_added timestamptz not null default now(),
  constraint uq_media_items_user_imdb_id unique (user_id, imdb_id)
);

create index if not exists ix_media_items_user_id on media_items (user_id);
create index if not exists ix_media_items_imdb_id on media_items (imdb_id);
