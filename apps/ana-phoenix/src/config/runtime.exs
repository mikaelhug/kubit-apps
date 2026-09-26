import Config

if config_env() == :prod do
  config :logger, level: :info

  config :visits, Visits.Repo,
    url: System.fetch_env!("DATABASE_URL"),
    pool_size: 5

  config :visits, VisitsWeb.Endpoint,
    http: [ip: {0, 0, 0, 0}, port: 4000],
    url: [host: System.get_env("PHX_HOST", "localhost"), port: 443, scheme: "https"],
    secret_key_base: System.fetch_env!("SECRET_KEY_BASE"),
    server: true
end
