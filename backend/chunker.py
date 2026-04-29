from config import CHUNK_SIZE, CHUNK_OVERLAP


def chunk_text(text: str, source: str) -> list[dict]:
    """
    Split text into overlapping fixed-size chunks.

    Overlap ensures that sentences spanning a chunk boundary are
    still represented in at least one full chunk — without it you
    lose context at every boundary.
    """
    chunks = []
    start = 0
    chunk_id = 0

    while start < len(text):
        end = start + CHUNK_SIZE
        chunk_text = text[start:end].strip()

        if chunk_text:
            chunks.append({
                "text":     chunk_text,
                "source":   source,
                "chunk_id": chunk_id,
            })
            chunk_id += 1

        # Move forward by (CHUNK_SIZE - CHUNK_OVERLAP) so the next
        # chunk starts inside the tail of the current one
        start += CHUNK_SIZE - CHUNK_OVERLAP

    return chunks


if __name__ == "__main__":
    sample = "Hello world. " * 100
    result = chunk_text(sample, source="test.txt")
    print(f"Total chunks : {len(result)}")
    print(f"Chunk 0 size : {len(result[0]['text'])} chars")
    print(f"Chunk 1 start: {result[1]['text'][:60]!r}")
    print("\n--- Overlap check (chunks share ~50 chars to preserve boundary context) ---")
    print(f"End of chunk 0  : {result[0]['text'][-CHUNK_OVERLAP:]!r}")
    print(f"Start of chunk 1: {result[1]['text'][:CHUNK_OVERLAP]!r}")
