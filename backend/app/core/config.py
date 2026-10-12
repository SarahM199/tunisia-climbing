from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str          # "I expect a database_url to exist"
    secret_key: str            # signs login tokens — must stay private

    # How long a login stays valid before the user has to log in again.
    # 60 * 24 * 7 = one week.
    access_token_expire_minutes: int = 60 * 24 * 7

    model_config = SettingsConfigDict(env_file=".env")  # "go read it from the .env file"
   
    # Supabase Storage — service key is backend-only, never expose it
    supabase_url: str
    supabase_service_key: str
    supabase_bucket: str = "comment-photos"     

    # Comma-separated list of frontend URLs allowed to call the API
    cors_origins: str = "http://localhost:5173"

settings = Settings()  # do it now, store the result here
