import sys
import os
import json
import argparse
import time
import math
import psycopg2
from urllib.parse import urlparse

# Fallback basic similarity & text processing tools
def compute_tf_vector(text):
    words = text.lower().replace(".", "").replace(",", "").split()
    freq = {}
    for w in words:
        if len(w) > 3:
            freq[w] = freq.get(w, 0) + 1
    return freq

def tf_cosine_similarity(vecA, vecB):
    all_words = set(vecA.keys()).union(set(vecB.keys()))
    dot = sum(vecA.get(w, 0) * vecB.get(w, 0) for w in all_words)
    normA = math.sqrt(sum(v*v for v in vecA.values()))
    normB = math.sqrt(sum(v*v for v in vecB.values()))
    if normA == 0 or normB == 0:
        return 0.0
    return dot / (normA * normB)

def chunk_text(text, chunk_size=512, overlap=128):
    words = text.split()
    chunks = []
    i = 0
    while i < len(words):
        chunk_words = words[i:i + chunk_size]
        chunks.append(" ".join(chunk_words))
        i += chunk_size - overlap
        if len(chunk_words) < chunk_size:
            break
    return chunks

# Parse Postgres connection string
db_url = os.getenv("DATABASE_URL")
if not db_url:
    # Read from local .env if available
    try:
        with open(os.path.join(os.path.dirname(__file__), "../.env"), "r") as f:
            for l in f:
                if l.startswith("DATABASE_URL="):
                    db_url = l.split("=", 1)[1].strip().strip('"')
    except Exception:
        pass

def get_db_connection():
    if not db_url:
        raise ValueError("DATABASE_URL is not set")
    cleaned_url = db_url
    if "pgbouncer=" in cleaned_url:
        if "?" in cleaned_url:
            parts = cleaned_url.split("?", 1)
            base = parts[0]
            params = parts[1].split("&")
            clean_params = [p for p in params if not p.startswith("pgbouncer")]
            if clean_params:
                cleaned_url = base + "?" + "&".join(clean_params)
            else:
                cleaned_url = base
    return psycopg2.connect(cleaned_url)

# Load machine learning models with fallbacks
print("[OracleCore] Initializing ML models...")
try:
    from sentence_transformers import SentenceTransformer
    model = SentenceTransformer('all-MiniLM-L6-v2')
    has_st = True
    print("[OracleCore] SentenceTransformer initialized.")
except Exception as e:
    has_st = False
    print(f"[OracleCore] SentenceTransformer load skipped/failed: {e}. Using TF-IDF fallback.")

try:
    import hdbscan
    has_hdbscan = True
    print("[OracleCore] HDBSCAN initialized.")
except Exception as e:
    has_hdbscan = False
    print(f"[OracleCore] HDBSCAN load skipped/failed: {e}. Using cosine threshold clustering fallback.")

try:
    from keybert import KeyBERT
    kw_model = KeyBERT()
    has_keybert = True
    print("[OracleCore] KeyBERT initialized.")
except Exception as e:
    has_keybert = False
    print(f"[OracleCore] KeyBERT load skipped/failed: {e}. Using TF keyword extraction fallback.")

try:
    from transformers import pipeline
    classifier = pipeline("text-classification", model="distilbert-base-uncased-finetuned-mnli")
    has_classifier = True
    print("[OracleCore] DistilBERT MNLI initialized.")
except Exception as e:
    has_classifier = False
    print(f"[OracleCore] DistilBERT load skipped/failed: {e}. Using keyword negation fallback.")

# Connect to ChromaDB
chromadb_url = os.getenv("CHROMADB_URL", "http://localhost:8000")
import chromadb
try:
    if "http" in chromadb_url:
        parsed_url = urlparse(chromadb_url)
        chroma_client = chromadb.HttpClient(host=parsed_url.hostname, port=parsed_url.port or 8000)
    else:
        chroma_client = chromadb.PersistentClient(path="./chroma_data")
    print(f"[OracleCore] Connected to ChromaDB at {chromadb_url}")
except Exception as e:
    chroma_client = None
    print(f"[OracleCore] Could not connect to ChromaDB: {e}. Using database fallback.")

def generate_embeddings(texts):
    if has_st:
        return model.encode(texts).tolist()
    # Dummy embedding fallback
    return [[0.0] * 384 for _ in texts]

