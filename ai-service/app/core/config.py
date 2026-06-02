from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    GEMINI_API_KEY: str
    GOOGLE_BOOKS_API_KEY: str = ""
    INTERNAL_API_KEY: str = "internal-api-key"
    DATABASE_URL: str = ""  # Optional: for direct DB queries

    # LangChain / Gemini Model
    GEMINI_MODEL: str = "gemini-2.5-flash"
    EMBEDDING_MODEL: str = "models/text-embedding-004"

    # Cấu hình đọc file .env chuẩn Pydantic v2 (Bắt buộc sửa đoạn này)
    model_config = SettingsConfigDict(
        env_file=".env", 
        env_file_encoding="utf-8", 
        extra="ignore" # Bỏ qua nếu có biến dư thừa trong file .env
    )


settings = Settings()