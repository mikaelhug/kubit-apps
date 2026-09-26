defmodule Visits.Repo.Migrations.CreateVisits do
  use Ecto.Migration

  def change do
    create table(:visits) do
      add :path, :string
      timestamps(updated_at: false)
    end
  end
end
