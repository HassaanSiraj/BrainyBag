from qdrant_client import QdrantClient
from config import QDRANT_URL

_client: QdrantClient | None = None


def get_client() -> QdrantClient:
    """Return a singleton Qdrant client connected to the Docker container."""
    global _client
    if _client is None:
        _client = QdrantClient(url=QDRANT_URL)
    return _client
