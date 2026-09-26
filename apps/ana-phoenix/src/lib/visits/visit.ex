defmodule Visits.Visit do
  use Ecto.Schema

  schema "visits" do
    field :path, :string
    timestamps(updated_at: false)
  end
end
