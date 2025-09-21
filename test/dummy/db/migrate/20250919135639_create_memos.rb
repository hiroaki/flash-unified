class CreateMemos < ActiveRecord::Migration[8.0]
  def change
    create_table :memos do |t|
      t.string :title
      t.text :description

      t.timestamps
    end
  end
end
