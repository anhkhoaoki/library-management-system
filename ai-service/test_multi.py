import asyncio
from sentence_transformers import SentenceTransformer
import numpy as np

async def main():
    import sys
    sys.stdout.reconfigure(encoding='utf-8')
    
    print("Loading multilingual model...")
    embedder = SentenceTransformer("sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2")
    
    from app.api.routes.search import get_book_embeddings
    books = await get_book_embeddings()
    
    q_emb = embedder.encode('sách về lập trình python cho người mới bắt đầu').tolist()
    
    def cosine_similarity(vec_a, vec_b):
        a = np.array(vec_a)
        b = np.array(vec_b)
        if np.linalg.norm(a) == 0 or np.linalg.norm(b) == 0:
            return 0.0
        return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))
        
    scored = []
    for b in books:
        title = b.get('title') or ""
        desc = b.get('description') or ""
        authors = b.get('authorNames') or []
        text_to_embed = f"{title} {desc} {' '.join(authors)}"
        b_emb = embedder.encode(text_to_embed).tolist()
        
        score = cosine_similarity(q_emb, b_emb)
        scored.append((title, score))
        
    scored.sort(key=lambda x: x[1], reverse=True)
    for title, score in scored[:10]:
        print(f"{title} : {score}")

asyncio.run(main())