def process_meeting(meeting_id):
    print(f"[OracleCore] Processing meeting: {meeting_id}")
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # 1. Fetch meeting
        cur.execute('SELECT title, transcript, department FROM "Meeting" WHERE id = %s', (meeting_id,))
        meeting = cur.fetchone()
        if not meeting:
            print(f"[OracleCore] Meeting {meeting_id} not found in DB.")
            return

        title, transcript, department = meeting
        if not transcript:
            print(f"[OracleCore] Meeting {meeting_id} has no transcript.")
            return

        # 2. Index transcript in ChromaDB
        chunks = chunk_text(transcript, 512, 128)
        if chroma_client:
            try:
                collection = chroma_client.get_or_create_collection("meeting_transcripts")
                documents = chunks
                ids = [f"{meeting_id}_{i}" for i in range(len(chunks))]
                metadatas = [{"meeting_id": meeting_id, "index": i} for i in range(len(chunks))]
                
                # If SentenceTransformer is available, use it for embeddings
                if has_st:
                    embeddings = generate_embeddings(documents)
                    collection.add(documents=documents, embeddings=embeddings, metadatas=metadatas, ids=ids)
                else:
                    collection.add(documents=documents, metadatas=metadatas, ids=ids)
                print(f"[OracleCore] Indexed {len(chunks)} chunks in ChromaDB")
            except Exception as ex:
                print(f"[OracleCore] ChromaDB indexing failed: {ex}")

        # 3. Fetch all decisions for clustering
        cur.execute('SELECT id, context, title, department FROM "Decision"')
        all_decisions = cur.fetchall()
        
        # 4. HDBSCAN Topic Clustering
        if len(all_decisions) >= 2:
            decision_texts = [f"{d[2]} {d[1]}" for d in all_decisions]
            cluster_assignments = []
            
            if has_st and has_hdbscan:
                try:
                    dec_embeddings = model.encode(decision_texts)
                    clusterer = hdbscan.HDBSCAN(min_cluster_size=2, metric='cosine', allow_single_cluster=True)
                    clusters = clusterer.fit_predict(dec_embeddings)
                    cluster_assignments = list(clusters)
                except Exception as ex:
                    print(f"[OracleCore] HDBSCAN failed: {ex}")
            
            # Fallback threshold cosine similarity clustering
            if not cluster_assignments:
                tf_vecs = [compute_tf_vector(t) for t in decision_texts]
                clusters = [-1] * len(all_decisions)
                current_cluster = 0
                for idx, tfA in enumerate(tf_vecs):
                    if clusters[idx] != -1:
                        continue
                    clusters[idx] = current_cluster
                    for target_idx in range(idx + 1, len(tf_vecs)):
                        if clusters[target_idx] == -1:
                            sim = tf_cosine_similarity(tfA, tf_vecs[target_idx])
                            if sim > 0.4:
                                clusters[target_idx] = current_cluster
                    current_cluster += 1
                cluster_assignments = clusters

            # Label clusters & save to DB
            unique_clusters = set(cluster_assignments)
            for c_id in unique_clusters:
                if c_id == -1:
                    continue
                
                # Fetch decs in this cluster
                cluster_decs = [all_decisions[i] for i, c in enumerate(cluster_assignments) if c == c_id]
                cluster_text = " ".join([f"{d[2]} {d[1]}" for d in cluster_decs])
                
                # Extract keywords
                keywords = []
                if has_keybert:
                    try:
                        kws = kw_model.extract_keywords(cluster_text, top_n=3)
                        keywords = [w[0] for w in kws]
                    except Exception:
                        pass
                if not keywords:
                    # Simple frequency extraction
                    tf = compute_tf_vector(cluster_text)
                    sorted_tf = sorted(tf.items(), key=lambda x: x[1], reverse=True)
                    keywords = [w[0] for w in sorted_tf[:3]]
                
                # Check if TopicCluster exists or create new
                cur.execute('INSERT INTO "TopicCluster" (id, keywords) VALUES (%s, %s) ON CONFLICT (id) DO UPDATE SET keywords = %s RETURNING id',
                            (f"cluster_{c_id}", keywords, keywords))
                db_cluster_id = cur.fetchone()[0]
                
                # Update Decisions with clusterId
                for dec in cluster_decs:
                    cur.execute('UPDATE "Decision" SET "clusterId" = %s WHERE id = %s', (db_cluster_id, dec[0]))
            
            print(f"[OracleCore] Re-clustered decisions into {len(unique_clusters)} topic clusters")

        # 5. Contradiction Detection
        # Compare decisions from the current meeting with all previous decisions
        cur.execute('SELECT id, context, title, department FROM "Decision" WHERE "meetingId" = %s', (meeting_id,))
        new_decisions = cur.fetchall()
        
        cur.execute('SELECT id, context, title, department FROM "Decision" WHERE "meetingId" != %s', (meeting_id,))
        past_decisions = cur.fetchall()

        for nd in new_decisions:
            nd_id, nd_context, nd_title, nd_dept = nd
            nd_full = f"{nd_title}. {nd_context}"
            for pd in past_decisions:
                pd_id, pd_context, pd_title, pd_dept = pd
                pd_full = f"{pd_title}. {pd_context}"
                
                is_contradiction = False
                confidence = 0.0

                if has_classifier:
                    try:
                        # DistilBERT MNLI classifier returns labels: CONTRADICTION, ENTAILMENT, NEUTRAL
                        res = classifier(f"{nd_full} {pd_full}")[0]
                        if res['label'].upper() == "CONTRADICTION" or res['label'].upper() == "LABEL_0":
                            is_contradiction = True
                            confidence = res['score']
                    except Exception:
                        pass

                # Fallback keyword checking: mismatching keywords under negative operators
                if not is_contradiction:
                    nd_vec = compute_tf_vector(nd_full)
                    pd_vec = compute_tf_vector(pd_full)
                    sim = tf_cosine_similarity(nd_vec, pd_vec)
                    # Check if highly similar text contains opposite statements like "use AWS" vs "use GCP"
                    if sim > 0.4:
                        mismatches = [w for w in nd_vec if w in pd_vec]
                        negations = ["not", "never", "no", "instead", "stop", "cancel", "replace", "aws", "gcp", "azure"]
                        has_neg = any(n in nd_full.lower() or n in pd_full.lower() for n in negations)
                        if has_neg:
                            is_contradiction = True
                            confidence = sim

                if is_contradiction and confidence > 0.6:
                    print(f"[OracleCore] Flagged Contradiction between new decision {nd_id} and past decision {pd_id} (conf: {confidence})")
                    cur.execute('INSERT INTO "Contradiction" (id, "decision1Id", "decision2Id", confidence) VALUES (%s, %s, %s, %s) ON CONFLICT DO NOTHING',
                                (f"contra_{nd_id}_{pd_id}", nd_id, pd_id, float(confidence)))

        # 6. Citation Mapping: Link summary bullet points to transcript chunks
        cur.execute('SELECT summary FROM "AIAgent" WHERE "meetingId" = %s', (meeting_id,))
        summary_row = cur.fetchone()
        if summary_row and summary_row[0]:
            summary_text = summary_row[0]
            bullets = [b.strip() for b in summary_text.split("\n") if b.strip().startswith("•") or b.strip().startswith("-")]
            
            for b_idx, bullet in enumerate(bullets):
                bullet_clean = bullet.lstrip("•- ")
                bullet_tf = compute_tf_vector(bullet_clean)
                
                best_chunk_idx = 0
                max_sim = 0.0
                
                for c_idx, chunk in enumerate(chunks):
                    chunk_tf = compute_tf_vector(chunk)
                    sim = tf_cosine_similarity(bullet_tf, chunk_tf)
                    if sim > max_sim:
                        max_sim = sim
                        best_chunk_idx = c_idx
                
                if max_sim > 0.15:
                    chunk_id = f"{meeting_id}_{best_chunk_idx}"
                    cur.execute('INSERT INTO "Citation" (id, "meetingId", "transcriptChunkId", confidence) VALUES (%s, %s, %s, %s) ON CONFLICT DO NOTHING',
                                (f"cite_{meeting_id}_{b_idx}", meeting_id, chunk_id, float(max_sim)))
            print(f"[OracleCore] Created citation trail mappings for AI Agent summary")

        conn.commit()
    except Exception as e:
        conn.rollback()
        print(f"[OracleCore] Error during processing: {e}")
        raise e
    finally:
        cur.close()
        conn.close()

