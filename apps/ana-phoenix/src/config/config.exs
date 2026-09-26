import Config

config :visits, ecto_repos: [Visits.Repo]

config :visits, VisitsWeb.Endpoint,
  adapter: Bandit.PhoenixAdapter,
  render_errors: [formats: [html: VisitsWeb.ErrorHTML], layout: false]

config :phoenix, :json_library, Jason

config :logger, :default_formatter, format: "$time $metadata[$level] $message\n"
