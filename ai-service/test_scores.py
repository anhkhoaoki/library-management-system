import asyncio
from app.api.routes.search import get_book_embeddings
from app.services.search_service import semantic_search

async def main():
    books = await get_book_embeddings()
    print('TOTAL EMBEDDINGS:', len(books))
    
    import sys
    sys.stdout.reconfigure(encoding='utf-8')
    
    res = await semantic_search('sách về lập trình python cho người mới bắt đầu', books)
    print('RESULTS > 0.3:', len(res))
    for r in res:
        print(f"{r['title']} : {r['score']}")
        
    print('ALL SCORES:')
    import numpy as np
    from app.services.search_service import cosine_similarity, get_embeddings
    embedder = get_embeddings()
    q_emb = embedder.encode('sách về lập trình python cho người mới bắt đầu').tolist()
    
    scored = []
    for b in books:
        score = cosine_similarity(q_emb, b['embedding'])
        scored.append((b['title'], score))
        
    scored.sort(key=lambda x: x[1], reverse=True)
    for title, score in scored[:10]:
        print(f"{title} : {score}")

asyncio.run(main())
