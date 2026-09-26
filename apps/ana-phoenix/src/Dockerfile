FROM hexpm/elixir:1.18.4-erlang-28.1-debian-bookworm-20250929-slim AS build
WORKDIR /app
ENV MIX_ENV=prod
RUN mix local.hex --force && mix local.rebar --force
COPY mix.exs mix.lock ./
RUN mix deps.get --only prod && mix deps.compile
COPY config config
COPY lib lib
COPY priv priv
RUN mix compile && mix release

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends libstdc++6 libssl3 libncurses6 ca-certificates && rm -rf /var/lib/apt/lists/*
ENV LANG=C.UTF-8 RELEASE_TMP=/tmp
WORKDIR /app
COPY --from=build --chown=nobody:nogroup /app/_build/prod/rel/visits ./
USER nobody
EXPOSE 4000
CMD ["/bin/sh", "-c", "bin/visits eval 'Visits.Release.migrate()' && exec bin/visits start"]
