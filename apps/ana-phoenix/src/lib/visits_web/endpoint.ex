defmodule VisitsWeb.Endpoint do
  use Phoenix.Endpoint, otp_app: :visits

  plug Plug.RequestId
  plug Plug.Telemetry, event_prefix: [:phoenix, :endpoint]
  plug VisitsWeb.Router
end