def run_consumer():
    kafka_servers = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "kafka:9092")
    print(f"[OracleCore] Starting Kafka consumer on servers: {kafka_servers}")
    try:
        from kafka import KafkaConsumer
        consumer = KafkaConsumer(
            "meeting-transcripts",
            bootstrap_servers=[kafka_servers],
            value_deserializer=lambda m: json.loads(m.decode('utf-8')),
            auto_offset_reset='earliest',
            group_id='oracle-core-group'
        )
        print("[OracleCore] Successfully connected to Kafka. Listening for events...")
        for msg in consumer:
            payload = msg.value
            meeting_id = payload.get("meetingId")
            if meeting_id:
                try:
                    process_meeting(meeting_id)
                except Exception as err:
                    print(f"[OracleCore] Error processing event: {err}")
    except Exception as e:
        print(f"[OracleCore] Kafka consumer initialization failed: {e}. Exiting.")
        sys.exit(1)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Oracle Core Indexer and Classifier Pipeline")
    parser.add_argument("--meeting-id", type=str, help="Ingest and process a single meeting directly")
    parser.add_argument("--embed", type=str, help="Generate embeddings for a text string and print as JSON")
    args = parser.parse_args()

    if args.embed:
        # Standard stdout output for Next.js API query pipeline
        emb = generate_embeddings([args.embed])[0]
        # Check if dummy fallback
        if all(v == 0.0 for v in emb):
            # Generate TF-IDF dict as fallback
            tf = compute_tf_vector(args.embed)
            print(json.dumps({"fallback_tf": tf}))
        else:
            print(json.dumps(emb))
    elif args.meeting_id:
        process_meeting(args.meeting_id)
    else:
        run_consumer()
