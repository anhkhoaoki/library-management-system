from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    GEMINI_API_KEY: str
    GOOGLE_BOOKS_API_KEY: str = ""
    INTERNAL_API_KEY: str = "internal-api-key"
    DATABASE_URL: str = ""  # Optional: for direct DB queries

    # LangChain / Gemini Model
    GEMINI_MODEL: str = "gemini-1.5-flash"
    EMBEDDING_MODEL: str = "models/text-embedding-004"

    class Config:
        env_file = ".env"


settings = Settings()
