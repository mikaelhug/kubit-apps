defmodule Visits.Application do
  use Application

  @impl true
  def start(_type, _args) do
    children = [Visits.Repo, VisitsWeb.Endpoint]
    Supervisor.start_link(children, strategy: :one_for_one, name: Visits.Supervisor)
  end
end
