from supabase import create_client, Client
from app.core.config import settings

supabase_client: Client = None
supabase_admin_client: Client = None


def init_supabase(url: str, key: str, service_key: str = None) -> tuple[Client, Client]:
    global supabase_client, supabase_admin_client
    supabase_client = create_client(url, key)
    if service_key:
        supabase_admin_client = create_client(url, service_key)
    else:
        supabase_admin_client = supabase_client
    return supabase_client, supabase_admin_client


def get_supabase() -> Client:
    if supabase_client is None:
        if settings.SUPABASE_URL and settings.SUPABASE_KEY:
            service_key = getattr(settings, 'SUPABASE_SERVICE_KEY', None)
            init_supabase(settings.SUPABASE_URL, settings.SUPABASE_KEY, service_key)
        else:
            raise RuntimeError("Supabase not initialized. Call init_supabase() first.")
    return supabase_client


def get_supabase_admin() -> Client:
    if supabase_admin_client is None:
        if supabase_client is None:
            get_supabase()
    return supabase_admin_client