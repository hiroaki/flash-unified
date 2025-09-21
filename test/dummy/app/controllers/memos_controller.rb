class MemosController < ApplicationController
  before_action :set_memo, only: %i[ show edit update destroy ]

  # GET /memos
  def index
    @memos = Memo.all
  end

  # GET /memos/1
  def show
  end

  # GET /memos/new
  def new
    @memo = Memo.new
  end

  # GET /memos/1/edit
  def edit
  end

  # POST /memos
  def create
    @memo = Memo.new(memo_params)

    if @memo.save
      redirect_to @memo, notice: "Memo was successfully created."
    else
      render :new, status: :unprocessable_entity
    end
  end

  # PATCH/PUT /memos/1
  def update
    if @memo.update(memo_params)
      redirect_to @memo, notice: "Memo was successfully updated.", status: :see_other
    else
      render :edit, status: :unprocessable_entity
    end
  end

  # DELETE /memos/1
  def destroy
    @memo.destroy!
    redirect_to memos_path, notice: "Memo was successfully destroyed.", status: :see_other
  end

  private
    # Use callbacks to share common setup or constraints between actions.
    def set_memo
      @memo = Memo.find(params.expect(:id))
    end

    # Only allow a list of trusted parameters through.
    def memo_params
      params.expect(memo: [ :title, :description ])
    end
end
