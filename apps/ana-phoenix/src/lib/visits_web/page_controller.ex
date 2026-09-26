defmodule VisitsWeb.PageController do
  use Phoenix.Controller, formats: [:html]

  alias Visits.{Repo, Visit}

  def index(conn, _params) do
    Repo.insert!(%Visit{path: conn.request_path})
    count = Repo.aggregate(Visit, :count)

    html(conn, """
    <!doctype html>
    <meta charset="utf-8">
    <title>Ana's visits</title>
    <body style="font-family: system-ui; text-align: center; margin-top: 20vh">
      <h1>#{count} visits</h1>
      <p>Counted by Phoenix, stored in Postgres.</p>
    </body>
    """)
  end

  def health(conn, _params), do: text(conn, "ok")
end
