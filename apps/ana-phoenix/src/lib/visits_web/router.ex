defmodule VisitsWeb.Router do
  use Phoenix.Router

  pipeline :browser do
    plug :accepts, ["html"]
  end

  get "/healthz", VisitsWeb.PageController, :health

  scope "/", VisitsWeb do
    pipe_through :browser
    get "/", PageController, :index
  end
end
