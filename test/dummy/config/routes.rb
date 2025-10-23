Rails.application.routes.draw do
  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.
  get "up" => "rails/health#show", as: :rails_health_check

  resources :dummies, only: [:index] do
    collection do
      get :success
      get :failure
    end
  end

  scope :flash do
    get  'basic',            to: 'flash_pages#basic'
    get  'custom',           to: 'flash_pages#custom'
    get  'custom_renderer',  to: 'flash_pages#custom_renderer'
    get  'stream',           to: 'flash_pages#stream'
    post 'stream_update',    to: 'flash_pages#stream_update'
    get  'events',           to: 'flash_pages#events'
    get  'missing_template', to: 'flash_pages#missing_template'
    get  'auto_off',         to: 'flash_pages#auto_off'
    get  'events_with_message', to: 'flash_pages#events_with_message'
    get  'clear',            to: 'flash_pages#clear'
    get  'render_consume',   to: 'flash_pages#render_consume'
  end

  # Defines the root path route ("/")
  root to: "home#index"
end
