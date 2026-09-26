defmodule Visits.MixProject do
  use Mix.Project

  def project do
    [
      app: :visits,
      version: "0.1.1",
      elixir: "~> 1.18",
      start_permanent: Mix.env() == :prod,
      deps: deps(),
      releases: [visits: []]
    ]
  end

  def application do
    [mod: {Visits.Application, []}, extra_applications: [:logger, :runtime_tools]]
  end

  defp deps do
    [
      {:phoenix, "~> 1.8"},
      {:phoenix_ecto, "~> 4.6"},
      {:ecto_sql, "~> 3.13"},
      {:postgrex, "~> 0.21"},
      {:bandit, "~> 1.8"},
      {:jason, "~> 1.4"}
    ]
  end
end
